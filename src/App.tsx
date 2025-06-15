import React, { useRef, useEffect, useCallback } from 'react'
import { useSelection } from './hooks/useSelection'
import { useCursor } from './hooks/useCursor'
import { createHotkeyHandler } from './lib/hotkeys'
import { findPositionFromPoint } from './lib/caret/position'
import { isAtomicComponent, findParentAtomicComponent, findNearestBlock } from './lib/nodes'
import { getLastLogicalNode } from './lib/caret/navigation'
import { CaretPosition } from './lib/caret/CaretPosition'
import type { CursorPosition } from './types'

import './App.css'

function App() {
  const editorRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)

  // Use enhanced selection hook
  const {
    anchorPosition,
    focusPosition,
    selectionRects,
    isDragging,
    selection,
    // updateCursorPosition, // Not used in this test
    updateSelection,
    startDragging,
    updateDragFocus,
    stopDragging,
    updateSelectionRects,
    moveSelectionBy,
    extendSelectionBy,
    getSelectionDirection,
    getSelectionText,
    calculateSelectionRects,
    collapseSelection,
  } = useSelection()

  // Cursor blinking
  const { isBlinking, resetBlink } = useCursor()

  // Find position from point within editor
  const findPositionFromPointInEditor = useCallback((clientX: number, clientY: number): CursorPosition | null => {
    if (!editorRef.current) return null
    return findPositionFromPoint(clientX, clientY, editorRef.current)
  }, [])

  // Navigation functions
  const navigateCharacter = useCallback(
    (direction: 'forward' | 'backward', extend: boolean = false) => {
      if (!editorRef.current) return

      resetBlink()
      if (extend && extendSelectionBy) {
        extendSelectionBy(editorRef.current, direction, 'character', editorRef.current)
      } else if (!extend && moveSelectionBy) {
        moveSelectionBy(editorRef.current, direction, 'character', editorRef.current)
      }
    },
    [extendSelectionBy, moveSelectionBy, resetBlink],
  )

  const navigateLine = useCallback(
    (direction: 'forward' | 'backward', extend: boolean = false) => {
      if (!editorRef.current) return

      resetBlink()
      if (extend && extendSelectionBy) {
        extendSelectionBy(editorRef.current, direction, 'line', editorRef.current)
      } else if (!extend && moveSelectionBy) {
        moveSelectionBy(editorRef.current, direction, 'line', editorRef.current)
      }
    },
    [extendSelectionBy, moveSelectionBy, resetBlink],
  )

  const navigateLineBoundary = useCallback(
    (direction: 'forward' | 'backward', extend: boolean = false) => {
      if (!editorRef.current) return

      resetBlink()
      if (extend && extendSelectionBy) {
        extendSelectionBy(editorRef.current, direction, 'lineboundary', editorRef.current)
      } else if (!extend && moveSelectionBy) {
        moveSelectionBy(editorRef.current, direction, 'lineboundary', editorRef.current)
      }
    },
    [extendSelectionBy, moveSelectionBy, resetBlink],
  )

  const navigateDocumentBoundary = useCallback(
    (direction: 'forward' | 'backward', extend: boolean = false) => {
      if (!editorRef.current) return

      resetBlink()
      if (extend && extendSelectionBy) {
        extendSelectionBy(editorRef.current, direction, 'documentboundary', editorRef.current)
      } else if (!extend && moveSelectionBy) {
        moveSelectionBy(editorRef.current, direction, 'documentboundary', editorRef.current)
      }
    },
    [extendSelectionBy, moveSelectionBy, resetBlink],
  )

  // Keyboard handler
  const hotkeyHandler = useCallback(
    createHotkeyHandler([
      // Character movement
      { hotkey: 'ArrowLeft', handler: () => navigateCharacter('backward') },
      { hotkey: 'ArrowRight', handler: () => navigateCharacter('forward') },
      { hotkey: 'Shift+ArrowLeft', handler: () => navigateCharacter('backward', true) },
      { hotkey: 'Shift+ArrowRight', handler: () => navigateCharacter('forward', true) },

      // Line movement
      { hotkey: 'ArrowUp', handler: () => navigateLine('backward') },
      { hotkey: 'ArrowDown', handler: () => navigateLine('forward') },
      { hotkey: 'Shift+ArrowUp', handler: () => navigateLine('backward', true) },
      { hotkey: 'Shift+ArrowDown', handler: () => navigateLine('forward', true) },

      // Line boundary movement
      { hotkey: 'Home', handler: () => navigateLineBoundary('backward') },
      { hotkey: 'End', handler: () => navigateLineBoundary('forward') },
      { hotkey: 'Shift+Home', handler: () => navigateLineBoundary('backward', true) },
      { hotkey: 'Shift+End', handler: () => navigateLineBoundary('forward', true) },

      // Cmd/Ctrl + Arrow combinations
      { hotkey: 'mod+ArrowLeft', handler: () => navigateLineBoundary('backward') },
      { hotkey: 'mod+ArrowRight', handler: () => navigateLineBoundary('forward') },
      { hotkey: 'mod+Shift+ArrowLeft', handler: () => navigateLineBoundary('backward', true) },
      { hotkey: 'mod+Shift+ArrowRight', handler: () => navigateLineBoundary('forward', true) },
      { hotkey: 'mod+ArrowUp', handler: () => navigateDocumentBoundary('backward') },
      { hotkey: 'mod+ArrowDown', handler: () => navigateDocumentBoundary('forward') },
      { hotkey: 'mod+Shift+ArrowUp', handler: () => navigateDocumentBoundary('backward', true) },
      { hotkey: 'mod+Shift+ArrowDown', handler: () => navigateDocumentBoundary('forward', true) },

      // Selection shortcuts
      {
        hotkey: 'mod+a',
        handler: () => {
          if (!editorRef.current) return
          const start = CaretPosition.documentStart(editorRef.current)
          const end = CaretPosition.documentEnd(editorRef.current)
          if (start && end) {
            updateSelection(start, end)
            resetBlink()
          }
        },
      },

      // Collapse selection
      {
        hotkey: 'Escape',
        handler: () => {
          if (selection && !selection.isCollapsed()) {
            collapseSelection(false) // Collapse to end
            resetBlink()
          }
        },
      },
    ]),
    [
      navigateCharacter,
      navigateLine,
      navigateLineBoundary,
      navigateDocumentBoundary,
      selection,
      updateSelection,
      collapseSelection,
      resetBlink,
      editorRef,
    ],
  )

  // Mouse down handler
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
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
        updateSelection(newPos, newPos) // Use updateSelection for consistency
        return
      }

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

      stopDragging()

      const clickCount = e.detail

      switch (clickCount) {
        case 1: {
          // Single click
          if (!e.shiftKey) {
            startDragging(initialPos)
          } else {
            // Shift+click extends selection
            updateSelection(anchorPosition, initialPos)
          }
          break
        }

        case 2: {
          // Double click - select word
          e.preventDefault()
          const caretPos = new CaretPosition(initialPos.node, initialPos.offset)
          if (caretPos.node.nodeType === Node.TEXT_NODE) {
            const textNode = caretPos.node as Text
            const text = textNode.textContent || ''
            const offset = caretPos.offset

            // Simple word boundary detection
            let start = offset
            let end = offset

            // Find start of word
            while (start > 0 && /\w/.test(text[start - 1])) {
              start--
            }

            // Find end of word
            while (end < text.length && /\w/.test(text[end])) {
              end++
            }

            updateSelection({ node: textNode, offset: start }, { node: textNode, offset: end })
          }
          break
        }

        case 3: {
          // Triple click - select line/paragraph
          e.preventDefault()

          // Find the nearest block element
          let currentNode = initialPos.node
          let blockElement: Element | null = null

          while (currentNode && currentNode !== editorRef.current) {
            if (currentNode.nodeType === Node.ELEMENT_NODE) {
              const element = currentNode as Element
              if (element.tagName.match(/^(P|DIV|H[1-6]|BLOCKQUOTE|LI)$/)) {
                blockElement = element
                break
              }
            }
            currentNode = currentNode.parentNode as Node
          }

          if (blockElement) {
            // Select entire block
            const start = CaretPosition.documentStart(blockElement)
            const end = CaretPosition.documentEnd(blockElement)
            if (start && end) {
              updateSelection(start, end)
            }
          }
          break
        }
      }
    },
    [resetBlink, findPositionFromPointInEditor, stopDragging, startDragging, anchorPosition, updateSelection],
  )

  // Mouse move during drag
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault()
      const newFocus = findPositionFromPointInEditor(e.clientX, e.clientY)
      if (newFocus) {
        updateDragFocus(newFocus)
      }
    }

    const handleMouseUp = () => {
      stopDragging()
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    document.body.style.userSelect = 'none'

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = ''
    }
  }, [isDragging, findPositionFromPointInEditor, updateDragFocus, stopDragging])

  // Cursor and selection rendering
  useEffect(() => {
    if (!focusPosition || !editorRef.current) {
      if (cursorRef.current) cursorRef.current.style.display = 'none'
      updateSelectionRects([])
      return
    }

    const isCollapsed = selection?.isCollapsed() ?? true

    if (isCollapsed) {
      // Show cursor
      updateSelectionRects([])
      if (cursorRef.current && focusPosition) {
        const caretPos = new CaretPosition(focusPosition.node, focusPosition.offset)
        const rect = caretPos.getBoundingClientRect()
        if (rect) {
          const editorRect = editorRef.current.getBoundingClientRect()
          const top = Math.round(rect.top - editorRect.top)
          const left = Math.round(rect.left - editorRect.left)
          const height = Math.max(Math.round(rect.height), 20)

          cursorRef.current.style.top = `${top}px`
          cursorRef.current.style.left = `${left}px`
          cursorRef.current.style.height = `${height}px`
          cursorRef.current.style.display = 'block'
        }
      }
    } else {
      // Show selection
      if (cursorRef.current) cursorRef.current.style.display = 'none'
      if (selection && editorRef.current) {
        const editorRect = editorRef.current.getBoundingClientRect()
        const rects = calculateSelectionRects(editorRect)
        updateSelectionRects(rects)
      }
    }
  }, [anchorPosition, focusPosition, selection, calculateSelectionRects, updateSelectionRects])

  // Button handlers for testing
  const selectAll = useCallback(() => {
    if (!editorRef.current) return
    const start = CaretPosition.documentStart(editorRef.current)
    const end = CaretPosition.documentEnd(editorRef.current)
    if (start && end) {
      updateSelection(start, end)
    }
  }, [updateSelection])

  const clearSelection = useCallback(() => {
    if (selection && !selection.isCollapsed()) {
      collapseSelection(false)
    }
  }, [selection, collapseSelection])

  const getSelectionInfo = useCallback(() => {
    if (!selection) return 'No selection'

    const direction = getSelectionDirection()
    const text = getSelectionText()
    const isCollapsed = selection.isCollapsed()

    return {
      direction,
      isCollapsed,
      text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
      anchorNode: selection.anchor.node.nodeType === Node.TEXT_NODE ? 'Text' : 'Element',
      focusNode: selection.focus.node.nodeType === Node.TEXT_NODE ? 'Text' : 'Element',
      anchorOffset: selection.anchor.offset,
      focusOffset: selection.focus.offset,
    }
  }, [selection, getSelectionDirection, getSelectionText])

  return (
    <div className="container">
      <h1>Enhanced useSelection Test Page</h1>

      {/* Control Panel */}
      <div style={{ marginBottom: '20px', padding: '10px', background: '#f5f5f5', borderRadius: '5px' }}>
        <h3>Controls:</h3>
        <button onClick={selectAll} style={{ marginRight: '10px' }}>
          Select All (Ctrl+A)
        </button>
        <button onClick={clearSelection} style={{ marginRight: '10px' }}>
          Clear Selection (Esc)
        </button>

        <p style={{ margin: '10px 0', fontSize: '14px', color: '#666' }}>
          <strong>Atomic Components:</strong> Tables and HR elements (highlighted in blue) are treated as single units. Try clicking on them
          or navigating through them with arrow keys.
        </p>

        <h4>Keyboard Shortcuts:</h4>
        <ul style={{ fontSize: '12px', margin: '5px 0' }}>
          <li>
            <strong>Arrow Keys:</strong> Move cursor
          </li>
          <li>
            <strong>Shift + Arrow Keys:</strong> Extend selection
          </li>
          <li>
            <strong>Home/End:</strong> Move to line start/end
          </li>
          <li>
            <strong>Shift + Home/End:</strong> Select to line start/end
          </li>
          <li>
            <strong>Ctrl/Cmd + Arrow Keys:</strong> Move to word/document boundaries
          </li>
          <li>
            <strong>Shift + Ctrl/Cmd + Arrow Keys:</strong> Extend selection to boundaries
          </li>
          <li>
            <strong>Mouse:</strong> Click to position, drag to select
          </li>
          <li>
            <strong>Shift + Click:</strong> Extend selection
          </li>
          <li>
            <strong>Double Click:</strong> Select word
          </li>
          <li>
            <strong>Triple Click:</strong> Select paragraph
          </li>
        </ul>
      </div>

      {/* Selection Info */}
      <div style={{ marginBottom: '20px', padding: '10px', background: '#e8f4f8', borderRadius: '5px' }}>
        <h4>Selection Info:</h4>
        <pre style={{ fontSize: '12px', margin: 0 }}>{JSON.stringify(getSelectionInfo(), null, 2)}</pre>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        className="editor"
        onMouseDown={handleMouseDown}
        onKeyDown={hotkeyHandler}
        tabIndex={0}
        style={{ position: 'relative', minHeight: '400px' }}
      >
        {/* Cursor */}
        <div ref={cursorRef} className={`custom-cursor ${isBlinking ? 'blinking' : ''}`} />

        {/* Selection rectangles */}
        {selectionRects.map((rect, i) => (
          <div
            key={i}
            className="selection-rect"
            style={{
              position: 'absolute',
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              backgroundColor: 'rgba(0, 123, 255, 0.3)',
              pointerEvents: 'none',
            }}
          />
        ))}

        {/* Test Content */}
        <h2>Welcome to Enhanced Selection Test</h2>
        <p>
          This is a test page for the enhanced <strong>useSelection</strong> hook. You can interact with this text using various keyboard
          shortcuts and mouse operations.
        </p>

        <blockquote>
          Try different selection methods: use arrow keys with Shift to extend selection, double-click to select words, triple-click to
          select paragraphs, and drag with the mouse.
        </blockquote>

        <ul>
          <li>
            First list item with some <em>emphasized text</em>
          </li>
          <li>
            Second item with <code>inline code</code>
          </li>
          <li>
            Third item with a <a href="#">link</a> in it
          </li>
        </ul>

        <p>
          The selection system now uses the enhanced <code>CaretPosition</code> class and <code>Selection</code> class internally, providing
          rich functionality for cursor positioning and text selection management.
        </p>

        <div style={{ border: '2px solid #ddd', padding: '15px', margin: '20px 0' }}>
          <h3>Boxed Content</h3>
          <p>This content is inside a bordered container. Test how selection works across different elements.</p>
        </div>

        <p>
          You can use <strong>Ctrl+A</strong> (or <strong>Cmd+A</strong> on Mac) to select all text, and <strong>Escape</strong> to clear
          the selection.
        </p>

        <hr className="atomic-component" />

        <h3>Atomic Components Test</h3>
        <p>
          The following elements are treated as <strong>atomic components</strong> - they behave as single units that cannot be entered with
          the cursor. You can only position the cursor before or after them.
        </p>

        <table className="atomic-component" style={{ borderCollapse: 'collapse', width: '100%', margin: '10px 0' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: '8px', background: '#f0f0f0' }}>Product</th>
              <th style={{ border: '1px solid #ccc', padding: '8px', background: '#f0f0f0' }}>Price</th>
              <th style={{ border: '1px solid #ccc', padding: '8px', background: '#f0f0f0' }}>Stock</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>Laptop</td>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>$1,299</td>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>15</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>Mouse</td>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>$29</td>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>50</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>Keyboard</td>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>$89</td>
              <td style={{ border: '1px solid #ccs', padding: '8px' }}>25</td>
            </tr>
          </tbody>
        </table>

        <p>
          Try clicking on the table above. Notice how the cursor can only be positioned at the beginning or end of the table, not inside it.
          Use arrow keys to navigate around it.
        </p>

        <hr className="atomic-component" />

        <p>
          The horizontal rules (HR elements) above and below are also atomic components. Try navigating through them with arrow keys or
          clicking near them.
        </p>

        <div style={{ display: 'flex', gap: '20px', margin: '20px 0' }}>
          <div style={{ flex: 1 }}>
            <h4>Left Column</h4>
            <p>Some text before the table.</p>

            <table className="atomic-component" style={{ borderCollapse: 'collapse', width: '100%' }}>
              <tr>
                <td style={{ border: '1px solid #666', padding: '6px' }}>Cell A</td>
                <td style={{ border: '1px solid #666', padding: '6px' }}>Cell B</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #666', padding: '6px' }}>Cell C</td>
                <td style={{ border: '1px solid #666', padding: '6px' }}>Cell D</td>
              </tr>
            </table>

            <p>Some text after the table.</p>
          </div>

          <div style={{ flex: 1 }}>
            <h4>Right Column</h4>
            <p>Testing atomic components in a multi-column layout.</p>

            <hr className="atomic-component" />

            <p>Notice how the cursor navigation works around these atomic elements.</p>
          </div>
        </div>

        <pre style={{ background: '#f8f8f8', padding: '10px', overflow: 'auto' }}>
          {`function example() {
  console.log("This is code content");
  const result = performCalculation();
  return result;
}`}
        </pre>

        <hr className="atomic-component" />

        <h4>Test Instructions for Atomic Components:</h4>
        <ol>
          <li>
            <strong>Click Tests:</strong>
            <ul>
              <li>Click directly on a table - cursor should position at start or end</li>
              <li>Click on the left half of a table - cursor goes to start</li>
              <li>Click on the right half of a table - cursor goes to end</li>
              <li>Click on HR elements - same behavior as tables</li>
            </ul>
          </li>
          <li>
            <strong>Keyboard Navigation:</strong>
            <ul>
              <li>Use arrow keys to navigate into and out of atomic components</li>
              <li>Try Shift + arrow keys to select across atomic components</li>
              <li>Test Home/End keys around atomic components</li>
            </ul>
          </li>
          <li>
            <strong>Selection Tests:</strong>
            <ul>
              <li>Try selecting text that includes atomic components</li>
              <li>Double-click near atomic components</li>
              <li>Use Ctrl+A to select all (including atomic components)</li>
            </ul>
          </li>
        </ol>

        <p>
          Test navigation with <strong>Home</strong>/<strong>End</strong> keys to move to line boundaries, and <strong>Ctrl+Home</strong>/
          <strong>Ctrl+End</strong> to move to document boundaries.
        </p>
      </div>
    </div>
  )
}

export default App
