import { useCallback, useRef } from 'react'
import type { CursorPosition } from '../types'
import { createHotkeyHandler } from '../lib/hotkeys'
import { getRectForPosition } from '../lib/position'
import {
  getNextCaretPosition,
  getPreviousCaretPosition,
  getNextLineCaretPosition,
  getPreviousLineCaretPosition,
  getLineStartCaretPosition,
  getLineEndCaretPosition,
  getDocumentStartCaretPosition,
  getDocumentEndCaretPosition,
} from '../lib/caret'

interface UseKeyboardHandlersProps {
  focusPosition: CursorPosition | null
  anchorPosition: CursorPosition | null
  goalX: number | null
  editorRef: React.RefObject<HTMLDivElement | null>
  resetBlink: () => void
  updateSelection: (anchor: CursorPosition | null, focus: CursorPosition | null) => void
  setGoalX: (x: number | null) => void
  // Enhanced methods from the new useSelection hook
  moveSelectionBy?: (root: Node, direction: 'forward' | 'backward', unit: 'character' | 'line' | 'lineboundary' | 'documentboundary', rootElement?: Element) => void
  extendSelectionBy?: (root: Node, direction: 'forward' | 'backward', unit: 'character' | 'line' | 'lineboundary' | 'documentboundary', rootElement?: Element) => void
}

export function useKeyboardHandlers({
  focusPosition,
  anchorPosition,
  goalX,
  editorRef,
  resetBlink,
  updateSelection,
  setGoalX,
  moveSelectionBy,
  extendSelectionBy,
}: UseKeyboardHandlersProps) {
  const goalXRef = useRef<number | null>(goalX)
  goalXRef.current = goalX

  /**
   * Get rectangle for a given position
   */
  const getRectForPositionWrapper = useCallback((position: CursorPosition): DOMRect | null => {
    return getRectForPosition(position)
  }, [])

  /**
   * Move cursor to a new position
   */
  const moveCursor = useCallback((newPosition: CursorPosition | null) => {
    if (newPosition) {
      updateSelection(newPosition, newPosition)
      resetBlink()
    }
  }, [updateSelection, resetBlink])

  /**
   * Extend selection to a new position
   */
  const extendSelection = useCallback((newPosition: CursorPosition | null) => {
    if (newPosition && anchorPosition) {
      updateSelection(anchorPosition, newPosition)
      resetBlink()
    }
  }, [anchorPosition, updateSelection, resetBlink])

  /**
   * Navigate by character
   */
  const navigateCharacter = useCallback((direction: 'forward' | 'backward', extend: boolean = false) => {
    if (!editorRef.current) return

    // Use enhanced methods if available
    if (extend && extendSelectionBy) {
      extendSelectionBy(editorRef.current, direction, 'character', editorRef.current)
      resetBlink()
    } else if (!extend && moveSelectionBy) {
      moveSelectionBy(editorRef.current, direction, 'character', editorRef.current)
      resetBlink()
      setGoalX(null)
    } else {
      // Fallback to legacy method
      if (!focusPosition) return
      
      const newPosition = direction === 'forward'
        ? getNextCaretPosition(editorRef.current, focusPosition)
        : getPreviousCaretPosition(editorRef.current, focusPosition)

      if (extend) {
        extendSelection(newPosition)
      } else {
        moveCursor(newPosition)
        setGoalX(null)
      }
    }
  }, [focusPosition, editorRef, extendSelection, moveCursor, setGoalX, moveSelectionBy, extendSelectionBy, resetBlink])

  /**
   * Navigate by line
   */
  const navigateLine = useCallback((direction: 'forward' | 'backward', extend: boolean = false) => {
    if (!editorRef.current) return

    // Set or maintain goalX
    if (goalXRef.current === null && focusPosition) {
      const rect = getRectForPosition(focusPosition)
      if (rect) {
        setGoalX(rect.left)
        goalXRef.current = rect.left
      }
    }

    // Use enhanced methods if available
    if (extend && extendSelectionBy) {
      extendSelectionBy(editorRef.current, direction, 'line', editorRef.current)
      resetBlink()
    } else if (!extend && moveSelectionBy) {
      moveSelectionBy(editorRef.current, direction, 'line', editorRef.current)
      resetBlink()
    } else {
      // Fallback to legacy method
      if (!focusPosition) return

      const newPosition = direction === 'forward'
        ? getNextLineCaretPosition(editorRef.current, focusPosition, goalXRef.current || 0)
        : getPreviousLineCaretPosition(editorRef.current, focusPosition, goalXRef.current || 0)

      if (extend) {
        extendSelection(newPosition)
      } else {
        moveCursor(newPosition)
      }
    }
  }, [focusPosition, editorRef, extendSelection, moveCursor, setGoalX, moveSelectionBy, extendSelectionBy, resetBlink])

  /**
   * Navigate to line boundary
   */
  const navigateLineBoundary = useCallback((direction: 'forward' | 'backward', extend: boolean = false) => {
    if (!editorRef.current) return

    // Use enhanced methods if available
    if (extend && extendSelectionBy) {
      extendSelectionBy(editorRef.current, direction, 'lineboundary', editorRef.current)
      resetBlink()
    } else if (!extend && moveSelectionBy) {
      moveSelectionBy(editorRef.current, direction, 'lineboundary', editorRef.current)
      resetBlink()
      setGoalX(null)
    } else {
      // Fallback to legacy method
      if (!focusPosition) return

      const newPosition = direction === 'forward'
        ? getLineEndCaretPosition(editorRef.current, focusPosition)
        : getLineStartCaretPosition(editorRef.current, focusPosition)

      if (extend) {
        extendSelection(newPosition)
      } else {
        moveCursor(newPosition)
        setGoalX(null)
      }
    }
  }, [focusPosition, editorRef, extendSelection, moveCursor, setGoalX, moveSelectionBy, extendSelectionBy, resetBlink])

  /**
   * Navigate to document boundary
   */
  const navigateDocumentBoundary = useCallback((direction: 'forward' | 'backward', extend: boolean = false) => {
    if (!editorRef.current) return

    // Use enhanced methods if available
    if (extend && extendSelectionBy) {
      extendSelectionBy(editorRef.current, direction, 'documentboundary', editorRef.current)
      resetBlink()
    } else if (!extend && moveSelectionBy) {
      moveSelectionBy(editorRef.current, direction, 'documentboundary', editorRef.current)
      resetBlink()
      setGoalX(null)
    } else {
      // Fallback to legacy method
      const newPosition = direction === 'forward'
        ? getDocumentEndCaretPosition(editorRef.current)
        : getDocumentStartCaretPosition(editorRef.current)

      if (extend) {
        extendSelection(newPosition)
      } else {
        moveCursor(newPosition)
        setGoalX(null)
      }
    }
  }, [editorRef, extendSelection, moveCursor, setGoalX, moveSelectionBy, extendSelectionBy, resetBlink])

  /**
   * Create hotkey handler
   */
  const hotkeyHandler = useCallback(createHotkeyHandler([
    // Character movement
    {
      hotkey: 'ArrowLeft',
      handler: () => navigateCharacter('backward'),
    },
    {
      hotkey: 'ArrowRight',
      handler: () => navigateCharacter('forward'),
    },
    {
      hotkey: 'Shift+ArrowLeft',
      handler: () => navigateCharacter('backward', true),
    },
    {
      hotkey: 'Shift+ArrowRight',
      handler: () => navigateCharacter('forward', true),
    },

    // Line movement
    {
      hotkey: 'ArrowUp',
      handler: () => navigateLine('backward'),
    },
    {
      hotkey: 'ArrowDown',
      handler: () => navigateLine('forward'),
    },
    {
      hotkey: 'Shift+ArrowUp',
      handler: () => navigateLine('backward', true),
    },
    {
      hotkey: 'Shift+ArrowDown',
      handler: () => navigateLine('forward', true),
    },

    // Line boundary movement
    {
      hotkey: 'Home',
      handler: () => navigateLineBoundary('backward'),
    },
    {
      hotkey: 'End',
      handler: () => navigateLineBoundary('forward'),
    },
    {
      hotkey: 'Shift+Home',
      handler: () => navigateLineBoundary('backward', true),
    },
    {
      hotkey: 'Shift+End',
      handler: () => navigateLineBoundary('forward', true),
    },

    // Cmd/Ctrl + Arrow combinations
    {
      hotkey: 'mod+ArrowLeft',
      handler: () => navigateLineBoundary('backward'),
    },
    {
      hotkey: 'mod+ArrowRight',
      handler: () => navigateLineBoundary('forward'),
    },
    {
      hotkey: 'mod+Shift+ArrowLeft',
      handler: () => navigateLineBoundary('backward', true),
    },
    {
      hotkey: 'mod+Shift+ArrowRight',
      handler: () => navigateLineBoundary('forward', true),
    },
    {
      hotkey: 'mod+ArrowUp',
      handler: () => navigateDocumentBoundary('backward'),
    },
    {
      hotkey: 'mod+ArrowDown',
      handler: () => navigateDocumentBoundary('forward'),
    },
    {
      hotkey: 'mod+Shift+ArrowUp',
      handler: () => navigateDocumentBoundary('backward', true),
    },
    {
      hotkey: 'mod+Shift+ArrowDown',
      handler: () => navigateDocumentBoundary('forward', true),
    },
  ]), [navigateCharacter, navigateLine, navigateLineBoundary, navigateDocumentBoundary])

  return {
    hotkeyHandler,
    getRectForPosition: getRectForPositionWrapper,
  }
}