/**
 * 텍스트 선택 상태 관리 훅
 */

import { useState, useCallback } from 'react'
import type { CursorPosition } from '../types'
import type { StyledRect } from '../lib/selection'

export function useSelection() {
  // 커서/선택 상태: anchor는 선택 시작점, focus는 현재 활성 커서 위치
  const [anchorPosition, setAnchorPosition] = useState<CursorPosition | null>(null)
  const [focusPosition, setFocusPosition] = useState<CursorPosition | null>(null)
  
  // 선택 영역 UI를 위한 Rects 상태
  const [selectionRects, setSelectionRects] = useState<StyledRect[]>([])

  // 상/하 이동을 위한 목표 x좌표
  const [goalX, setGoalX] = useState<number | null>(null)

  // 마우스 드래그 상태
  const [isDragging, setIsDragging] = useState(false)

  // 커서 위치 업데이트 (선택 없이)
  const updateCursorPosition = useCallback((position: CursorPosition | null) => {
    setFocusPosition(position)
    setAnchorPosition(position)
    setGoalX(null)
  }, [])

  // 선택 영역 업데이트
  const updateSelection = useCallback((anchor: CursorPosition | null, focus: CursorPosition | null) => {
    setAnchorPosition(anchor)
    setFocusPosition(focus)
  }, [])

  // 드래그 시작
  const startDragging = useCallback((position: CursorPosition | null) => {
    setFocusPosition(position)
    setAnchorPosition(position)
    setIsDragging(true)
    setGoalX(null)
  }, [])

  // 드래그 중 포커스 업데이트
  const updateDragFocus = useCallback((position: CursorPosition | null) => {
    if (isDragging) {
      setFocusPosition(position)
    }
  }, [isDragging])

  // 드래그 종료
  const stopDragging = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Goal-X 설정
  const updateGoalX = useCallback((x: number | null) => {
    setGoalX(x)
  }, [])

  // 선택 영역 렌더링 박스 업데이트
  const updateSelectionRects = useCallback((rects: StyledRect[]) => {
    setSelectionRects(rects)
  }, [])

  return {
    // 상태
    anchorPosition,
    focusPosition,
    selectionRects,
    goalX,
    isDragging,
    
    // 액션
    updateCursorPosition,
    updateSelection,
    startDragging,
    updateDragFocus,
    stopDragging,
    updateGoalX,
    updateSelectionRects,
    
    // 직접 setter (필요한 경우)
    setAnchorPosition,
    setFocusPosition,
    setGoalX,
  }
}