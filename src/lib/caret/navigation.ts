import { createCaretWalker } from './walker'
import type { CaretPosition } from './types'

function getCaretPosition(node: Node, offset: number): CaretPosition {
  return { node, offset }
}

function isTextNode(node: Node): node is Text {
  return node.nodeType === Node.TEXT_NODE
}

/**
 * 주어진 위치(노드와 오프셋)에 대한 DOMRect 배열을 반환합니다.
 * 텍스트 노드의 경우 캐럿 위치를, 원자 요소의 경우 요소의 경계를 나타냅니다.
 * @param position - CaretPosition
 * @returns DOMRect 배열
 */
export function getRectsForPosition(position: CaretPosition): DOMRect[] {
  const { node, offset } = position
  const range = document.createRange()

  if (isTextNode(node)) {
    // 텍스트 노드 내 캐럿 위치
    range.setStart(node, offset)
    range.setEnd(node, offset)
    return Array.from(range.getClientRects())
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    // 원자 요소의 시작 또는 끝
    range.selectNode(node)
    const rect = range.getBoundingClientRect()
    // 높이가 너무 작으면 텍스트 줄 높이에 맞게 조정
    if (rect.height <= 16) {
      rect.y -= (16 - rect.height) / 2
      rect.height = 16
    }
    const targetRect = offset === 0 ? new DOMRect(rect.left, rect.y, 0, rect.height) : new DOMRect(rect.right, rect.y, 0, rect.height)
    return [targetRect]
  }

  return []
}

/**
 * 다음 캐럿 위치를 찾습니다.
 * @param root - 에디터의 루트 노드
 * @param currentPosition - 현재 캐럿 위치
 * @returns 다음 캐럿 위치 또는 null (마지막 위치일 경우)
 */
export function getNextCaretPosition(root: Node, currentPosition: CaretPosition): CaretPosition | null {
  const { node: currentNode, offset: currentOffset } = currentPosition
  const walker = createCaretWalker(root)
  walker.currentNode = currentNode

  // 현재 노드가 텍스트 노드인 경우
  if (isTextNode(currentNode)) {
    if (currentOffset < (currentNode.textContent?.length || 0)) {
      return getCaretPosition(currentNode, currentOffset + 1)
    }
  }

  // 현재 노드가 원자 요소인 경우
  if (currentNode.nodeType === Node.ELEMENT_NODE) {
    if (currentOffset === 0) {
      return getCaretPosition(currentNode, 1)
    }
  }

  // 다음 노드 탐색
  let nextNode = walker.nextNode()
  while (nextNode) {
    if (isTextNode(nextNode)) {
      return getCaretPosition(nextNode, 0)
    }
    if (nextNode.nodeType === Node.ELEMENT_NODE) {
      return getCaretPosition(nextNode, 0)
    }
    nextNode = walker.nextNode()
  }

  return null // 더 이상 다음 위치가 없음
}

/**
 * 이전 캐럿 위치를 찾습니다.
 * @param root - 에디터의 루트 노드
 * @param currentPosition - 현재 캐럿 위치
 * @returns 이전 캐럿 위치 또는 null (첫 위치일 경우)
 */
export function getPreviousCaretPosition(root: Node, currentPosition: CaretPosition): CaretPosition | null {
  const { node: currentNode, offset: currentOffset } = currentPosition
  const walker = createCaretWalker(root)
  walker.currentNode = currentNode

  // 현재 노드가 텍스트 노드인 경우
  if (isTextNode(currentNode)) {
    if (currentOffset > 0) {
      return getCaretPosition(currentNode, currentOffset - 1)
    }
  }

  // 현재 노드가 원자 요소인 경우
  if (currentNode.nodeType === Node.ELEMENT_NODE) {
    if (currentOffset === 1) {
      return getCaretPosition(currentNode, 0)
    }
  }

  // 이전 노드 탐색
  let prevNode = walker.previousNode()
  while (prevNode) {
    if (isTextNode(prevNode)) {
      return getCaretPosition(prevNode, prevNode.textContent?.length || 0)
    }
    if (prevNode.nodeType === Node.ELEMENT_NODE) {
      return getCaretPosition(prevNode, 1) // 끝 위치로
    }
    prevNode = walker.previousNode()
  }

  return null // 더 이상 이전 위치가 없음
}
