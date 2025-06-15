import { isTextNode } from '../nodes'
import type { CaretPosition } from './types'

/**
 * 주어진 위치(노드와 오프셋)에 대한 DOMRect 배열을 반환합니다.
 * 텍스트 노드의 경우 캐럿 위치를, 원자 요소의 경우 요소의 경계를 나타냅니다.
 * @param position - CaretPosition
 * @returns DOMRect 배열
 */
/**
 * Find cursor position from a point in the document
 */
export function findPositionFromPoint(clientX: number, clientY: number, container: HTMLElement): CaretPosition | null {
  if (!document.caretPositionFromPoint) {
    return null
  }

  const caretPosition = document.caretPositionFromPoint(clientX, clientY)
  if (!caretPosition) {
    return null
  }

  // Check if the position is within the container
  if (!container.contains(caretPosition.offsetNode)) {
    return null
  }

  return {
    node: caretPosition.offsetNode,
    offset: caretPosition.offset,
  }
}

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
