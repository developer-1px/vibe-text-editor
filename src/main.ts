import { iter } from './Iterator'
import { calculateVerticalOverlapRatio, debugRect, findBestPosition } from './DOMRect'

export const isTextNode = (node: Node | null): node is Text => node?.nodeType === Node.TEXT_NODE
export const isElementNode = (node: Node | null): node is Element => node?.nodeType === Node.ELEMENT_NODE

const acceptNode = (node: Node): number => {
  if (isTextNode(node) || isAtomicComponent(node)) {
    return NodeFilter.FILTER_ACCEPT
  }
  return NodeFilter.FILTER_SKIP
}

const setRangeBoundary = (range: Range, container: Node, offset: number, boundaryType: 'start' | 'end') => {
  const set = boundaryType === 'start' ? range.setStart.bind(range) : range.setEnd.bind(range)

  if (isElementNode(container) && isAtomicComponent(container)) {
    const parent = container.parentNode
    if (parent) {
      const index = Array.from(parent.childNodes).indexOf(container as ChildNode)
      set(parent, offset === 0 ? index : index + 1)
    }
  } else {
    set(container, offset)
  }
}

interface Position {
  node: Node
  offset: number
}

export function* forwardTreeWalker(root: Node, startNode: Node): Generator<Node> {
  let node: Node | null = startNode

  while (node) {
    if (acceptNode(node) === NodeFilter.FILTER_ACCEPT) {
      yield node
    }

    // Move to the next node in depth-first order
    if (!isAtomicComponent(node) && node.firstChild) {
      node = node.firstChild
    } else {
      let tempNode: Node | null = node
      while (tempNode) {
        if (tempNode === root) {
          node = null
          break
        }
        if (tempNode.nextSibling) {
          node = tempNode.nextSibling
          break
        }
        tempNode = tempNode.parentNode
      }
      if (tempNode === root) {
        node = null
      }
    }
  }
}

function* backwardTreeWalker(root: Node, startNode: Node): Generator<Node> {
  let node: Node | null = startNode

  while (node) {
    if (acceptNode(node) === NodeFilter.FILTER_ACCEPT) {
      yield node
    }

    if (node === root) {
      break
    }

    if (node.previousSibling) {
      node = node.previousSibling
      while (!isAtomicComponent(node) && node.lastChild) {
        node = node.lastChild
      }
    } else {
      node = node.parentNode
      if (node === root) {
        break
      }
    }
  }
}

class EditorTreeWalker {
  root: Node
  currentNode: Node

  constructor(root: Node, currentNode?: Node) {
    this.root = root
    this.currentNode = currentNode || root
  }

  private getNextNode(node: Node | null, direction: 'forward' | 'backward'): Node | null {
    if (!node) return null

    if (direction === 'forward') {
      if (!isAtomicComponent(node) && node.firstChild) {
        return node.firstChild
      }
      if (node.nextSibling) {
        return node.nextSibling
      }
      let temp: Node | null = node
      while (temp) {
        if (temp === this.root) return null
        if (temp.nextSibling) return temp.nextSibling
        temp = temp.parentNode
      }
      return null
    } else {
      if (node === this.root) return null
      if (node.previousSibling) {
        let current = node.previousSibling
        while (!isAtomicComponent(current) && current.lastChild) {
          current = current.lastChild
        }
        return current
      }
      const parent = node.parentNode
      if (parent === this.root) return null
      return parent
    }
  }

  private *traverse(direction: 'forward' | 'backward'): Generator<Node> {
    let node: Node | null = this.currentNode

    while (node) {
      if (acceptNode(node) === NodeFilter.FILTER_ACCEPT) {
        this.currentNode = node
        yield node
      }
      node = this.getNextNode(node, direction)
    }
  }

  *forward(): Generator<Node> {
    yield* this.traverse('forward')
  }

  *backward(): Generator<Node> {
    yield* this.traverse('backward')
  }
}

function normalizePosition(editor: Editor, node: Node, offset: number): Position {
  if (isTextNode(node)) {
    let current_node = node
    let current_offset = offset

    while (true) {
      if (current_offset < 0) {
        const walker = editor.createTreeWalker()
        walker.currentNode = current_node
        const backwardIter = walker.backward()
        // 현재 노드를 건너뛰고 실제 이전 노드를 얻는다.
        backwardIter.next()
        const prevIterResult = backwardIter.next()
        const previousNode = prevIterResult.done ? null : (prevIterResult.value as Node)

        if (!previousNode) {
          return { node: current_node, offset: 0 }
        }

        if (isTextNode(previousNode)) {
          current_node = previousNode
          current_offset += getAfterOffset(current_node)
        } else {
          // Atomic component
          return { node: previousNode, offset: 1 }
        }
      } else if (current_offset > getAfterOffset(current_node)) {
        const walker = editor.createTreeWalker()
        walker.currentNode = current_node
        const forwardIter = walker.forward()
        // 현재 노드를 건너뛰고 실제 다음 노드를 얻는다.
        forwardIter.next()
        const nextIterResult = forwardIter.next()
        const nextNode = nextIterResult.done ? null : (nextIterResult.value as Node)

        if (!nextNode) {
          return { node: current_node, offset: getAfterOffset(current_node) }
        }

        if (isTextNode(nextNode)) {
          current_offset -= getAfterOffset(current_node)
          current_node = nextNode
        } else {
          // Atomic component
          return { node: nextNode, offset: 0 }
        }
      } else {
        return { node: current_node, offset: current_offset }
      }
    }
  } else if (isElementNode(node)) {
    if (isAtomicComponent(node)) {
      if (offset < 0.5) {
        return { node, offset: 0 }
      } else {
        return { node, offset: 1 }
      }
    } else {
      // TODO: Handle non-atomic elements
      return { node, offset }
    }
  }

  return { node, offset }
}

const getAfterOffset = (node: Node) => (isElementNode(node) ? 1 : node.textContent?.length || 0)

class EditorRange {
  editor: Editor

  private _range: Range | null = null
  private _startContainer: Node | null = null
  private _startOffset: number = 0
  private _endContainer: Node | null = null
  private _endOffset: number = 0

  get startContainer() {
    return this._startContainer
  }

  get startOffset() {
    return this._startOffset
  }

  get endContainer() {
    return this._endContainer
  }

  get endOffset() {
    return this._endOffset
  }

  get isCollapsed() {
    return this._startContainer === this._endContainer && this._startOffset === this._endOffset
  }

  constructor(editor: Editor) {
    this.editor = editor
  }

  private setBoundary(node: Node, offset: number, boundaryType: 'start' | 'end') {
    const position = normalizePosition(this.editor, node, offset)
    if (boundaryType === 'start') {
      this._startContainer = position.node
      this._startOffset = position.offset

      if (!this._endContainer) {
        this._endContainer = position.node
        this._endOffset = position.offset
      }
    } else {
      this._endContainer = position.node
      this._endOffset = position.offset

      if (!this._startContainer) {
        this._startContainer = position.node
        this._startOffset = position.offset
      }
    }

    this._range = null
  }

  private setBoundaryRelative(node: Node, boundaryType: 'start' | 'end', position: 'before' | 'after') {
    const offset = position === 'before' ? 0 : getAfterOffset(node)
    this.setBoundary(node, offset, boundaryType)
  }

  setStart(node: Node, offset: number) {
    this.setBoundary(node, offset, 'start')
  }

  setEnd(node: Node, offset: number) {
    this.setBoundary(node, offset, 'end')
  }

  setStartAfter(node: Node) {
    this.setBoundaryRelative(node, 'start', 'after')
  }

  setStartBefore(node: Node) {
    this.setBoundaryRelative(node, 'start', 'before')
  }

  setEndAfter(node: Node) {
    this.setBoundaryRelative(node, 'end', 'after')
  }

  setEndBefore(node: Node) {
    this.setBoundaryRelative(node, 'end', 'before')
  }

  collapse(toStart: boolean) {
    if (toStart) {
      if (this.startContainer) {
        this.setEnd(this.startContainer, this.startOffset)
      }
    } else {
      if (this.endContainer) {
        this.setStart(this.endContainer, this.endOffset)
      }
    }
  }

  //
  selectNode(node: Node) {
    this.setStartBefore(node)
    this.setEndAfter(node)
  }

  toRange() {
    if (this._range) {
      return this._range
    }

    const range = document.createRange()

    if (this._startContainer && this._endContainer) {
      setRangeBoundary(range, this._startContainer, this._startOffset, 'start')
      setRangeBoundary(range, this._endContainer, this._endOffset, 'end')
    }

    this._range = range
    return range
  }

  getClientRects(reversed: boolean = false) {
    if (this._startContainer && this._endContainer && this._startContainer === this._endContainer && isElementNode(this._startContainer)) {
      const rect = this._startContainer.getBoundingClientRect()
      const minHeight = 20
      const actualHeight = Math.max(rect.height, minHeight)
      const topAdjustment = (actualHeight - rect.height) / 2

      if (this._startOffset === 0) {
        return [new DOMRect(rect.left, rect.top - topAdjustment, 0, actualHeight)]
      } else {
        return [new DOMRect(rect.right, rect.top - topAdjustment, 0, actualHeight)]
      }
    }

    const rects = Array.from(this.toRange().getClientRects())
    if (reversed) {
      return rects.reverse()
    }

    // debugRect(rects)
    return rects
  }
}

class EditorSelection {
  editor: Editor
  anchor: Position | null = null
  focus: Position | null = null
  goalX: number | null = null

  constructor(editor: Editor) {
    this.editor = editor
  }

  get isCollapsed() {
    return this.anchor && this.focus && this.anchor.node === this.focus.node && this.anchor.offset === this.focus.offset
  }

  get range(): EditorRange {
    const range = this.editor.createRange()
    if (!this.anchor || !this.focus) {
      return range
    }

    const { anchor: anchorPosition, focus: focusPosition } = this

    const pos = anchorPosition.node.compareDocumentPosition(focusPosition.node)
    const isFocusBeforeAnchor =
      pos & Node.DOCUMENT_POSITION_FOLLOWING
        ? false
        : pos & Node.DOCUMENT_POSITION_PRECEDING
        ? true
        : focusPosition.offset < anchorPosition.offset

    if (isFocusBeforeAnchor) {
      range.setStart(focusPosition.node, focusPosition.offset)
      range.setEnd(anchorPosition.node, anchorPosition.offset)
    } else {
      range.setStart(anchorPosition.node, anchorPosition.offset)
      range.setEnd(focusPosition.node, focusPosition.offset)
    }

    return range
  }

  setRange(range: EditorRange) {
    if (range.startContainer) {
      this.anchor = { node: range.startContainer, offset: range.startOffset }
      this.focus = { node: range.endContainer || range.startContainer, offset: range.endOffset }
    } else {
      this.anchor = null
      this.focus = null
    }
  }

  collapseToStart() {
    const range = this.range
    if (range.startContainer) {
      this.focus = { node: range.startContainer, offset: range.startOffset }
      this.anchor = this.focus
    }
  }

  collapseToEnd() {
    const range = this.range
    if (range.endContainer) {
      this.focus = { node: range.endContainer, offset: range.endOffset }
      this.anchor = this.focus
    }
  }

  collapse(offsetNode: Node, offset: number) {
    const position = normalizePosition(this.editor, offsetNode, offset)
    this.focus = { node: position.node, offset: position.offset }
    this.anchor = this.focus
  }

  extend(node: Node, offset: number) {
    const focus = normalizePosition(this.editor, node, offset)
    this.setBaseAndExtent(this.anchor!.node, this.anchor!.offset, focus.node, focus.offset)
  }

  setBaseAndExtent(anchorNode: Node, anchorOffset: number, focusNode: Node, focusOffset: number) {
    const anchor = normalizePosition(this.editor, anchorNode, anchorOffset)
    const focus = normalizePosition(this.editor, focusNode, focusOffset)

    this.anchor = { node: anchor.node, offset: anchor.offset }
    this.focus = { node: focus.node, offset: focus.offset }
  }

  private calculateNewPosition(
    direction: 'forward' | 'backward',
    granularity: 'character' | 'word' | 'line' | 'paragraph' | 'sentence' | 'lineboundary',
  ): Position | null {
    if (!this.focus) return null

    if (granularity === 'character') {
      const { node, offset } = this.focus

      if (isAtomicComponent(node)) {
        if (direction === 'forward') {
          if (offset === 0) {
            return { node, offset: 1 }
          }
        } else {
          // backward
          if (offset === 1) {
            return { node, offset: 0 }
          }
        }

        const walker = this.editor.createTreeWalker()
        walker.currentNode = node

        if (direction === 'forward') {
          const iter = walker.forward()
          iter.next() // skip self
          const result = iter.next()
          if (result.done) {
            return { node, offset: 1 } // End of document, stay at the end of current atomic component
          }
          return { node: result.value, offset: 0 }
        } else {
          // backward
          const iter = walker.backward()
          iter.next() // skip self
          const result = iter.next()
          if (result.done) {
            return { node, offset: 0 } // Start of document, stay at the beginning of current atomic component
          }
          const prevNode = result.value
          return { node: prevNode, offset: getAfterOffset(prevNode) }
        }
      }

      const directionValue = direction === 'forward' ? 1 : -1
      return { node, offset: offset + directionValue }
    }

    if (granularity === 'lineboundary' && isAtomicComponent(this.focus.node)) {
      if (direction === 'forward' && this.focus.offset === 0) {
        return { node: this.focus.node, offset: 1 }
      }
      if (direction === 'backward' && this.focus.offset === 1) {
        return { node: this.focus.node, offset: 0 }
      }
    }

    const rectWalker = this.editor.createRangeRectWalker()

    if (granularity === 'lineboundary') {
      const linePositions = iter(rectWalker.walk(this.focus.node, this.focus.offset, direction))
        .takeWhile((pos) => pos.lineOffset === 0)
        .toArray()

      debugRect(linePositions.map((pos) => pos.rect))
      if (linePositions.length === 0) return null

      const targetPos = linePositions[linePositions.length - 1]
      if (!targetPos) return null

      const targetRect = targetPos.rect
      const goalX = direction === 'forward' ? targetRect.right - 1 : targetRect.left
      const y = targetRect.top + targetRect.height / 2

      return this.editor.getPositionFromPoint(goalX, y)
    }

    if (granularity === 'line') {
      const cursorRects = this.range.getClientRects()
      if (cursorRects.length === 0 && this.goalX === null) return null

      if (this.goalX === null) {
        this.goalX = cursorRects[0].left
      }

      const targetLinePositions = iter(rectWalker.walk(this.focus.node, this.focus.offset, direction))
        .skipWhile((pos) => pos.lineOffset === 0)
        .takeWhile((pos) => Math.abs(pos.lineOffset) === 1)
        .toArray()

      if (targetLinePositions.length === 0) return null

      const bestPos = findBestPosition(targetLinePositions, this.goalX!)
      if (!bestPos) return null

      const targetRect = bestPos.rect
      const y = targetRect.top + targetRect.height / 2

      return this.editor.getPositionFromPoint(this.goalX, y)
    }

    return null
  }

  modify(
    type: 'move' | 'extend',
    direction: 'forward' | 'backward',
    granularity: 'character' | 'word' | 'line' | 'paragraph' | 'sentence' | 'lineboundary',
  ) {
    if (!this.focus) return

    if (granularity !== 'line') {
      this.goalX = null
    }

    let newFocusPosition = this.calculateNewPosition(direction, granularity)
    if (!newFocusPosition) return

    if (type === 'move') {
      this.collapse(newFocusPosition.node, newFocusPosition.offset)
    } else {
      this.extend(newFocusPosition.node, newFocusPosition.offset)
    }

    if (granularity === 'character' && this.focus.node.nodeName === 'BR') {
      this.modify('move', direction, 'character')
      return
    }
  }
}

// ------------------------------------------------------------
// Atomic Component Utilities
// ------------------------------------------------------------

export const isAtomicComponent = (node: Node) => {
  if (isElementNode(node)) {
    if (node.tagName === 'BR' || node.tagName === 'HR' || node.tagName === 'IMG' || node.tagName === 'TABLE') {
      return true
    }

    if ((node as HTMLElement).classList.contains('atomic-component')) {
      return true
    }

    return false
  }

  return false
}

const findAncestorAtomic = (node: Node, root: Node): Element | null => {
  let current: Node | null = node
  while (current && current !== root) {
    if (isAtomicComponent(current)) return current as Element
    current = current.parentNode
  }
  return null
}

class EditorRangeRectWalker {
  editor: Editor

  constructor(editor: Editor) {
    this.editor = editor
  }

  /**
   * 지정된 방향으로 Rect를 순회하며, 각 Rect에 대한 상대적 줄 번호를 함께 반환합니다.
   * @param startNode 순회를 시작할 노드
   * @param startOffset 시작 노드 내의 오프셋
   * @param direction 순회 방향 ('forward' 또는 'backward')
   */
  *walk(
    startNode: Node,
    startOffset: number = 0,
    direction: 'forward' | 'backward',
  ): Generator<{ node: Node; rect: DOMRect; lineOffset: number }> {
    let lineOffset = 0
    let lineAnchorRect: DOMRect | null = null
    const lineOffsetIncrement = direction === 'forward' ? 1 : -1

    const processNode = function* (node: Node, rects: DOMRect[]): Generator<{ node: Node; rect: DOMRect; lineOffset: number }> {
      for (const rect of rects) {
        if (!lineAnchorRect) {
          lineAnchorRect = rect
        } else if (calculateVerticalOverlapRatio(lineAnchorRect, rect) < 0.5) {
          if (direction === 'forward' && lineAnchorRect.bottom > rect.bottom) {
            continue
          } else if (direction === 'backward' && lineAnchorRect.top < rect.top) {
            continue
          }
          lineOffset += lineOffsetIncrement
          lineAnchorRect = rect
        }

        yield { node, rect, lineOffset }
      }
    }

    const iteratorWalker = this.editor.createTreeWalker()
    iteratorWalker.currentNode = startNode
    const iterator = direction === 'forward' ? iteratorWalker.forward() : iteratorWalker.backward()

    const range = this.editor.createRange()

    // Handle startNode with offset
    const firstNode = iterator.next().value
    const reversed = direction === 'backward'

    if (firstNode) {
      if (direction === 'forward') {
        range.setStart(firstNode, startOffset)
        yield* processNode(firstNode, range.getClientRects())
        range.setEndAfter(firstNode)
      } else {
        range.setEnd(firstNode, startOffset)
        yield* processNode(firstNode, range.getClientRects(reversed))
        range.setStartBefore(firstNode)
      }
      yield* processNode(firstNode, range.getClientRects(reversed))
    }

    for (const nextNode of iterator) {
      range.selectNode(nextNode)
      const rects = Array.from(range.getClientRects(direction === 'backward'))
      yield* processNode(nextNode, rects)
    }
  }
}

export class Editor {
  document: HTMLElement
  #selection: EditorSelection | null = null
  view: EditorView

  constructor(doc: HTMLElement) {
    this.document = doc

    // Remove extra spaces from text nodes
    const walker = document.createTreeWalker(this.document, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const textNode = node as Text
        const nodeValue = (textNode.nodeValue || '').replace(/\s+/g, ' ')
        if (nodeValue.trim() === '') {
          textNode.nodeValue = ''
          return NodeFilter.FILTER_REJECT
        }

        if (!textNode.previousSibling && !textNode.nextSibling) {
          textNode.nodeValue = nodeValue.trim()
        } else if (!textNode.previousSibling) {
          textNode.nodeValue = nodeValue.trimStart()
        } else if (!textNode.nextSibling) {
          textNode.nodeValue = nodeValue.trimEnd()
        }

        return NodeFilter.FILTER_ACCEPT
      },
    })
    while (walker.nextNode());
    this.document.normalize()

    this.view = new EditorView(this)
  }

  createTreeWalker() {
    return new EditorTreeWalker(this.document)
  }

  createRangeRectWalker() {
    return new EditorRangeRectWalker(this)
  }

  createRange() {
    return new EditorRange(this)
  }

  getSelection() {
    if (this.#selection) {
      return this.#selection
    }

    this.#selection = new EditorSelection(this)
    return this.#selection
  }

  render() {
    this.view.render()
  }

  getPositionFromPoint(x: number, y: number): Position | null {
    const position = this.document.ownerDocument.caretPositionFromPoint(x, y)
    console.log('@@@0', position, x)
    if (!position) return null

    const atomicAncestor = findAncestorAtomic(position.offsetNode, this.document)
    if (atomicAncestor) {
      const rect = atomicAncestor.getBoundingClientRect()
      return { node: atomicAncestor, offset: x < rect.left + rect.width / 2 ? 0 : 1 }
    }

    if (isElementNode(position.offsetNode)) {
      const childNode = position.offsetNode.childNodes[position.offset]

      // Not atomic. Find first leaf.
      const leafWalker = this.createTreeWalker()
      leafWalker.currentNode = childNode
      const leaf = leafWalker.forward().next().value || childNode // Fallback to childNode itself

      if (isAtomicComponent(leaf)) {
        const rect = (leaf as Element).getBoundingClientRect()
        return { node: leaf, offset: x < rect.left + rect.width / 2 ? 0 : 1 }
      }

      const precisePosition = this.document.ownerDocument.caretPositionFromPoint(x, y)
      if (precisePosition) {
        return { node: precisePosition.offsetNode, offset: precisePosition.offset }
      }

      // Fallback to the beginning of the leaf if the precise call fails.
      return { node: leaf, offset: 0 }
    }

    return { node: position.offsetNode, offset: position.offset }
  }

  deleteSelection() {
    const selection = this.getSelection()
    const range = selection.range

    if (range.startContainer) {
      const nativeRange = range.toRange()
      nativeRange.deleteContents()
      selection.collapseToStart()
      // selection.collapse(nativeRange.startContainer, nativeRange.startOffset)
    }
  }
}

class EditorView {
  editor: Editor
  document: HTMLElement
  #cursorElement: HTMLDivElement
  #selectionElements: HTMLDivElement[] = []
  #baseStyle = {
    position: 'absolute',
    pointerEvents: 'none',
  }
  #selectionStyle = {
    ...this.#baseStyle,
    backgroundColor: 'rgba(0, 0, 255, 0.2)',
    outline: '1px solid red',
  }
  #cursorStyle = {
    ...this.#baseStyle,
    width: '2px',
    backgroundColor: 'blue',
    display: 'none',
  }

  constructor(editor: Editor) {
    this.editor = editor
    this.document = editor.document
    this.#cursorElement = document.createElement('div')
    Object.assign(this.#cursorElement.style, this.#cursorStyle)
    this.document.style.position = 'relative'
    this.document.appendChild(this.#cursorElement)
  }

  private createSelectionElement(rect: DOMRect, editorRect: DOMRect): HTMLDivElement {
    const selectionDiv = document.createElement('div')
    Object.assign(selectionDiv.style, this.#selectionStyle, {
      top: rect.top - editorRect.top + 'px',
      left: rect.left - editorRect.left + 'px',
      height: rect.height + 'px',
      width: rect.width + 'px',
    })
    this.document.appendChild(selectionDiv)
    this.#selectionElements.push(selectionDiv)
    return selectionDiv
  }

  private updateCursorPosition(rect: DOMRect, editorRect: DOMRect) {
    Object.assign(this.#cursorElement.style, {
      top: rect.top - editorRect.top + 'px',
      left: rect.left - editorRect.left + 'px',
      height: rect.height + 'px',
      display: 'block',
    })
  }

  render() {
    this.#selectionElements.forEach((el) => el.remove())
    this.#selectionElements = []
    this.#cursorElement.style.display = 'none'

    const selection = this.editor.getSelection()
    const range = selection.range
    if (!range) return

    const rects = range.getClientRects()
    const editorRect = this.document.getBoundingClientRect()

    if (rects.length > 0) {
      if (range.isCollapsed) {
        this.updateCursorPosition(rects[0], editorRect)
      } else {
        rects.forEach((rect) => this.createSelectionElement(rect, editorRect))
      }
    }
  }
}

type KeyBindingCommand = (selection: EditorSelection, event: KeyboardEvent) => void

export const keyBindings: Record<string, KeyBindingCommand> = {
  'Meta+ArrowRight': (selection) => {
    selection.modify('move', 'forward', 'lineboundary')
  },
  'Meta+Shift+ArrowRight': (selection) => {
    selection.modify('extend', 'forward', 'lineboundary')
  },
  'Meta+ArrowLeft': (selection) => {
    selection.modify('move', 'backward', 'lineboundary')
  },
  'Meta+Shift+ArrowLeft': (selection) => {
    selection.modify('extend', 'backward', 'lineboundary')
  },
  'ArrowDown': (selection) => {
    selection.modify('move', 'forward', 'line')
  },
  'Shift+ArrowDown': (selection) => {
    selection.modify('extend', 'forward', 'line')
  },
  'ArrowUp': (selection) => {
    selection.modify('move', 'backward', 'line')
  },
  'Shift+ArrowUp': (selection) => {
    selection.modify('extend', 'backward', 'line')
  },
  'ArrowRight': (selection) => {
    if (!selection.isCollapsed) {
      return selection.collapseToEnd()
    }
    selection.modify('move', 'forward', 'character')
    console.log('@@@', selection)
  },
  'Shift+ArrowRight': (selection) => {
    selection.modify('extend', 'forward', 'character')
  },
  'ArrowLeft': (selection) => {
    if (!selection.isCollapsed) {
      return selection.collapseToStart()
    }
    selection.modify('move', 'backward', 'character')
  },
  'Shift+ArrowLeft': (selection) => {
    selection.modify('extend', 'backward', 'character')
  },
  'Backspace': (selection) => {
    if (selection.isCollapsed) {
      selection.modify('extend', 'backward', 'character')
    }
    selection.editor.deleteSelection()
  },
  'Delete': (selection) => {
    if (selection.isCollapsed) {
      selection.modify('extend', 'forward', 'character')
    }
    selection.editor.deleteSelection()
  },
}

export function getKeyBindingString(e: KeyboardEvent): string | null {
  const parts: string[] = []

  // 일관된 순서로 수식어를 추가합니다.
  if (e.metaKey) parts.push('Meta')
  if (e.ctrlKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')

  const key = e.key

  // 수식어만 눌린 경우는 바인딩을 생성하지 않습니다.
  if (['Meta', 'Control', 'Alt', 'Shift', 'CapsLock', 'NumLock', 'ScrollLock'].includes(key)) {
    return null
  }

  parts.push(key)

  return parts.join('+')
}

export function main() {
  const editor = new Editor(document.querySelector('#app')!)
  const view = new EditorView(editor)
  const mainWalker = editor.createTreeWalker()
  const firstNode = forwardTreeWalker(mainWalker.root, mainWalker.root).next().value

  if (!firstNode) return

  const range = editor.createRange()
  range.setStart(firstNode, 0)
  const selection = editor.getSelection()
  selection.setRange(range)
  view.render()

  for (let i = 0; i < 10; i++) {
    selection.modify('move', 'forward', 'lineboundary')
    view.render()
  }

  document.onkeydown = (e) => {
    const keyString = getKeyBindingString(e)
    if (!keyString) return

    const command = keyBindings[keyString]
    if (command) {
      e.preventDefault()
      const selection = editor.getSelection()
      command(selection, e)
      view.render()
    }
  }

  document.onmousedown = (e) => {
    e.preventDefault()
    const { clientX, clientY } = e

    const caretPosition = editor.getPositionFromPoint(clientX, clientY)

    if (!caretPosition) return

    const range = editor.createRange()
    const selection = editor.getSelection()
    range.setStart(caretPosition.node, caretPosition.offset)
    selection.setRange(range)
    view.render()
  }
}
