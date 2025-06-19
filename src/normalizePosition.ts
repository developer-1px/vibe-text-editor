import { iter } from './Iterator'
import { type Editor, type Position, getAfterOffset, isTextNode, isElementNode, isBlockElement, isAtomicComponent } from './main'
import { traversePreOrderGenerator, traversePreOrderBackwardGenerator } from './traversePreOrderGenerator'

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
    return editor.createPosition(nextNode, 0)
  }

  // 다음 노드가 텍스트 노드인 경우
  if (isTextNode(nextNode)) {
    const isCurrentNodeInInline = isTextNodeInInlineElement(node)
    const isNextNodeInInline = isTextNodeInInlineElement(nextNode)

    // 일반 텍스트에서 인라인 텍스트로 넘어가는 경우 (예: text -> <strong>text</strong>)
    if (!isCurrentNodeInInline && isNextNodeInInline) {
      return editor.createPosition(nextNode, 0)
    }

    // 인라인 텍스트에서 다른 인라인 텍스트로 넘어가는 경우 (예: <strong>text1</strong><em>text2</em>)
    if (isCurrentNodeInInline && isNextNodeInInline) {
      return editor.createPosition(node, maxOffset) // 현재 노드의 끝에 머무름
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

export function normalizePosition(editor: Editor, node: Node, offset: number): Position {
  if (!node) {
    return editor.createPosition(editor.document.firstChild!, 0)
  }

  let currentNode = node
  let currentOffset = offset

  while (true) {
    const maxOffset = getAfterOffset(currentNode)

    if (currentOffset >= 0 && currentOffset <= maxOffset) {
      const boundaryPosition = handleTextNodeBoundary(editor, currentNode, currentOffset, maxOffset)
      if (boundaryPosition) {
        return boundaryPosition
      }
      return editor.createPosition(currentNode, currentOffset)
    }

    const isForward = currentOffset > maxOffset
    const direction = isForward ? 'forward' : 'backward'
    const nextNode = findNextNode(editor, currentNode, direction)

    if (!nextNode) {
      return editor.createPosition(currentNode, isForward ? maxOffset : 0)
    }

    currentOffset = calculateNewOffset(currentOffset, maxOffset, currentNode, nextNode, isForward)
    currentNode = nextNode
  }
}
