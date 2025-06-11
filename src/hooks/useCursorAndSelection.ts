/**
 * 커서와 선택 영역 렌더링 상태 관리 훅
 */

import { useEffect } from 'react'
import type { CursorPosition } from '../types'
import type { StyledRect } from '../lib/selection'
import { arePositionsEqual } from '../lib/position'
import { calculateSelectionRects } from '../lib/selection'

interface UseCursorAndSelectionProps {
  anchorPosition: CursorPosition | null
  focusPosition: CursorPosition | null
  editorElement: HTMLDivElement | null
  updateSelectionRects: (rects: StyledRect[]) => void
}

export function useCursorAndSelection({
  anchorPosition,
  focusPosition,
  editorElement,
  updateSelectionRects,
}: UseCursorAndSelectionProps) {
  
  // 선택 상태 확인
  const isCollapsed = arePositionsEqual(anchorPosition, focusPosition)
  const hasValidPosition = !!focusPosition && !!editorElement
  
  // 커서 표시 여부
  const showCursor = hasValidPosition && isCollapsed
  
  // 선택 영역 표시 여부
  const showSelection = hasValidPosition && !isCollapsed

  // 선택 영역 렌더링 계산
  useEffect(() => {
    if (!showSelection || !anchorPosition || !focusPosition || !editorElement) {
      updateSelectionRects([])
      return
    }

    const editorRect = new DOMRect(
      Math.round(editorElement.getBoundingClientRect().left),
      Math.round(editorElement.getBoundingClientRect().top),
      Math.round(editorElement.getBoundingClientRect().width),
      Math.round(editorElement.getBoundingClientRect().height),
    )

    const finalStyledRects = calculateSelectionRects(anchorPosition, focusPosition, editorRect)
    updateSelectionRects(finalStyledRects)
  }, [showSelection, anchorPosition, focusPosition, editorElement, updateSelectionRects])

  // 선택이 없을 때는 선택 영역 초기화
  useEffect(() => {
    if (!showSelection) {
      updateSelectionRects([])
    }
  }, [showSelection, updateSelectionRects])

  return {
    showCursor,
    showSelection,
    isCollapsed,
  }
}