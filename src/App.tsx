/*
  EDITOR CORE IMPLEMENTATION SPECIFICATIONS

  I. Cursor Movement (Completed)
    - Mouse Click:
      - [x] Moves cursor to the precise text location under the mouse pointer.
      - [x] (Fallback) If an empty area within a block is clicked, moves the cursor to the end of that block.
    - Arrow Keys (Left/Right):
      - [x] Moves the cursor one character at a time.
      - [x] Correctly traverses across different inline elements (e.g., from normal text into <b> tag).
    - Arrow Keys (Up/Down):
      - [x] Maintains the "Goal-X" coordinate when moving between lines of different lengths.
      - [x] (Fallback) Intelligently jumps over empty areas or large paddings to find the next available line, preventing the cursor from getting "stuck".

  II. Advanced Cursor Movement & Selection (In Progress)
    - [x] Home / End Keys: Move cursor to the start/end of the current visual line.
    - [x] Cmd/Ctrl + Arrow Keys:
      - [x] Left/Right: Move to start/end of the visual line (same as Home/End).
      - [x] Up/Down: Move to the very start/end of the editor content.
    - [x] Text Selection:
      - [x] Shift + Arrow Keys/Home/End/Cmd: Extend selection.
      - [x] Shift + Mouse Click: Extend selection from the current cursor position to the clicked point.
    - [x] Selection UI:
      - [x] Render a visual highlight for the selected text range.
      - [x] The highlight must correctly wrap across multiple lines.

  III. Text Editing (Future)
    - [ ] Character Input: Typing characters, numbers, symbols.
    - [ ] Deletion: Backspace and Delete keys.
    - [ ] Undo/Redo History.
*/

import React, { useRef, useEffect, useCallback } from 'react'
import './App.css'
import type { CursorPosition } from './types'
import DebugPanel from './components/DebugPanel'

// 모듈화된 함수들 import
import { STANDARD_LINE_HEIGHT } from './lib/constants'
import { 
  isAtomicComponent, 
  findParentAtomicComponent, 
  findNearestBlock 
} from './lib/nodes'
import { 
  arePositionsEqual, 
  findPositionFromPoint 
} from './lib/position'
import { getLastLogicalNode } from './lib/navigation'
import { 
  selectWord, 
  selectBlock, 
  calculateSelectionRects 
} from './lib/selection'

// 훅 import
import { useCursor } from './hooks/useCursor'
import { useSelection } from './hooks/useSelection'
import { useKeyboardHandlers } from './hooks/useKeyboardHandlers'


function App() {
  const editorRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)

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
  const { hotkeyHandler, getRectForPosition } = useKeyboardHandlers({
    focusPosition,
    anchorPosition,
    goalX,
    editorRef,
    resetBlink,
    updateSelection,
    setGoalX,
  })

  // 좌표로부터 텍스트 위치를 찾는 함수 (에디터 요소 전달)
  const findPositionFromPointInEditor = useCallback((clientX: number, clientY: number): CursorPosition | null => {
    if (!editorRef.current) return null
    return findPositionFromPoint(clientX, clientY, editorRef.current)
  }, [])

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
    [resetBlink, findPositionFromPointInEditor],
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

  // === 커서 및 선택 범위 렌더링 ===
  useEffect(() => {
    if (!focusPosition || !editorRef.current) {
      if (cursorRef.current) cursorRef.current.style.display = 'none'
      updateSelectionRects([])
      return
    }

    const isCollapsed = arePositionsEqual(anchorPosition, focusPosition)

    // 1. 선택이 없는 경우: 커서 렌더링
    if (isCollapsed) {
      updateSelectionRects([])
      if (cursorRef.current) {
        const rect = getRectForPosition(focusPosition)
        if (rect) {
          const editorRect = editorRef.current.getBoundingClientRect()

          // 계산과 반올림을 미리 수행
          const top = Math.round(rect.top - editorRect.top)
          const left = Math.round(rect.left - editorRect.left)
          const originalHeight = Math.round(rect.height)

          // 커서의 최소 높이를 보장하고, 세로 중앙 정렬
          const finalHeight = Math.max(originalHeight, STANDARD_LINE_HEIGHT)
          const finalTop = top - (finalHeight - originalHeight) / 2

          cursorRef.current.style.top = `${finalTop}px`
          cursorRef.current.style.left = `${left}px`
          cursorRef.current.style.height = `${finalHeight}px`
          cursorRef.current.style.display = 'block'
          cursorRef.current.scrollIntoView({
            block: 'nearest',
            inline: 'nearest',
          })
        }
      }
      return
    }

    // 2. 선택이 있는 경우: 선택 영역 렌더링
    if (cursorRef.current) cursorRef.current.style.display = 'none'
    if (!anchorPosition || !focusPosition) return

    const editorRect = new DOMRect(
      Math.round(editorRef.current.getBoundingClientRect().left),
      Math.round(editorRef.current.getBoundingClientRect().top),
      Math.round(editorRef.current.getBoundingClientRect().width),
      Math.round(editorRef.current.getBoundingClientRect().height),
    )

    const finalStyledRects = calculateSelectionRects(anchorPosition, focusPosition, editorRect)
    updateSelectionRects(finalStyledRects)
  }, [anchorPosition, focusPosition, getRectForPosition, updateSelectionRects])

  return (
    <div className="container">
      <div ref={editorRef} className="editor" onMouseDown={handleMouseDown} onKeyDown={hotkeyHandler} tabIndex={0}>
        <section style={{ display: 'contents' }}>
          <div ref={cursorRef} className={`custom-cursor ${isBlinking ? 'blinking' : ''}`} />
          {/* 선택 영역 렌더링 */}
          {selectionRects.map((rect, i) => (
            <div
              key={i}
              className="selection-rect"
              style={{
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
              }}
            />
          ))}
        </section>

        {/* --- 적당히 복잡한 리치 텍스트 예시 --- */}
        <h2>Welcome to the Demo</h2>
        <p>
          This is a demonstration of a custom cursor implementation. It uses a <b>non-contenteditable</b> div. You can click anywhere on
          this text.
        </p>
        <blockquote>
          The cursor you see is a simple <code>&lt;div&gt;</code> element, positioned absolutely based on calculations using{' '}
          <i>`document.caretPositionFromPoint`</i>.
        </blockquote>
        <ul>
          <li>List item one. Try navigating from here.</li>
          <li>
            Another list item, with some <code>inline code</code>.
          </li>
          <li>Final item in this list. Notice how the cursor height adapts to the line height.</li>
        </ul>
        <p>
          The goal is to provide a solid foundation for building a markdown editor where the view is a direct reflection of the model,
          without the quirks of <code>contenteditable</code>.
        </p>
        <pre>
          <code>
            {`function helloWorld() {
  console.log("Hello, developer!");
}`}
          </code>
        </pre>
        <p>
          You can move the cursor with <b>Arrow Keys</b>. The up and down arrow keys try to maintain the horizontal position (Goal-X).
          Thanks to <span className="atomic-component mention blue">@john_doe</span> for the feedback on cursor navigation!
        </p>

        <hr className="atomic-component" />

        <h3>Advanced Content</h3>
        <p>
          This section includes more complex structures like tables and layouts. Shout out to{' '}
          <span className="atomic-component mention purple">@alice_dev</span> and{' '}
          <span className="atomic-component mention green">@bob_designer</span> for their contributions!
        </p>

        <table className="atomic-component">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>In Stock</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Laptop Pro</td>
              <td>Electronics</td>
              <td>$1499.99</td>
              <td>
                <b>Yes</b>
              </td>
            </tr>
            <tr>
              <td>Coffee Mug</td>
              <td>Kitchenware</td>
              <td>$12.50</td>
              <td>Yes</td>
            </tr>
            <tr>
              <td>Running Shoes</td>
              <td>Apparel</td>
              <td>$89.90</td>
              <td>
                <i>No</i>
              </td>
            </tr>
          </tbody>
        </table>

        <p>adlkfajsdk fljdsa klfsjkljdas</p>

        <p>adlkfajsdk fljdsa klfsjkljdas</p>
        <p>adlkfajsdk fljdsa klfsjkljdas</p>
        {/* <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
          <div style={{ flex: 1, border: '1px solid #ccc', padding: '10px' }}>
            <h4>Column One</h4>
            <p>This is the first column of a two-column layout. You should be able to navigate within this text block seamlessly.</p>
          </div>
          <div style={{ flex: 1, border: '1px solid #ccc', padding: '10px' }}>
            <h4>Column Two</h4>
            <p>And this is the second column. Try moving the cursor between the columns using the up and down arrow keys.</p>
          </div>
        </div> */}
      </div>
      <DebugPanel
        anchor={anchorPosition}
        focus={focusPosition}
        goalX={goalX}
        isDragging={isDragging}
        isBlinking={isBlinking}
        selectionRects={selectionRects}
      />
    </div>
  )
}

export default App
