import { createCaretWalker } from '../walker'
import type { CaretPosition } from '../types'
import { isElementNode, isTextNode } from '../../nodes'

function getCaretPosition(node: Node, offset: number): CaretPosition {
  return { node, offset }
}

/**
 * 다음 캐럿 위치를 찾습니다.
 * @param root - 에디터의 루트 노드
 * @param currentPosition - 현재 캐럿 위치
 * @returns 다음 캐럿 위치 또는 null (마지막 위치일 경우)
 */
export function getNextCaretPosition(root: Node, currentPosition: CaretPosition): CaretPosition | null {
  const { node: currentNode, offset: currentOffset } = currentPosition

  // 현재 노드가 텍스트 노드인 경우
  if (isTextNode(currentNode) && currentOffset < (currentNode.textContent?.length || 0)) {
    return getCaretPosition(currentNode, currentOffset + 1)
  }

  // 현재 노드가 원자 요소인 경우
  if (isElementNode(currentNode) && currentOffset === 0) {
    return getCaretPosition(currentNode, 1)
  }

  const walker = createCaretWalker(root)
  walker.currentNode = currentNode
  const nextNode = isTextNode(currentNode) ? walker.nextNode() : walker.nextSibling()
  return nextNode ? getCaretPosition(nextNode, 0) : null
}

/**
 * 이전 캐럿 위치를 찾습니다.
 * @param root - 에디터의 루트 노드
 * @param currentPosition - 현재 캐럿 위치
 * @returns 이전 캐럿 위치 또는 null (첫 위치일 경우)
 */
export function getPreviousCaretPosition(root: Node, currentPosition: CaretPosition): CaretPosition | null {
  const { node: currentNode, offset: currentOffset } = currentPosition

  // 현재 노드가 텍스트 노드인 경우
  if (isTextNode(currentNode) && currentOffset > 0) {
    return getCaretPosition(currentNode, currentOffset - 1)
  }

  // 현재 노드가 원자 요소인 경우
  if (isElementNode(currentNode) && currentOffset === 1) {
    return getCaretPosition(currentNode, 0)
  }

  console.log('isTextNode(currentNode)', isTextNode(currentNode))

  const walker = createCaretWalker(root)
  walker.currentNode = currentNode

  const prevNode = isTextNode(currentNode) ? walker.previousNode() : walker.previousSibling()

  console.log('prevNode', prevNode)

  if (prevNode) {
    if (isTextNode(prevNode)) {
      return getCaretPosition(prevNode, prevNode.textContent?.length || 0)
    } else if (isElementNode(prevNode)) {
      return getCaretPosition(prevNode, 1)
    }
  }
  return null
}
