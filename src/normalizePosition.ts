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

export function normalizePosition(editor: Editor, node: Node, offset: number): Position {
  if (!node) {
    return editor.createPosition(editor.document.firstChild!, 0)
  }

  let currentNode = node
  let currentOffset = offset

  while (true) {
    const maxOffset = getAfterOffset(currentNode)

    if (currentOffset >= 0 && currentOffset <= maxOffset) {
      // 텍스트 노드의 끝 경계에서 인접 노드와의 관계 확인
      if (isTextNode(currentNode) && currentOffset === maxOffset) {
        const nextNode = findNextNode(editor, currentNode, 'forward')

        if (nextNode) {
          // text -> atomic-inline 경계 처리
          if (isAtomicComponent(nextNode) && !isBlockElement(nextNode)) {
            return editor.createPosition(nextNode, 0)
          }

          if (isTextNode(nextNode)) {
            const isCurrentInline = isTextNodeInInlineElement(currentNode)
            const isNextInline = isTextNodeInInlineElement(nextNode)

            // text -> inline: 다음 노드의 시작으로 자동 이동
            if (!isCurrentInline && isNextInline) {
              return editor.createPosition(nextNode, 0)
            }
            // mark -> mark: 현재 노드의 끝에 머무름 (자동 이동 방지)
            if (isCurrentInline && isNextInline) {
              return editor.createPosition(currentNode, maxOffset)
            }
          }
        }
      }
      // 유효한 위치이므로 반환
      return editor.createPosition(currentNode, currentOffset)
    }

    const isForward = currentOffset > maxOffset
    const direction = isForward ? 'forward' : 'backward'
    const nextNode = findNextNode(editor, currentNode, direction)

    if (!nextNode) {
      // 문서의 시작 또는 끝에 도달하면 경계에 머무름
      return editor.createPosition(currentNode, isForward ? maxOffset : 0)
    }

    if (isForward) {
      const isBlockToBlock =
        !isTextNodeInInlineElement(currentNode) && !isTextNodeInInlineElement(nextNode) && currentNode.parentNode !== nextNode.parentNode

      currentOffset -= maxOffset
      if (isBlockToBlock) {
        currentOffset -= 1
      }
    } else {
      currentOffset += getAfterOffset(nextNode)
    }
    currentNode = nextNode
  }
}
