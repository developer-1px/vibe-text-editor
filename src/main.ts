import { iter } from './Iterator'

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

class EditorTreeWalker {
  root: Node
  currentNode: Node

  constructor(root: Node, currentNode?: Node) {
    this.root = root
    this.currentNode = currentNode || root
  }

  firstChild(): Node | null {
    if (this.currentNode.firstChild) {
      this.currentNode = this.currentNode.firstChild
      if (acceptNode(this.currentNode) === NodeFilter.FILTER_ACCEPT) {
        return this.currentNode
      }
      return this.nextNode()
    }
    return null
  }

  nextNode(): Node | null {
    let node: Node | null = this.currentNode

    do {
      if (!isAtomicComponent(node) && node.firstChild) {
        node = node.firstChild
      } else if (node.nextSibling) {
        node = node.nextSibling
      } else {
        let temp: Node | null = node
        while (temp) {
          if (temp === this.root) {
            node = null
            break
          }

          if (temp.nextSibling) {
            node = temp.nextSibling
            break
          }
          temp = temp.parentNode
        }
        if (!temp) {
          node = null
        }
      }

      if (node && acceptNode(node) === NodeFilter.FILTER_ACCEPT) {
        this.currentNode = node
        return node
      }
    } while (node)

    return null
  }

  previousNode(): Node | null {
    let node: Node | null = this.currentNode

    do {
      if (node === this.root) {
        node = null
        break
      }

      if (node.previousSibling) {
        node = node.previousSibling
        while (!isAtomicComponent(node) && node.lastChild) {
          node = node.lastChild
        }
      } else {
        node = node.parentNode
      }

      if (node && acceptNode(node) === NodeFilter.FILTER_ACCEPT) {
        this.currentNode = node
        return node
      }
    } while (node)

    return null
  }
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

  constructor(editor: Editor) {
    this.editor = editor
  }

  setStart(node: Node, offset: number) {
    if (offset < 0) {
      throw new Error('Offset must be greater than 0')
    }

    if (isTextNode(node) && offset > node.textContent!.length) {
      throw new Error('Offset is out of range')
    }

    if (isElementNode(node) && offset > 1) {
      throw new Error('Offset for atomic elements must be 0 or 1')
    }

    this._startContainer = node
    this._startOffset = offset

    if (!this._endContainer) {
      this._endContainer = node
      this._endOffset = offset
    }

    this._range = null
  }

  setEnd(node: Node, offset: number) {
    if (offset < 0) {
      throw new Error('Offset must be greater than 0')
    }

    if (isTextNode(node) && offset > node.textContent!.length) {
      throw new Error('Offset is out of range')
    }

    if (isElementNode(node) && offset > 1) {
      throw new Error('Offset for atomic elements must be 0 or 1')
    }

    this._endContainer = node
    this._endOffset = offset

    if (!this._startContainer) {
      this._startContainer = node
      this._startOffset = offset
    }

    this._range = null
  }

  //
  setStartAfter(node: Node) {
    return this.setStart(node, getAfterOffset(node))
  }

  setStartBefore(node: Node) {
    return this.setStart(node, 0)
  }

  setEndAfter(node: Node) {
    return this.setEnd(node, getAfterOffset(node))
  }

  setEndBefore(node: Node) {
    return this.setEnd(node, 0)
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

  get isCollapsed() {
    return this._startContainer === this._endContainer && this._startOffset === this._endOffset
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

  get isCollapsed() {
    return this.anchor && this.focus && this.anchor.node === this.focus.node && this.anchor.offset === this.focus.offset
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

  modify(
    type: 'move' | 'extend',
    direction: 'forward' | 'backward',
    granularity: 'character' | 'word' | 'line' | 'paragraph' | 'sentence' | 'lineboundary',
  ) {
    if (!this.focus) return

    if (granularity === 'character') {
      this.goalX = null
      const newFocusPosition = getNewPosition(this.editor, this.focus, direction, granularity)

      if (newFocusPosition) {
        this.focus = newFocusPosition
        if (type === 'move') {
          this.anchor = newFocusPosition
        }
      }
    } else if (granularity === 'lineboundary') {
      this.goalX = null
      if (!this.focus) return

      const rectWalker = this.editor.createRangeRectWalker()
      const linePositions = iter(rectWalker.walk(this.focus.node, this.focus.offset, direction))
        .takeWhile((pos) => pos.lineOffset === 0)
        .toArray()

      if (linePositions.length === 0) return

      const targetPos = linePositions[linePositions.length - 1]
      if (!targetPos) return

      const targetRect = targetPos.rect
      const goalX = direction === 'forward' ? targetRect.right - 1 : targetRect.left

      const y = targetRect.top + targetRect.height / 2
      const caretPosition = this.editor.getPositionFromPoint(goalX, y)
      if (!caretPosition) return

      const newFocusPosition = { node: caretPosition.node, offset: caretPosition.offset }
      this.focus = newFocusPosition
      if (type === 'move') {
        this.anchor = newFocusPosition
      }
    }
    // line
    else if (granularity === 'line') {
      const cursorRects = this.range.getClientRects()
      if (cursorRects.length === 0 && this.goalX === null) return

      if (this.goalX === null) {
        this.goalX = cursorRects[0].left
      }

      const rectWalker = this.editor.createRangeRectWalker()
      const targetLinePositions = iter(rectWalker.walk(this.focus.node, this.focus.offset, direction))
        .skipWhile((pos) => pos.lineOffset === 0)
        .takeWhile((pos) => Math.abs(pos.lineOffset) === 1)
        .toArray()

      if (targetLinePositions.length === 0) return

      const bestPos = findBestPosition(targetLinePositions, this.goalX!)
      if (!bestPos) return

      const targetRect = bestPos.rect
      const y = targetRect.top + targetRect.height / 2
      const caretPosition = this.editor.getPositionFromPoint(this.goalX, y)

      if (!caretPosition) return

      const newFocusPosition = { node: caretPosition.node, offset: caretPosition.offset }
      this.focus = newFocusPosition
      if (type === 'move') {
        this.anchor = newFocusPosition
      }
    }
  }
}

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

function getHorizontalDistance(rect: DOMRect, x: number): number {
  // x가 rect 내에 있으면 음수 값을 반환하여 우선순위를 높입니다.
  if (x >= rect.left && x <= rect.right) {
    return -1
  }
  // rect의 중심점과 x 사이의 거리를 계산합니다.
  return Math.abs((rect.left + rect.right) / 2 - x)
}

function findBestPosition<T extends { rect: DOMRect }>(positions: T[], goalX: number): T | null {
  if (positions.length === 0) return null

  // 주어진 위치들 중에서 goalX와 가장 가까운 위치를 찾습니다.
  return positions.reduce((best, current) =>
    getHorizontalDistance(current.rect, goalX) < getHorizontalDistance(best.rect, goalX) ? current : best,
  )
}

function debugRect(rects: DOMRect[]) {
  for (const rect of rects) {
    const div = document.createElement('div')
    div.style.position = 'fixed'
    div.style.top = rect.top + 'px'
    div.style.left = rect.left + 'px'
    div.style.width = rect.width + 'px'
    div.style.height = rect.height + 'px'
    div.style.backgroundColor = 'rgba(0, 0, 255, 0.2)'
    div.style.outline = '1px solid red'
    div.style.pointerEvents = 'none'
    document.body.appendChild(div)
    setTimeout(() => {
      div.remove()
    }, 1000)
  }
}

function _calculateVerticalOverlapRatio(rect1: DOMRect, rect2: DOMRect): number {
  const overlapTop = Math.max(rect1.top, rect2.top)
  const overlapBottom = Math.min(rect1.bottom, rect2.bottom)
  const overlapHeight = Math.max(0, overlapBottom - overlapTop)
  const minHeight = Math.min(rect1.height, rect2.height)
  return minHeight > 0 ? overlapHeight / minHeight : 0
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
        } else if (direction === 'forward' && lineAnchorRect.bottom > rect.bottom) {
          continue
        } else if (direction === 'backward' && lineAnchorRect.top < rect.top) {
          continue
        } else if (_calculateVerticalOverlapRatio(lineAnchorRect, rect) < 0.5) {
          lineOffset += lineOffsetIncrement
          lineAnchorRect = rect
        }

        yield { node, rect, lineOffset }
      }
    }

    const walker = this.editor.createTreeWalker()
    walker.currentNode = startNode

    const node = walker.currentNode
    const range = this.editor.createRange()
    const reversed = direction === 'backward'
    reversed ? range.setEnd(node, startOffset) : range.setStart(node, startOffset)
    yield* processNode(node, range.getClientRects(reversed))
    reversed ? range.setStartBefore(node) : range.setEndAfter(node)
    yield* processNode(node, range.getClientRects(reversed))

    const nextNode = () => (direction === 'forward' ? walker.nextNode() : walker.previousNode())
    while (nextNode()) {
      const node = walker.currentNode
      range.selectNode(node)
      const rects = Array.from(range.getClientRects(direction === 'backward'))
      yield* processNode(node, rects)
    }
  }
}

const findAncestorAtomic = (node: Node, root: Node): Element | null => {
  let current: Node | null = node
  while (current && current !== root) {
    if (isAtomicComponent(current)) return current as Element
    current = current.parentNode
  }
  return null
}

class Editor {
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
      const walker = this.createTreeWalker()
      walker.currentNode = childNode
      const leaf = walker.firstChild() || childNode // Fallback to childNode itself

      if (isAtomicComponent(leaf)) {
        const rect = (leaf as Element).getBoundingClientRect()
        console.log('@@@', rect, x)
        return { node: leaf, offset: x < rect.left + rect.width / 2 ? 0 : 1 }
      }

      const position2 = this.document.ownerDocument.caretPositionFromPoint(x, y)
      console.log('@@@1', position2, x)
      console.log('@@@2', leaf)

      const rect = (leaf as Element).getBoundingClientRect()
      return { node: leaf, offset: 0 }
    }

    return { node: position.offsetNode, offset: position.offset }
  }
}

class EditorView {
  editor: Editor
  document: HTMLElement
  #cursorElement: HTMLDivElement
  #selectionElements: HTMLDivElement[] = []
  #selectionStyle = {
    backgroundColor: 'rgba(0, 0, 255, 0.2)',
    outline: '1px solid red',
    position: 'absolute',
    pointerEvents: 'none',
  }

  constructor(editor: Editor) {
    this.editor = editor
    this.document = editor.document
    this.#cursorElement = document.createElement('div')
    Object.assign(this.#cursorElement.style, {
      position: 'absolute',
      width: '2px',
      backgroundColor: 'blue',
      pointerEvents: 'none',
      display: 'none',
    })
    this.document.style.position = 'relative' // Ensure document is a positioning context
    this.document.appendChild(this.#cursorElement)
  }

  render() {
    // Clear previous selection elements
    this.#selectionElements.forEach((el) => el.remove())
    this.#selectionElements = []

    const selection = this.editor.getSelection()
    const range = selection.range
    if (!range) {
      this.#cursorElement.style.display = 'none'
      return
    }

    const rects = range.getClientRects()
    const editorRect = this.document.getBoundingClientRect()

    if (rects.length > 0) {
      if (range.startContainer === range.endContainer && range.startOffset === range.endOffset) {
        // Render cursor
        const rect = rects[0]
        this.#cursorElement.style.top = rect.top - editorRect.top + 'px'
        this.#cursorElement.style.left = rect.left - editorRect.left + 'px'
        this.#cursorElement.style.height = rect.height + 'px'
        this.#cursorElement.style.display = 'block'
      } else {
        // Render selection
        this.#cursorElement.style.display = 'none'
        for (const rect of rects) {
          const selectionDiv = document.createElement('div')
          Object.assign(selectionDiv.style, this.#selectionStyle, {
            top: rect.top - editorRect.top + 'px',
            left: rect.left - editorRect.left + 'px',
            height: rect.height + 'px',
            width: rect.width + 'px',
          })
          this.document.appendChild(selectionDiv)
          this.#selectionElements.push(selectionDiv)
        }
      }
    } else {
      this.#cursorElement.style.display = 'none'
    }
  }
}

type KeyBindingCommand = (selection: EditorSelection, event: KeyboardEvent) => void

const keyBindings: Record<string, KeyBindingCommand> = {
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
}

function getKeyBindingString(e: KeyboardEvent): string | null {
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

function getNewPosition(editor: Editor, position: Position, direction: 'forward' | 'backward', granularity: 'character'): Position | null {
  const { node, offset } = position

  if (granularity !== 'character') {
    return null
  }

  if (direction === 'forward') {
    if (offset < getAfterOffset(node)) {
      return { node, offset: offset + 1 }
    }

    const walker = editor.createTreeWalker()
    walker.currentNode = node
    const nextNode = walker.nextNode()
    if (nextNode) {
      return { node: nextNode, offset: 0 }
    }
  } else {
    // backward
    if (offset > 0) {
      return { node, offset: offset - 1 }
    }

    const walker = editor.createTreeWalker()
    walker.currentNode = node
    const previousNode = walker.previousNode()
    if (previousNode) {
      return { node: previousNode, offset: getAfterOffset(previousNode) }
    }
  }
  return null
}

function main() {
  const editor = new Editor(document.querySelector('#app')!)
  const view = new EditorView(editor)
  const node = editor.createTreeWalker().firstChild()

  if (!node) return

  const range = editor.createRange()
  range.setStart(node, 0)
  const selection = editor.getSelection()
  selection.setRange(range)
  view.render()

  // console.log('resres', res)
  //

  for (let i = 0; i < 10; i++) {
    selection.modify('move', 'forward', 'character')
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

main()
