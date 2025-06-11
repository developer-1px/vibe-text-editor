/**
 * 커서 위치 관련 계산 함수들
 */

import type { CursorPosition } from '../types'
import { isElementNode, isTextNode } from './nodes'

/**
 * 두 커서 위치가 같은지 비교하는 함수
 */
export function arePositionsEqual(pos1: CursorPosition | null, pos2: CursorPosition | null): boolean {
  if (!pos1 || !pos2) return false
  return pos1.node === pos2.node && pos1.offset === pos2.offset
}

/**
 * 선택 영역의 시작과 끝을 계산하는 함수
 */
export function getSelectionBoundary(
  anchorPosition: CursorPosition | null,
  focusPosition: CursorPosition | null,
): { start: CursorPosition; end: CursorPosition } | null {
  if (!anchorPosition || !focusPosition || arePositionsEqual(anchorPosition, focusPosition)) {
    return null
  }

  const comparison = anchorPosition.node.compareDocumentPosition(focusPosition.node)
  const isAnchorFirst = comparison & Node.DOCUMENT_POSITION_FOLLOWING || (comparison === 0 && anchorPosition.offset <= focusPosition.offset)

  return {
    start: isAnchorFirst ? anchorPosition : focusPosition,
    end: isAnchorFirst ? focusPosition : anchorPosition,
  }
}

/**
 * 커서 위치로부터 화면 좌표를 계산하는 함수
 */
export function getPositionRect(pos: CursorPosition): DOMRect | null {
  // "원자" 컴포넌트를 처리
  if (isElementNode(pos.node)) {
    const elementRect = (pos.node as HTMLElement).getBoundingClientRect()
    // offset이 0이면 요소의 시작, 1이면 요소의 끝에 커서를 위치시킨다.
    const x = pos.offset === 0 ? elementRect.left : elementRect.right
    return new DOMRect(
      Math.round(x),
      Math.round(elementRect.top),
      0, // 커서이므로 너비는 0
      Math.round(elementRect.height),
    )
  }

  // 기존의 텍스트 노드 처리
  const range = document.createRange()
  try {
    const offset = Math.min(pos.offset, pos.node.textContent?.length || 0)
    range.setStart(pos.node, offset)
    range.collapse(true)
    const rect = range.getBoundingClientRect()
    // 계산의 시작점에서부터 모든 값을 정수로 만듦
    return new DOMRect(Math.round(rect.left), Math.round(rect.top), Math.round(rect.width), Math.round(rect.height))
  } catch (e) {
    console.error('Error getting rect for position:', e)
    return null
  }
}

/**
 * 좌표로부터 텍스트 위치를 찾는 함수 (폴백 없음)
 */
export function findPositionFromPoint(clientX: number, clientY: number, editorElement: HTMLElement): CursorPosition | null {
  const position = document.caretPositionFromPoint(clientX, clientY)
  if (position && isTextNode(position.offsetNode) && editorElement.contains(position.offsetNode)) {
    return { node: position.offsetNode, offset: position.offset }
  }
  return null
}