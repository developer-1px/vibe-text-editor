/**
 * 메인 에디터 컴포넌트
 */

import React, { useRef } from 'react'

// 훅 import
import { useCursor } from '../../hooks/useCursor'
import { useCursorAndSelection } from '../../hooks/useCursorAndSelection'
import { useKeyboardHandlers } from '../../hooks/useKeyboardHandlers'
import { useSelection } from '../../hooks/useSelection'

// 컴포넌트 import
import { Cursor } from './Cursor'
import { SelectionHighlight } from './SelectionHighlight'

// 모듈 import

// 마우스 이벤트 핸들러 훅
import { useMouseHandlers } from '../../hooks/useMouseHandlers'

interface EditorProps {
  children: React.ReactNode
  className?: string
}

export function Editor({ children, className = 'editor' }: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)

  // 커서 관련 훅
  const { isBlinking, resetBlink } = useCursor()

  // 선택 영역 관리 훅
  const {
    anchorPosition,
    focusPosition,
    selectionRects,
    goalX,
    isDragging,
    updateCursorPosition,
    updateSelection,
    startDragging,
    updateDragFocus,
    stopDragging,
    updateSelectionRects,
    setGoalX,
  } = useSelection()

  // 키보드 핸들러 훅
  const { hotkeyHandler } = useKeyboardHandlers({
    focusPosition,
    anchorPosition,
    goalX,
    editorRef,
    resetBlink,
    updateSelection,
    setGoalX,
  })

  // 커서와 선택 영역 렌더링 상태 관리
  const { showCursor, showSelection } = useCursorAndSelection({
    anchorPosition,
    focusPosition,
    editorElement: editorRef.current,
    updateSelectionRects,
  })

  // 마우스 이벤트 핸들러
  const { handleMouseDown } = useMouseHandlers({
    editorRef,
    resetBlink,
    updateCursorPosition,
    updateSelection,
    startDragging,
    updateDragFocus,
    stopDragging,
    anchorPosition,
    isDragging,
  })

  return (
    <div ref={editorRef} className={className} onMouseDown={handleMouseDown} onKeyDown={hotkeyHandler} tabIndex={0}>
      <section style={{ display: 'contents' }}>
        <Cursor position={focusPosition} isVisible={showCursor} isBlinking={isBlinking} editorElement={editorRef.current} />

        <SelectionHighlight selectionRects={selectionRects} />
      </section>

      {children}
    </div>
  )
}
