import { iter } from './Iterator'
import { calculateVerticalOverlapRatio, debugRect, findBestPosition } from './DOMRect'
import { normalizeDocument } from './normalizeDocument'
import { normalizePosition } from './normalizePosition'

export const isTextNode = (node: Node | null): node is Text => node?.nodeType === Node.TEXT_NODE
export const isElementNode = (node: Node | null): node is Element => node?.nodeType === Node.ELEMENT_NODE

export const getAfterOffset = (node: Node): number => (isTextNode(node) ? node.textContent?.length || 0 : 1)

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

export class Position {
  constructor(public editor: Editor, public node: Node, public offset: number) {}

  clone(node: Node, offset: number = 0) {
    return new Position(this.editor, node, offset)
  }

  nextCharacter(offset: number = 1) {
    return normalizePosition(this.editor, this.node, this.offset + offset)
  }
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
  ): Generator<{ node: Node; rect: DOMRect; lineOffset: number; lineBoundary: boolean }> {
    let lineOffset = 0
    let lineAnchorRect: DOMRect | null = null
    let lineBoundary = true
    const lineOffsetIncrement = direction === 'forward' ? 1 : -1

    const processNode = function* (node: Node, rects: DOMRect[]) {
      for (const rect of rects) {
        if (!lineAnchorRect) {
          lineAnchorRect = rect
        } else if (calculateVerticalOverlapRatio(lineAnchorRect, rect) < 0.5) {
          lineBoundary = false
          if (direction === 'forward' && lineAnchorRect.bottom > rect.bottom) {
            continue
          } else if (direction === 'backward' && lineAnchorRect.top < rect.top) {
            continue
          }
          lineOffset += lineOffsetIncrement
          lineAnchorRect = rect
        }

        yield { node, rect, lineOffset, lineBoundary }
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
      console.log('firstNode', firstNode, direction)

      if (direction === 'forward') {
        range.setStart(firstNode, startOffset)
        yield* processNode(firstNode, range.getClientRects().slice(0, 1))
        range.setEndAfter(firstNode)
      } else {
        range.setEnd(firstNode, startOffset)
        yield* processNode(firstNode, range.getClientRects().slice(0, 1))
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

//
// EditorRange
//
class EditorRange {
  editor: Editor

  private _range: Range | null = null
  private _start: Position | null = null
  private _end: Position | null = null

  get startContainer() {
    return this._start?.node || null
  }

  get startOffset() {
    return this._start?.offset || 0
  }

  get endContainer() {
    return this._end?.node || null
  }

  get endOffset() {
    return this._end?.offset || 0
  }

  get start() {
    return this._start
  }

  get end() {
    return this._end
  }

  get isCollapsed() {
    return this._start?.node === this._end?.node && this._start?.offset === this._end?.offset
  }

  constructor(editor: Editor) {
    this.editor = editor
  }

  private setBoundary(node: Node, offset: number, boundaryType: 'start' | 'end') {
    const position = normalizePosition(this.editor, node, offset)
    if (boundaryType === 'start') {
      this._start = position

      if (!this._end) {
        this._end = position
      }
    } else {
      this._end = position

      if (!this._start) {
        this._start = position
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
      if (this._start) {
        this._end = this._start
      }
    } else {
      if (this._end) {
        this._start = this._end
      }
    }
    this._range = null
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

    if (this._start && this._end) {
      setRangeBoundary(range, this._start.node, this._start.offset, 'start')
      setRangeBoundary(range, this._end.node, this._end.offset, 'end')
    }

    this._range = range
    return range
  }

  getClientRects(reversed: boolean = false) {
    if (this._start && this._end && this._start.node === this._end.node && isElementNode(this._start.node)) {
      const rect = this._start.node.getBoundingClientRect()
      const minHeight = 20
      const actualHeight = Math.max(rect.height, minHeight)
      const topAdjustment = (actualHeight - rect.height) / 2

      if (this._start.offset === 0) {
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

  getBoundingClientRect() {
    return this.toRange().getBoundingClientRect()
  }

  //
  deleteContents(): Position {
    const range = this.toRange()
    range.deleteContents()
    return this.editor.createPosition(range.startContainer, range.startOffset)
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
      this.anchor = this.editor.createPosition(range.startContainer, range.startOffset)
      this.focus = this.editor.createPosition(range.endContainer || range.startContainer, range.endOffset)
    } else {
      this.anchor = null
      this.focus = null
    }
  }

  collapseToStart() {
    const range = this.range
    if (range.startContainer) {
      this.focus = this.editor.createPosition(range.startContainer, range.startOffset)
      this.anchor = this.focus
    }
  }

  collapseToEnd() {
    const range = this.range
    if (range.endContainer) {
      this.focus = this.editor.createPosition(range.endContainer, range.endOffset)
      this.anchor = this.focus
    }
  }

  collapse(offsetNode: Node, offset: number) {
    const position = normalizePosition(this.editor, offsetNode, offset)
    this.focus = this.editor.createPosition(position.node, position.offset)
    this.anchor = this.focus
  }

  extend(node: Node, offset: number) {
    const focus = normalizePosition(this.editor, node, offset)
    this.setBaseAndExtent(this.anchor!.node, this.anchor!.offset, focus.node, focus.offset)
  }

  setBaseAndExtent(anchorNode: Node, anchorOffset: number, focusNode: Node, focusOffset: number) {
    const anchor = normalizePosition(this.editor, anchorNode, anchorOffset)
    const focus = normalizePosition(this.editor, focusNode, focusOffset)

    this.anchor = this.editor.createPosition(anchor.node, anchor.offset)
    this.focus = this.editor.createPosition(focus.node, focus.offset)
  }

  private calculateNewPosition(
    direction: 'forward' | 'backward',
    granularity: 'character' | 'word' | 'line' | 'paragraph' | 'sentence' | 'lineboundary',
  ): Position | null {
    if (!this.focus) return null

    if (granularity === 'character') {
      return this.focus.nextCharacter(direction === 'forward' ? 1 : -1)
    }

    // lineboundary

    // @FIXME:
    if (granularity === 'lineboundary' && isAtomicComponent(this.focus.node)) {
      if (direction === 'forward' && this.focus.offset === 0) {
        return this.editor.createPosition(this.focus.node, 1)
      }
      if (direction === 'backward' && this.focus.offset === 1) {
        return this.editor.createPosition(this.focus.node, 0)
      }
    }

    if (granularity === 'lineboundary') {
      const rectWalker = this.editor.createRangeRectWalker()
      const targetPosition = iter(rectWalker.walk(this.focus.node, this.focus.offset, direction))
        .takeWhile((pos) => pos.lineBoundary)
        .last()

      if (!targetPosition) return null

      const targetRect = targetPosition.rect
      const x = direction === 'forward' ? targetRect.right : targetRect.left
      const y = targetRect.top

      const r = this.editor.getPositionFromPoint(x, y)

      console.log('r', r)

      debugRect([targetPosition.rect])

      return r
    }

    if (granularity === 'line') {
      const cursorRects = this.range.getClientRects()
      if (cursorRects.length === 0 && this.goalX === null) return null

      if (this.goalX === null) {
        this.goalX = cursorRects[0].left
      }

      const rectWalker = this.editor.createRangeRectWalker()
      const targetLinePositions = iter(rectWalker.walk(this.focus.node, this.focus.offset, direction))
        .skipWhile((pos) => pos.lineOffset === 0)
        .takeWhile((pos) => Math.abs(pos.lineOffset) === 1)
        .toArray()

      if (targetLinePositions.length === 0) return null

      const bestPos = findBestPosition(targetLinePositions, this.goalX!)
      if (!bestPos) return null

      return this.editor.getPositionFromPoint(this.goalX, bestPos.rect.top)
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

  deleteFromDocument() {
    const newPosition = this.range.deleteContents()
    this.collapse(newPosition.node, newPosition.offset)
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

export const isBlockElement = (node: Node): boolean => {
  if (isElementNode(node)) {
    const computedStyle = window.getComputedStyle(node)
    const display = computedStyle.display
    // display 값에 inline이 포함되지 않으면 블록 요소로 간주
    return !display.includes('inline')
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

const findAncestorBlock = (node: Node, root: Node): Element | null => {
  let current: Node | null = node
  while (current && current !== root) {
    if (isBlockElement(current)) return current as Element
    current = current.parentNode
  }
  return null
}

export class Editor {
  document: HTMLElement
  #selection: EditorSelection | null = null
  view: EditorView

  constructor(doc: HTMLElement) {
    this.document = normalizeDocument(doc)
    this.view = new EditorView(this)
  }

  createTreeWalker() {
    return new EditorTreeWalker(this.document)
  }

  createRangeRectWalker() {
    return new EditorRangeRectWalker(this)
  }

  createPosition(node: Node, offset: number = 0) {
    return new Position(this, node, offset)
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
    if (!position) return null

    const atomicAncestor = findAncestorAtomic(position.offsetNode, this.document)
    if (atomicAncestor) {
      const rect = atomicAncestor.getBoundingClientRect()
      return this.createPosition(atomicAncestor, x < rect.left + rect.width / 2 ? 0 : 1)
    }

    if (isElementNode(position.offsetNode)) {
      const childNode = position.offsetNode.childNodes[position.offset]

      // Not atomic. Find first leaf.
      const leafWalker = this.createTreeWalker()
      leafWalker.currentNode = childNode
      const leaf = leafWalker.forward().next().value || childNode // Fallback to childNode itself

      if (isAtomicComponent(leaf)) {
        const rect = (leaf as Element).getBoundingClientRect()
        return this.createPosition(leaf, x < rect.left + rect.width / 2 ? 0 : 1)
      }

      const precisePosition = this.document.ownerDocument.caretPositionFromPoint(x, y)
      if (precisePosition) {
        return this.createPosition(precisePosition.offsetNode, precisePosition.offset)
      }

      // Fallback to the beginning of the leaf if the precise call fails.
      return this.createPosition(leaf, 0)
    }

    return this.createPosition(position.offsetNode, position.offset)
  }
}

class EditorView {
  editor: Editor
  document: HTMLElement
  #cursorElement: HTMLDivElement
  #selectionElements: HTMLDivElement[] = []
  #inspectorElement: HTMLDivElement
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

    this.#inspectorElement = document.createElement('div')
    Object.assign(this.#inspectorElement.style, {
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      backgroundColor: 'rgba(0,0,0,0.7)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontFamily: 'monospace',
      fontSize: '12px',
      zIndex: '10000',
    })
    document.body.appendChild(this.#inspectorElement)
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

    this.#cursorElement.scrollIntoView({
      behavior: 'instant',
      block: 'nearest',
      inline: 'nearest',
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

    const { anchor, focus } = selection
    const formatNode = (node: Node | null) => {
      if (!node) return 'null'
      if (isTextNode(node)) {
        return `#text "${node.textContent?.substring(0, 20).replace(/\n/g, '\\n') ?? ''}..."`
      }
      if (isElementNode(node)) {
        return `<${node.nodeName.toLowerCase()}>`
      }
      return node.nodeName
    }

    this.#inspectorElement.innerHTML = `
      <pre style="margin: 0;">
isCollapsed: ${selection.isCollapsed}
Anchor: ${formatNode(anchor?.node ?? null)} [${anchor?.offset}]
Focus:  ${formatNode(focus?.node ?? null)} [${focus?.offset}]
      </pre>
    `.trim()
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
    // if (!selection.isCollapsed) {
    //   selection.deleteFromDocument()
    //   return
    // }

    // const { focus } = selection
    // if (!focus) return

    // // Find the block containing the focus
    // let currentBlock: Node | null = focus.node
    // if (currentBlock === selection.editor.document) return // empty editor
    // while (currentBlock && currentBlock.parentNode !== selection.editor.document) {
    //   currentBlock = currentBlock.parentNode
    // }
    // if (!currentBlock) {
    //   // Should not happen, but as a fallback
    //   selection.modify('extend', 'backward', 'character')
    //   selection.deleteFromDocument()
    //   return
    // }

    // // Check if cursor is at the beginning of the block
    // const range = document.createRange()
    // range.selectNodeContents(currentBlock)
    // range.setEnd(focus.node, focus.offset)

    // // If there's no visible content before the cursor in this block, we're at the start.
    // if (range.toString().trim() === '') {
    //   const prevBlock = (currentBlock as Element).previousElementSibling
    //   if (prevBlock) {
    //     // We are at the start of a block, and there is a previous block. Merge them.

    //     // Find a suitable position for the cursor after merge.
    //     // It should be at the end of the previous block.
    //     const walker = selection.editor.createTreeWalker()
    //     walker.currentNode = prevBlock
    //     const nodesInPrevBlock = Array.from(walker.forward())
    //     const lastNode = nodesInPrevBlock.length > 0 ? nodesInPrevBlock[nodesInPrevBlock.length - 1] : prevBlock

    //     const newCursorNode = lastNode
    //     const newCursorOffset = getAfterOffset(lastNode)

    //     // Move all children from current block to the end of the previous block.
    //     while (currentBlock.firstChild) {
    //       prevBlock.appendChild(currentBlock.firstChild)
    //     }
    //     ;(currentBlock as Element).remove()

    //     // Set selection to the new position.
    //     selection.collapse(newCursorNode, newCursorOffset)
    //     return
    //   }
    // }

    // Default behavior: delete a single character backward.
    selection.modify('extend', 'backward', 'character')
    selection.deleteFromDocument()
  },
  'Delete': (selection) => {
    if (selection.isCollapsed) {
      selection.modify('extend', 'forward', 'character')
    }
    selection.deleteFromDocument()
  },
  '`': (selection) => {
    console.log('selection', selection)
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

  // test
  const firstNode = mainWalker.forward().next().value

  const range = editor.createRange()
  range.setStart(firstNode, 0)
  const selection = editor.getSelection()
  selection.setRange(range)
  view.render()

  Array(3)
    .fill(0)
    .forEach(() => {
      selection.modify('move', 'forward', 'character')
    })

  view.render()
}
