/**
 * 텍스트 선택 영역 관련 로직
 */

import type { CursorPosition } from '../types'
import { arePositionsEqual, getPositionRect } from './position'
import { findNearestBlock, isElementNode } from './nodes'
import { getFirstLogicalNode, getLastLogicalNode } from './navigation'

export interface StyledRect {
  top: number
  left: number
  width: number
  height: number
}

/**
 * 선택 영역의 시작과 끝을 계산하는 함수 (재export)
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
 * 단어 선택을 위한 브라우저 API 활용
 */
export function selectWord(initialPos: CursorPosition): { anchorPos: CursorPosition; focusPos: CursorPosition } | null {
  const selection = window.getSelection()
  if (!selection) return null

  // 브라우저의 선택 메커니즘을 사용하여 단어 경계 찾기
  const range = document.createRange()
  range.setStart(initialPos.node, initialPos.offset)
  selection.removeAllRanges()
  selection.addRange(range)
  selection.modify('move', 'backward', 'word')
  selection.modify('extend', 'forward', 'word')

  // 새로운 경계 추출
  if (selection.anchorNode && selection.focusNode) {
    const anchorPos = { node: selection.anchorNode, offset: selection.anchorOffset }
    const focusPos = { node: selection.focusNode, offset: selection.focusOffset }
    return { anchorPos, focusPos }
  }

  return null
}

/**
 * 블록 선택 로직
 */
export function selectBlock(initialPos: CursorPosition): { startPos: CursorPosition; endPos: CursorPosition } | null {
  const block = findNearestBlock(initialPos.node)
  if (!block) return null

  const firstNode = getFirstLogicalNode(block)
  const lastNode = getLastLogicalNode(block)

  if (!firstNode || !lastNode) return null

  const startPos = { node: firstNode, offset: 0 }
  let endOffset: number
  if (isElementNode(lastNode)) {
    // 마지막이 atomic component인 경우
    endOffset = 1
  } else {
    // 마지막이 텍스트 노드인 경우
    endOffset = lastNode.textContent?.length || 0
  }
  const endPos = { node: lastNode, offset: endOffset }

  return { startPos, endPos }
}

/**
 * 전체 선택 로직
 */
export function selectAll(editorElement: HTMLElement): { startPos: CursorPosition; endPos: CursorPosition } | null {
  const firstNode = getFirstLogicalNode(editorElement)
  const lastNode = getLastLogicalNode(editorElement)

  if (!firstNode || !lastNode) return null

  const startPos: CursorPosition = { node: firstNode, offset: 0 }
  let endOffset: number
  if (isElementNode(lastNode)) {
    // 마지막이 atomic component인 경우
    endOffset = 1
  } else {
    // 마지막이 텍스트 노드인 경우
    endOffset = lastNode.textContent?.length || 0
  }
  const endPos: CursorPosition = { node: lastNode, offset: endOffset }

  return { startPos, endPos }
}

/**
 * 선택 영역 렌더링을 위한 Rect 계산
 */
export function calculateSelectionRects(
  anchorPosition: CursorPosition,
  focusPosition: CursorPosition,
  editorRect: DOMRect
): StyledRect[] {
  const anchorRect = getPositionRect(anchorPosition)
  const focusRect = getPositionRect(focusPosition)

  if (!anchorRect || !focusRect) return []

  const comparison = anchorPosition.node.compareDocumentPosition(focusPosition.node)
  const isAnchorFirst =
    comparison & Node.DOCUMENT_POSITION_FOLLOWING || (comparison === 0 && anchorPosition.offset <= focusPosition.offset)

  const startRect = isAnchorFirst ? anchorRect : focusRect
  const endRect = isAnchorFirst ? focusRect : anchorRect

  const finalRects: DOMRect[] = []

  // y좌표를 비교하여 같은 줄인지 확인
  if (Math.abs(startRect.top - endRect.top) < startRect.height) {
    // 경우 1: 한 줄 선택
    finalRects.push(new DOMRect(startRect.left, startRect.top, endRect.right - startRect.left, startRect.height))
  } else {
    // 경우 2: 여러 줄 선택
    // 1. 첫 번째 줄 박스
    finalRects.push(new DOMRect(startRect.left, startRect.top, editorRect.right - startRect.left, startRect.height))

    // 2. 중간 박스 (첫 줄과 마지막 줄 사이를 채움)
    const middleTop = startRect.bottom
    const middleBottom = endRect.top

    if (middleBottom > middleTop) {
      finalRects.push(new DOMRect(editorRect.left, middleTop, editorRect.width, middleBottom - middleTop))
    }

    // 3. 마지막 줄 박스
    finalRects.push(new DOMRect(editorRect.left, endRect.top, endRect.right - editorRect.left, endRect.height))
  }

  // 최종 렌더링을 위한 스타일 객체로 변환
  return finalRects.map((rect) => ({
    top: rect.top - editorRect.top,
    left: rect.left - editorRect.left,
    width: rect.width,
    height: rect.height,
  }))
}