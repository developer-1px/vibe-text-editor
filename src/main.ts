import { iter } from './base/Iterator'
import { debugRect, findBestPosition } from './dom/DOMRect'
import { EditorRangeRectWalker } from './dom/EditorRangeRectWalker'
import { EditorTreeWalker } from './dom/EditorTreeWalker'
import { DocumentModel } from './entities/model'
import { findAncestorAtomic } from './dom/findAncestorAtomic'
import { isAtomicComponent } from './dom/isAtomicComponent'
import { isBlockElement } from './dom/isBlockElement'
import { traversePreOrderGenerator, traversePreOrderBackwardGenerator } from './dom/traversePreOrderGenerator'

export const isTextNode = (node: Node | null): node is Text => node?.nodeType === Node.TEXT_NODE
export const isElementNode = (node: Node | null): node is Element => node?.nodeType === Node.ELEMENT_NODE

export const getAfterOffset = (node: Node): number => (isTextNode(node) ? node.textContent?.length || 0 : 1)

export const acceptNode = (node: Node): number => {
  if (isTextNode(node) || isAtomicComponent(node)) {
    return NodeFilter.FILTER_ACCEPT
  }
  return NodeFilter.FILTER_SKIP
}

/** 노드의 부모가 inline 요소인지 확인 */
const isInlineElement = (node: Node): boolean => {
  const parentElement = node.parentNode
  return !!(parentElement && isElementNode(parentElement) && !isBlockElement(parentElement))
}

/** 텍스트 노드가 inline 요소 내부에 있는지 확인 */
const isTextNodeInInlineElement = (node: Node): boolean => {
  return isTextNode(node) && isInlineElement(node)
}

/** 지정된 방향으로 순회할 수 있는 이터레이터 생성 */
const createTraverser = (editor: Editor, startNode: Node, direction: 'forward' | 'backward') => {
  const traverser = direction === 'forward' ? traversePreOrderGenerator : traversePreOrderBackwardGenerator
  return iter(traverser(editor.document, startNode, (node) => (isAtomicComponent(node) ? false : true)))
    .filter((n) => isTextNode(n) || isAtomicComponent(n))
    .filter((n) => n !== startNode)
}

/** 지정된 방향의 다음 노드 찾기 */
const findNextNode = (editor: Editor, node: Node, direction: 'forward' | 'backward'): Node | null => {
  return createTraverser(editor, node, direction).first()
}

/** 텍스트 노드 경계에서의 위치 처리 */
const handleTextNodeBoundary = (editor: Editor, node: Node, offset: number, maxOffset: number): Position | null => {
  if (!isTextNode(node) || offset !== maxOffset) {
    return null // 텍스트 노드의 끝이 아니면 특별한 처리 없음
  }

  const nextNode = findNextNode(editor, node, 'forward')
  if (!nextNode) {
    return null // 다음 노드가 없으면 특별한 처리 없음
  }

  // 다음 노드가 인라인 atomic 컴포넌트인 경우
  if (isAtomicComponent(nextNode) && !isBlockElement(nextNode)) {
    const nodeId = editor.getNodeId(nextNode)
    if (nodeId) return editor.createPosition(nodeId, 0)
  }

  // 다음 노드가 텍스트 노드인 경우
  if (isTextNode(nextNode)) {
    const isCurrentNodeInInline = isTextNodeInInlineElement(node)
    const isNextNodeInInline = isTextNodeInInlineElement(nextNode)

    // 일반 텍스트에서 인라인 텍스트로 넘어가는 경우 (예: text -> <strong>text</strong>)
    if (!isCurrentNodeInInline && isNextNodeInInline) {
      const nodeId = editor.getNodeId(nextNode)
      if (nodeId) return editor.createPosition(nodeId, 0)
    }

    // 인라인 텍스트에서 다른 인라인 텍스트로 넘어가는 경우 (예: <strong>text1</strong><em>text2</em>)
    if (isCurrentNodeInInline && isNextNodeInInline) {
      const nodeId = editor.getNodeId(node)
      if (nodeId) return editor.createPosition(nodeId, maxOffset) // 현재 노드의 끝에 머무름
    }
  }

  return null // 위 조건들에 해당하지 않으면 특별한 처리 없음
}

/** 블록 요소 간 이동인지 확인 */
const isMovingBetweenBlocks = (currentNode: Node, nextNode: Node): boolean => {
  return !isTextNodeInInlineElement(currentNode) && !isTextNodeInInlineElement(nextNode) && currentNode.parentNode !== nextNode.parentNode
}

/** 새 오프셋 계산 */
const calculateNewOffset = (currentOffset: number, maxOffset: number, currentNode: Node, nextNode: Node, isForward: boolean): number => {
  const isBlockToBlock = isMovingBetweenBlocks(currentNode, nextNode)
  const blockBoundaryAdjustment = isBlockToBlock ? 1 : 0

  // 앞으로 이동 시: 현재 offset에서 현재 노드의 maxOffset과 블록 경계 조정을 뺀다.
  // 뒤로 이동 시: 현재 offset에 다음 노드의 offset과 블록 경계 조정을 더한다.
  return isForward
    ? currentOffset - maxOffset - blockBoundaryAdjustment
    : currentOffset + getAfterOffset(nextNode) + blockBoundaryAdjustment
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

export class Position {
  constructor(public nodeId: string, public offset: number) {}

  clone(nodeId: string, offset: number = 0) {
    return new Position(nodeId, offset)
  }
}

//
// EditorRange
//
export class EditorRange {
  editor: Editor

  private _start: Position | null = null
  private _end: Position | null = null

  get startContainerId() {
    return this._start?.nodeId || null
  }

  get startOffset() {
    return this._start?.offset || 0
  }

  get endContainerId() {
    return this._end?.nodeId || null
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
    return this._start?.nodeId === this._end?.nodeId && this._start?.offset === this._end?.offset
  }

  constructor(editor: Editor) {
    this.editor = editor
  }

  private setBoundary(nodeId: string, offset: number, boundaryType: 'start' | 'end') {
    const position = new Position(nodeId, offset)
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
  }

  setStart(nodeId: string, offset: number) {
    this.setBoundary(nodeId, offset, 'start')
  }

  setEnd(nodeId: string, offset: number) {
    this.setBoundary(nodeId, offset, 'end')
  }

  selectNode(nodeId: string) {
    const node = this.editor.getNodeById(nodeId)
    if (!node) return
    const modelNode = this.editor.model[nodeId]
    if (!modelNode) return

    this.setStart(nodeId, 0)
    const endOffset = isTextNode(node) ? node.textContent?.length ?? 0 : 1
    this.setEnd(nodeId, endOffset)
  }

  toRange(): Range | null {
    if (!this._start || !this._end) {
      return null
    }

    const startNode = this.editor.getNodeById(this._start.nodeId)
    const endNode = this.editor.getNodeById(this._end.nodeId)

    if (!startNode || !endNode) {
      return null
    }

    const range = this.editor.document.ownerDocument.createRange()
    setRangeBoundary(range, startNode, this._start.offset, 'start')
    setRangeBoundary(range, endNode, this._end.offset, 'end')

    return range
  }

  getClientRects(reversed: boolean = false) {
    const range = this.toRange()
    return range ? Array.from(range.getClientRects()) : []
  }

  getBoundingClientRect() {
    const range = this.toRange()
    return range ? range.getBoundingClientRect() : new DOMRect()
  }

  deleteContents() {
    // TODO: 모델에서 내용을 삭제하도록 구현해야 합니다.
    console.warn('EditorRange.deleteContents is not implemented for the model yet.')
  }
}

export class EditorSelection {
  editor: Editor
  anchor: Position | null = null
  focus: Position | null = null
  goalX: number | null = null

  constructor(editor: Editor) {
    this.editor = editor
  }

  get isCollapsed() {
    return !!(this.anchor && this.focus && this.anchor.nodeId === this.focus.nodeId && this.anchor.offset === this.focus.offset)
  }

  get range(): EditorRange {
    const range = new EditorRange(this.editor)
    if (!this.anchor || !this.focus) {
      return range
    }

    const { anchor: anchorPosition, focus: focusPosition } = this

    const anchorNode = this.editor.getNodeById(anchorPosition.nodeId)
    const focusNode = this.editor.getNodeById(focusPosition.nodeId)

    if (!anchorNode || !focusNode) {
      return range
    }

    let isFocusBeforeAnchor = false
    if (anchorNode === focusNode) {
      isFocusBeforeAnchor = focusPosition.offset < anchorPosition.offset
    } else {
      const pos = anchorNode.compareDocumentPosition(focusNode)
      isFocusBeforeAnchor = !!(pos & Node.DOCUMENT_POSITION_PRECEDING)
    }

    if (isFocusBeforeAnchor) {
      range.setStart(focusPosition.nodeId, focusPosition.offset)
      range.setEnd(anchorPosition.nodeId, anchorPosition.offset)
    } else {
      range.setStart(anchorPosition.nodeId, anchorPosition.offset)
      range.setEnd(focusPosition.nodeId, focusPosition.offset)
    }

    return range
  }

  setRange(range: EditorRange) {
    this.anchor = range.start
    this.focus = range.end
  }

  collapseToStart() {
    if (!this.range.start) return
    this.focus = this.anchor = this.range.start
    this.editor.render()
  }

  collapseToEnd() {
    if (!this.range.end) return
    this.focus = this.anchor = this.range.end
    this.editor.render()
  }

  collapse(nodeId: string, offset: number) {
    this.focus = new Position(nodeId, offset)
    this.anchor = this.focus
    this.editor.render()
  }

  extend(nodeId: string, offset: number) {
    if (!this.anchor) {
      this.collapse(nodeId, offset)
      return
    }
    this.setBaseAndExtent(this.anchor.nodeId, this.anchor.offset, nodeId, offset)
  }

  setBaseAndExtent(anchorNodeId: string, anchorOffset: number, focusNodeId: string, focusOffset: number) {
    this.anchor = new Position(anchorNodeId, anchorOffset)
    this.focus = new Position(focusNodeId, focusOffset)
    this.editor.render()
  }

  private calculateNewPosition(
    direction: 'forward' | 'backward',
    granularity: 'character' | 'word' | 'line' | 'paragraph' | 'sentence' | 'lineboundary',
  ): Position | null {
    if (!this.focus) {
      return null
    }
    const focusNode = this.editor.getNodeById(this.focus.nodeId)
    if (!focusNode) return null

    if (granularity === 'character') {
      const newPosition = this.editor.normalizePosition(this.focus.nodeId, this.focus.offset + (direction === 'forward' ? 1 : -1))
      return newPosition
    }

    // @FIXME:
    if (granularity === 'lineboundary' && isAtomicComponent(focusNode)) {
      if (direction === 'forward' && this.focus.offset === 0) {
        return this.editor.createPosition(this.focus.nodeId, 1)
      }
      if (direction === 'backward' && this.focus.offset === 1) {
        return this.editor.createPosition(this.focus.nodeId, 0)
      }
    }

    if (granularity === 'lineboundary') {
      const rectWalker = this.editor.createRangeRectWalker()
      const targetPosition = iter(rectWalker.walk(focusNode, this.focus.offset, direction))
        .takeWhile((pos) => pos.lineBoundary)
        .last()

      if (targetPosition) {
        const targetNodeId = this.editor.getNodeId(targetPosition.node)
        if (targetNodeId) {
          const pos = findBestPosition([targetPosition], 0)
          if (pos) {
            return this.editor.createPosition(targetNodeId, pos.offset)
          }
        }
      }
      return null
    }

    if (granularity === 'line') {
      const currentGoalX = this.goalX
      const rectWalker = this.editor.createRangeRectWalker()
      const targetLinePositions = iter(rectWalker.walk(focusNode, this.focus.offset, direction))
        .skipWhile((pos) => pos.lineOffset === 0)
        .takeWhile((pos) => Math.abs(pos.lineOffset) === 1)
        .toArray()

      if (targetLinePositions.length > 0) {
        const bestPosition = findBestPosition(targetLinePositions, currentGoalX || 0)
        if (bestPosition) {
          const targetNodeId = this.editor.getNodeId(bestPosition.node)
          if (targetNodeId) {
            return this.editor.createPosition(targetNodeId, bestPosition.offset)
          }
        }
      }
      return null
    }

    return null
  }

  modify(
    type: 'move' | 'extend',
    direction: 'forward' | 'backward',
    granularity: 'character' | 'word' | 'line' | 'paragraph' | 'sentence' | 'lineboundary',
  ) {
    const newFocusPosition = this.calculateNewPosition(direction, granularity)
    if (!newFocusPosition) return

    if (type === 'move') {
      this.collapse(newFocusPosition.nodeId, newFocusPosition.offset)
    } else {
      this.extend(newFocusPosition.nodeId, newFocusPosition.offset)
    }

    const focusNode = this.editor.getNodeById(this.focus!.nodeId)
    if (focusNode && granularity === 'character' && focusNode.nodeName === 'BR') {
      this.modify('move', direction, 'character')
      return
    }

    this.goalX = null
  }

  deleteFromDocument() {
    // TODO: Implement model deletion
  }
}

export class Editor {
  model: DocumentModel
  document: HTMLElement
  private _selection: EditorSelection
  view: EditorView

  constructor(doc: HTMLElement, initialModel: DocumentModel) {
    this.document = doc
    this.model = initialModel
    this._selection = new EditorSelection(this)
    this.view = new EditorView(this)
    this.render()
  }

  getNodeById(nodeId: string): Node | null {
    const element = this.document.querySelector<HTMLElement>(`[data-node-id="${nodeId}"]`)
    if (!element) return null

    if (element.getAttribute('data-node-type') === 'text') {
      return element.firstChild
    }
    return element
  }

  getNodeId(node: Node): string | null {
    const element = isTextNode(node) ? node.parentElement : (node as Element)
    return element?.getAttribute('data-node-id') || null
  }

  normalizePosition(nodeId: string, offset: number): Position {
    const node = this.getNodeById(nodeId)
    if (!node) {
      const modelNode = this.model[nodeId]
      if (!modelNode) return new Position(nodeId, offset)
      return new Position(nodeId, offset)
    }

    let currentNode = node
    let currentOffset = offset

    while (true) {
      const maxOffset = getAfterOffset(currentNode)

      if (currentOffset >= 0 && currentOffset <= maxOffset) {
        const boundaryPosition = handleTextNodeBoundary(this, currentNode, currentOffset, maxOffset)
        if (boundaryPosition) {
          return boundaryPosition
        }
        const currentId = this.getNodeId(currentNode)
        if (currentId) {
          return this.createPosition(currentId, currentOffset)
        }
        return new Position(nodeId, offset)
      }

      const isForward = currentOffset > maxOffset
      const direction = isForward ? 'forward' : 'backward'
      const nextNode = findNextNode(this, currentNode, direction)

      if (!nextNode) {
        const currentId = this.getNodeId(currentNode)
        if (currentId) {
          return this.createPosition(currentId, isForward ? maxOffset : 0)
        }
        return new Position(nodeId, isForward ? maxOffset : 0)
      }

      currentOffset = calculateNewOffset(currentOffset, maxOffset, currentNode, nextNode, isForward)
      currentNode = nextNode
    }
  }

  createTreeWalker() {
    return new EditorTreeWalker(this.document)
  }

  createRangeRectWalker() {
    return new EditorRangeRectWalker(this)
  }

  createPosition(nodeId: string, offset: number = 0) {
    return new Position(nodeId, offset)
  }

  getSelection() {
    return this._selection
  }

  render() {
    this.view.renderSelection()
  }

  renderDocument() {
    this.view.renderDocument()
  }

  getPositionFromPoint(x: number, y: number): Position | null {
    const position = this.document.ownerDocument.caretPositionFromPoint(x, y)
    if (position) {
      const atomicAncestor = findAncestorAtomic(position.offsetNode, this.document)
      if (atomicAncestor) {
        const rect = atomicAncestor.getBoundingClientRect()
        const nodeId = this.getNodeId(atomicAncestor)
        if (nodeId) return this.createPosition(nodeId, x < rect.left + rect.width / 2 ? 0 : 1)
      }
    }

    const elements = this.document.ownerDocument.elementsFromPoint(x, y) as Element[]
    const leaf = iter(elements).find((el) => {
      return !!(el.closest('#editor') && el.getAttribute('data-node-id'))
    })

    if (leaf) {
      const nodeId = this.getNodeId(leaf)
      if (nodeId) {
        if (isAtomicComponent(leaf)) {
          const rect = leaf.getBoundingClientRect()
          return this.createPosition(nodeId, x < rect.left + rect.width / 2 ? 0 : 1)
        }

        const precisePosition = this.document.ownerDocument.caretPositionFromPoint(x, y)
        if (precisePosition) {
          const preciseNodeId = this.getNodeId(precisePosition.offsetNode)
          if (preciseNodeId) return this.createPosition(preciseNodeId, precisePosition.offset)
        }

        return this.createPosition(nodeId, 0)
      }
    }

    if (position) {
      const nodeId = this.getNodeId(position.offsetNode)
      if (nodeId) return this.createPosition(nodeId, position.offset)
    }
    return null
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

    this.document.addEventListener('compositionend', this.onCompositionEnd.bind(this))
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
    this.#cursorElement.style.left = `${rect.left - editorRect.left}px`
    this.#cursorElement.style.top = `${rect.top - editorRect.top}px`
    this.#cursorElement.style.height = `${rect.height}px`
  }

  renderSelection() {
    const selection = this.editor.getSelection()
    const editorRect = this.document.getBoundingClientRect()

    this.#selectionElements.forEach((el) => el.remove())
    this.#selectionElements = []
    this.#cursorElement.style.display = 'none'

    const range = selection.range
    if (!range) return

    const rects = range.getClientRects() as DOMRect[]

    if (rects.length > 0) {
      if (range.isCollapsed) {
        this.updateCursorPosition(rects[0], editorRect)
        this.#cursorElement.style.display = 'block'
      } else {
        rects.forEach((rect) => this.createSelectionElement(rect, editorRect))
      }
    }

    const { anchor, focus } = selection
    const formatNode = (nodeId: string | null): string => {
      if (!nodeId) return 'null'
      const node = this.editor.getNodeById(nodeId)
      if (!node) return `${nodeId}(not in DOM)`
      const modelNode = this.editor.model[nodeId]
      if (modelNode && modelNode.type === 'text') {
        return `"${modelNode.text}"`
      }
      if (isElementNode(node)) {
        return `&lt;${node.tagName.toLowerCase()}&gt;`
      }
      return 'unknown'
    }

    this.#inspectorElement.innerHTML = `
      <pre style="margin: 0;">
isCollapsed: ${selection.isCollapsed}
Anchor: ${formatNode(anchor?.nodeId ?? null)} [${anchor?.offset}]
Focus:  ${formatNode(focus?.nodeId ?? null)} [${focus?.offset}]
      </pre>
    `.trim()
  }

  renderDocument() {
    const model = this.editor.model
    const rootNodeInfo = Object.values(model).find((n) => n.type === 'root')
    if (!rootNodeInfo) return

    // Clear existing content
    while (this.document.firstChild) {
      this.document.removeChild(this.document.firstChild)
    }

    const buildDOM = (nodeId: string): Node => {
      const nodeInfo = model[nodeId]
      if (!nodeInfo) {
        return document.createComment('invalid node id')
      }

      switch (nodeInfo.type) {
        case 'text': {
          let node: Node = document.createTextNode(nodeInfo.text || '')
          if (nodeInfo.attributes) {
            // 속성을 기반으로 텍스트 노드를 감싸는 엘리먼트를 생성합니다.
            let wrapper: HTMLElement | null = null
            if (nodeInfo.attributes.bold) {
              wrapper = document.createElement('b')
              wrapper.appendChild(node)
            }
            if (nodeInfo.attributes.italic) {
              const newWrapper = document.createElement('i')
              newWrapper.appendChild(wrapper || node)
              wrapper = newWrapper
            }
            // ... 다른 속성들에 대한 처리 추가
            if (wrapper) {
              node = wrapper
            }
          }
          // 실제 텍스트 노드를 감싸는 span을 만들고 data-node-id를 부여합니다.
          const textWrapper = document.createElement('span')
          textWrapper.setAttribute('data-node-id', nodeId)
          textWrapper.setAttribute('data-node-type', 'text')
          textWrapper.appendChild(node)
          return textWrapper
        }
        case 'element':
        case 'root': {
          const tag = nodeInfo.type === 'root' ? 'div' : nodeInfo.tag
          const element = document.createElement(tag || 'div')
          element.setAttribute('data-node-id', nodeId)
          if (nodeInfo.children) {
            nodeInfo.children.forEach((childId) => {
              element.appendChild(buildDOM(childId))
            })
          }
          return element
        }
        case 'atomic': {
          const element = document.createElement(nodeInfo.tag || 'span')
          element.setAttribute('data-node-id', nodeId)
          // Atomic 컴포넌트는 자식을 렌더링하지 않습니다.
          return element
        }
        default:
          return document.createComment('unknown node type')
      }
    }

    const newContentRoot = buildDOM(rootNodeInfo.id)
    if (newContentRoot.nodeType === Node.ELEMENT_NODE) {
      Array.from(newContentRoot.childNodes).forEach((child) => {
        this.document.appendChild(child)
      })
    }

    // Re-append cursor and inspector elements as they are removed by the clearing logic
    this.document.appendChild(this.#cursorElement)
    document.body.appendChild(this.#inspectorElement)

    this.renderSelection()
  }

  private onCompositionEnd(event: CompositionEvent) {
    // Handle composition end event
  }
}
