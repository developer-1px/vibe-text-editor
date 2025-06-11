/**
 * 마우스 이벤트 핸들러 관리 훅
 */

import { useCallback, useEffect, type RefObject } from 'react'
import type { CursorPosition } from '../types'
import { 
  isAtomicComponent, 
  findParentAtomicComponent, 
  findNearestBlock 
} from '../lib/nodes'
import { findPositionFromPoint } from '../lib/position'
import { getLastLogicalNode } from '../lib/navigation'
import { selectWord, selectBlock } from '../lib/selection'

interface UseMouseHandlersProps {
  editorRef: RefObject<HTMLDivElement | null>
  resetBlink: () => void
  updateCursorPosition: (position: CursorPosition | null) => void
  updateSelection: (anchor: CursorPosition | null, focus: CursorPosition | null) => void
  startDragging: (position: CursorPosition | null) => void
  updateDragFocus: (position: CursorPosition | null) => void
  stopDragging: () => void
  anchorPosition: CursorPosition | null
  isDragging: boolean
}

export function useMouseHandlers({
  editorRef,
  resetBlink,
  updateCursorPosition,
  updateSelection,
  startDragging,
  updateDragFocus,
  stopDragging,
  anchorPosition,
  isDragging,
}: UseMouseHandlersProps) {

  // 좌표로부터 텍스트 위치를 찾는 함수 (에디터 요소 전달)
  const findPositionFromPointInEditor = useCallback((clientX: number, clientY: number): CursorPosition | null => {
    if (!editorRef.current) return null
    return findPositionFromPoint(clientX, clientY, editorRef.current)
  }, [editorRef])

  // === 마우스 다운으로 드래그 시작 ===
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // 모든 클릭 유형에 대한 공통 설정
      resetBlink()

      // --- 원자 컴포넌트 클릭 처리 ---
      const atomicTarget = findParentAtomicComponent(e.target as HTMLElement)
      if (atomicTarget) {
        const rect = atomicTarget.getBoundingClientRect()
        // 클릭 위치가 요소의 중앙보다 왼쪽에 있으면 앞에, 아니면 뒤에 커서를 둔다.
        const isFirstHalf = e.clientX < rect.left + rect.width / 2
        const newPos = {
          node: atomicTarget,
          offset: isFirstHalf ? 0 : 1,
        }
        updateCursorPosition(newPos)
        return
      }

      // 클릭 좌표에서 정확한 커서 위치 찾기
      let initialPos = findPositionFromPointInEditor(e.clientX, e.clientY)

      // --- 빈 공간 클릭에 대한 폴백 로직 ---
      if (!initialPos) {
        const target = document.elementFromPoint(e.clientX, e.clientY)

        // 원자 컴포넌트 내부 클릭 시, 커서 로직을 중단하고 기본 동작에 맡김
        if (findParentAtomicComponent(target as HTMLElement)) {
          // contentEditable=true인 내부 요소에 포커스를 줘야 할 수 있음
          ;(target as HTMLElement).focus()
          return
        }

        const targetBlock = findNearestBlock(target as Node)
        if (targetBlock) {
          // atomic component인 경우 컴포넌트 끝에 커서를 위치
          if (isAtomicComponent(targetBlock)) {
            initialPos = {
              node: targetBlock,
              offset: 1, // atomic component의 끝
            }
          } else {
            // 일반 블록인 경우 기존 로직 사용
            const lastTextNode = getLastLogicalNode(targetBlock)
            if (lastTextNode) {
              initialPos = {
                node: lastTextNode,
                offset: lastTextNode.textContent?.length || 0,
              }
            }
          }
        }
      }
      // --- 폴백 로직 종료 ---

      if (!initialPos) return

      // 이전 작업으로 인한 드래그 상태 중지  
      stopDragging()

      const clickCount = e.detail

      switch (clickCount) {
        case 1: {
          // 싱글 클릭
          if (!e.shiftKey) {
            startDragging(initialPos)
          } else {
            updateSelection(anchorPosition, initialPos)
          }
          break
        }

        case 2: {
          // 더블 클릭 - 단어 선택
          e.preventDefault() // 기본 더블클릭 동작(단어 선택) 방지
          const wordSelection = selectWord(initialPos)
          if (wordSelection) {
            updateSelection(wordSelection.anchorPos, wordSelection.focusPos)
          }
          break
        }

        case 3: {
          // 트리플 클릭 - 블록 선택
          e.preventDefault() // 기본 트리플클릭 동작(문단 선택) 방지
          const blockSelection = selectBlock(initialPos)
          if (blockSelection) {
            updateSelection(blockSelection.startPos, blockSelection.endPos)
          }
          break
        }

        default:
          break
      }
    },
    [resetBlink, findPositionFromPointInEditor, updateCursorPosition, updateSelection, startDragging, stopDragging, anchorPosition],
  )

  // === 드래그 중 마우스 이동 처리 ===
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      // 드래그 중 기본 텍스트 선택 방지
      e.preventDefault()
      // 폴백이 없는 순수 함수를 호출. 실패하면(null) 아무것도 하지 않음.
      const newFocus = findPositionFromPointInEditor(e.clientX, e.clientY)
      if (newFocus) {
        updateDragFocus(newFocus)
      }
    }

    const handleMouseUp = () => {
      stopDragging()
    }

    // 전역 리스너 추가
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    // 드래그 중에는 페이지의 다른 텍스트가 선택되지 않도록 함
    document.body.style.userSelect = 'none'

    return () => {
      // 클린업
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = ''
    }
  }, [isDragging, findPositionFromPointInEditor, updateDragFocus, stopDragging])

  return {
    handleMouseDown,
  }
}