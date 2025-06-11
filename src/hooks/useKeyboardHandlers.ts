/**
 * 키보드 이벤트 핸들러 관리 훅
 */

import { useMemo, useCallback, type RefObject } from 'react'
import type { CursorPosition } from '../types'
import type { HotkeyConfig } from '../lib/types'
import { createHotkeyHandler } from '../lib/hotkeys'
import { arePositionsEqual, getPositionRect } from '../lib/position'
import { moveLeft, moveRight, getFirstLogicalNode, getLastLogicalNode } from '../lib/navigation'
import { handleVerticalMovement } from '../lib/vertical-movement'
import { selectAll } from '../lib/selection'

interface UseKeyboardHandlersProps {
  focusPosition: CursorPosition | null
  anchorPosition: CursorPosition | null
  goalX: number | null
  editorRef: RefObject<HTMLDivElement | null>
  resetBlink: () => void
  updateSelection: (anchor: CursorPosition | null, focus: CursorPosition | null) => void
  setGoalX: (x: number | null) => void
}

export function useKeyboardHandlers({
  focusPosition,
  anchorPosition,
  goalX,
  editorRef,
  resetBlink,
  updateSelection,
  setGoalX,
}: UseKeyboardHandlersProps) {
  
  // 커서의 위치(Position)에 대한 화면 좌표(Rect)를 얻는 헬퍼 함수
  const getRectForPosition = useCallback((pos: CursorPosition): DOMRect | null => {
    if (!editorRef.current) return null
    return getPositionRect(pos)
  }, [editorRef])

  // 키보드 핸들러 설정
  const hotkeyConfigs = useMemo<HotkeyConfig[]>(() => {
    if (!focusPosition) return []

    // 커서 이동 로직의 핵심 헬퍼 함수
    const moveFocus = (newPosition: CursorPosition | null, event: KeyboardEvent, options: { keepGoalX?: boolean } = {}) => {
      if (!newPosition) return

      resetBlink()

      // Shift를 누르고 선택을 시작하는 경우, 현재 위치를 앵커로 고정
      if (event.shiftKey && arePositionsEqual(anchorPosition, focusPosition)) {
        updateSelection(focusPosition, newPosition)
      } else {
        // 포커스(활성 커서) 위치는 항상 업데이트
        const newAnchor = event.shiftKey ? anchorPosition : newPosition
        updateSelection(newAnchor, newPosition)
      }

      // 상하 이동이 아닐 경우 goalX 초기화
      if (!options.keepGoalX) {
        setGoalX(null)
      }
    }

    // --- 재사용 가능한 핸들러들 ---

    const handleArrowLeft = (e: KeyboardEvent) => {
      const hasSelection = !e.shiftKey && !arePositionsEqual(anchorPosition, focusPosition)
      const newPosition = moveLeft(focusPosition, anchorPosition, editorRef.current!, hasSelection)
      moveFocus(newPosition, e)
    }

    const handleArrowRight = (e: KeyboardEvent) => {
      const hasSelection = !e.shiftKey && !arePositionsEqual(anchorPosition, focusPosition)
      const newPosition = moveRight(focusPosition, anchorPosition, editorRef.current!, hasSelection)
      moveFocus(newPosition, e)
    }

    const handleVerticalMove = (e: KeyboardEvent, direction: 'up' | 'down') => {
      const currentRect = getRectForPosition(focusPosition)
      if (!currentRect || !editorRef.current) return

      const targetX = goalX ?? currentRect.left
      if (goalX === null) setGoalX(targetX)

      const newPosition = handleVerticalMovement(direction, focusPosition, currentRect, targetX, editorRef.current)
      moveFocus(newPosition, e, { keepGoalX: true })
    }

    const handleMoveToLineBoundary = (e: KeyboardEvent, boundary: 'start' | 'end') => {
      const rect = getRectForPosition(focusPosition)
      if (!rect || !editorRef.current) return

      const editorRect = editorRef.current.getBoundingClientRect()
      const targetX = boundary === 'start' ? editorRect.left + 1 : editorRect.right - 1
      const pos = document.caretPositionFromPoint(targetX, rect.top)
      if (pos) moveFocus({ node: pos.offsetNode, offset: pos.offset }, e)
    }

    const handleMoveToEditorBoundary = (e: KeyboardEvent, boundary: 'start' | 'end') => {
      if (!editorRef.current) return
      
      const targetNode = boundary === 'start' ? getFirstLogicalNode(editorRef.current) : getLastLogicalNode(editorRef.current)

      if (targetNode) {
        let offset: number
        if (targetNode.nodeType === Node.ELEMENT_NODE) {
          // atomic component인 경우
          offset = boundary === 'start' ? 0 : 1
        } else {
          // 텍스트 노드인 경우
          offset = boundary === 'start' ? 0 : targetNode.textContent?.length || 0
        }
        moveFocus({ node: targetNode, offset }, e)
      }
    }

    const handleSelectAll = () => {
      if (!editorRef.current) return

      resetBlink()

      const allSelection = selectAll(editorRef.current)
      if (allSelection) {
        updateSelection(allSelection.startPos, allSelection.endPos)
        setGoalX(null)
      }
    }

    // --- 단축키 설정 ---
    return [
      // 모두 선택
      { hotkey: 'Mod+A', handler: handleSelectAll },

      // 기본 이동
      { hotkey: 'ArrowLeft', handler: handleArrowLeft },
      { hotkey: 'ArrowRight', handler: handleArrowRight },
      { hotkey: 'ArrowUp', handler: (e) => handleVerticalMove(e, 'up') },
      { hotkey: 'ArrowDown', handler: (e) => handleVerticalMove(e, 'down') },

      // 선택 확장
      { hotkey: 'Shift+ArrowLeft', handler: handleArrowLeft },
      { hotkey: 'Shift+ArrowRight', handler: handleArrowRight },
      { hotkey: 'Shift+ArrowUp', handler: (e) => handleVerticalMove(e, 'up') },
      { hotkey: 'Shift+ArrowDown', handler: (e) => handleVerticalMove(e, 'down') },

      // 줄 경계 이동
      { hotkey: 'Home', handler: (e) => handleMoveToLineBoundary(e, 'start') },
      { hotkey: 'End', handler: (e) => handleMoveToLineBoundary(e, 'end') },
      { hotkey: 'Shift+Home', handler: (e) => handleMoveToLineBoundary(e, 'start') },
      { hotkey: 'Shift+End', handler: (e) => handleMoveToLineBoundary(e, 'end') },

      // Mod(Cmd/Ctrl) 조합
      { hotkey: 'Mod+ArrowLeft', handler: (e) => handleMoveToLineBoundary(e, 'start') },
      { hotkey: 'Mod+ArrowRight', handler: (e) => handleMoveToLineBoundary(e, 'end') },
      { hotkey: 'Mod+ArrowUp', handler: (e) => handleMoveToEditorBoundary(e, 'start') },
      { hotkey: 'Mod+ArrowDown', handler: (e) => handleMoveToEditorBoundary(e, 'end') },

      // Mod + Shift 조합 (선택)
      { hotkey: 'Mod+Shift+ArrowLeft', handler: (e) => handleMoveToLineBoundary(e, 'start') },
      { hotkey: 'Mod+Shift+ArrowRight', handler: (e) => handleMoveToLineBoundary(e, 'end') },
      { hotkey: 'Mod+Shift+ArrowUp', handler: (e) => handleMoveToEditorBoundary(e, 'start') },
      { hotkey: 'Mod+Shift+ArrowDown', handler: (e) => handleMoveToEditorBoundary(e, 'end') },
    ]
  }, [focusPosition, anchorPosition, goalX, resetBlink, updateSelection, setGoalX, getRectForPosition, editorRef])

  const hotkeyHandler = useMemo(() => createHotkeyHandler(hotkeyConfigs), [hotkeyConfigs])

  return {
    hotkeyHandler,
    getRectForPosition,
  }
}