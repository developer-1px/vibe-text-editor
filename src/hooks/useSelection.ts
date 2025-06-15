import { useState, useCallback, useMemo } from 'react'
import { CaretPosition } from '../lib/caret/CaretPosition'
import { Selection } from '../lib/selection/Selection'
import type { CursorPosition } from '../types'
interface SelectionRect {
  top: number
  left: number
  width: number
  height: number
}

/**
 * Enhanced hook for managing text selection state using CaretPosition and Selection classes
 */
export function useSelection() {
  // Core selection state using the new Selection class
  const [selection, setSelection] = useState<Selection | null>(null)
  const [selectionRects, setSelectionRects] = useState<SelectionRect[]>([])
  const [goalX, setGoalX] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Backward compatibility: expose anchor and focus positions as plain objects
  const anchorPosition = useMemo<CursorPosition | null>(() => {
    return selection ? selection.anchor.toJSON() : null
  }, [selection])

  const focusPosition = useMemo<CursorPosition | null>(() => {
    return selection ? selection.focus.toJSON() : null
  }, [selection])

  /**
   * Update cursor position (collapsed selection)
   */
  const updateCursorPosition = useCallback((position: CursorPosition | CaretPosition) => {
    const caretPos = position instanceof CaretPosition 
      ? position 
      : new CaretPosition(position.node, position.offset)
    
    setSelection(Selection.collapsed(caretPos))
    setSelectionRects([])
    setGoalX(null)
  }, [])

  /**
   * Update selection with anchor and focus positions
   */
  const updateSelection = useCallback((
    anchor: CursorPosition | CaretPosition | null, 
    focus: CursorPosition | CaretPosition | null
  ) => {
    if (!anchor || !focus) {
      setSelection(null)
      setGoalX(null)
      return
    }

    const anchorPos = anchor instanceof CaretPosition 
      ? anchor 
      : new CaretPosition(anchor.node, anchor.offset)
    
    const focusPos = focus instanceof CaretPosition 
      ? focus 
      : new CaretPosition(focus.node, focus.offset)

    setSelection(new Selection(anchorPos, focusPos))
    setGoalX(null)
  }, [])

  /**
   * Start dragging operation
   */
  const startDragging = useCallback((initialPosition: CursorPosition | CaretPosition) => {
    const caretPos = initialPosition instanceof CaretPosition 
      ? initialPosition 
      : new CaretPosition(initialPosition.node, initialPosition.offset)
    
    setSelection(Selection.collapsed(caretPos))
    setIsDragging(true)
  }, [])

  /**
   * Update focus position during drag
   */
  const updateDragFocus = useCallback((newFocus: CursorPosition | CaretPosition) => {
    if (!selection) return

    const focusPos = newFocus instanceof CaretPosition 
      ? newFocus 
      : new CaretPosition(newFocus.node, newFocus.offset)

    setSelection(selection.setFocus(focusPos))
  }, [selection])

  /**
   * Stop dragging operation
   */
  const stopDragging = useCallback(() => {
    setIsDragging(false)
  }, [])

  /**
   * Update selection rectangles for rendering
   */
  const updateSelectionRects = useCallback((rects: SelectionRect[]) => {
    setSelectionRects(rects)
  }, [])

  /**
   * Check if selection is collapsed (cursor mode)
   */
  const isCollapsed = useCallback(() => {
    return selection ? selection.isCollapsed() : true
  }, [selection])

  /**
   * Clear selection
   */
  const clearSelection = useCallback(() => {
    setSelection(null)
    setSelectionRects([])
    setGoalX(null)
    setIsDragging(false)
  }, [])

  /**
   * Extend selection to a new position
   */
  const extendSelection = useCallback((newPosition: CursorPosition | CaretPosition) => {
    const newPos = newPosition instanceof CaretPosition 
      ? newPosition 
      : new CaretPosition(newPosition.node, newPosition.offset)

    if (!selection) {
      setSelection(Selection.collapsed(newPos))
    } else {
      setSelection(selection.setFocus(newPos))
    }
  }, [selection])

  /**
   * Move selection (both anchor and focus) to a new position
   */
  const moveSelection = useCallback((newPosition: CursorPosition | CaretPosition) => {
    const newPos = newPosition instanceof CaretPosition 
      ? newPosition 
      : new CaretPosition(newPosition.node, newPosition.offset)

    setSelection(Selection.collapsed(newPos))
    setSelectionRects([])
  }, [])

  // Enhanced methods that leverage the new Selection class capabilities

  /**
   * Move selection using navigation methods
   */
  const moveSelectionBy = useCallback((
    root: Node, 
    direction: 'forward' | 'backward', 
    unit: 'character' | 'line' | 'lineboundary' | 'documentboundary',
    rootElement?: Element
  ) => {
    if (!selection) return

    const newSelection = selection.move(root, direction, unit, rootElement)
    if (newSelection) {
      setSelection(newSelection)
      setSelectionRects([])
      
      // Preserve goalX for line movements
      if (unit !== 'line' && goalX !== null) {
        setGoalX(null)
      }
    }
  }, [selection, goalX])

  /**
   * Extend selection using navigation methods
   */
  const extendSelectionBy = useCallback((
    root: Node, 
    direction: 'forward' | 'backward', 
    unit: 'character' | 'line' | 'lineboundary' | 'documentboundary',
    rootElement?: Element
  ) => {
    if (!selection) return

    const newSelection = selection.extendMove(root, direction, unit, rootElement)
    if (newSelection) {
      setSelection(newSelection)
      
      // Preserve goalX for line movements
      if (unit !== 'line' && goalX !== null) {
        setGoalX(null)
      }
    }
  }, [selection, goalX])

  /**
   * Get selection direction
   */
  const getSelectionDirection = useCallback(() => {
    return selection ? selection.getDirection() : 'none'
  }, [selection])

  /**
   * Collapse selection to start or end
   */
  const collapseSelection = useCallback((toStart: boolean = false) => {
    if (!selection) return

    const newSelection = toStart ? selection.collapseToStart() : selection.collapseToEnd()
    setSelection(newSelection)
    setSelectionRects([])
  }, [selection])

  /**
   * Get selection bounds
   */
  const getSelectionBounds = useCallback(() => {
    return selection ? selection.getBounds() : null
  }, [selection])

  /**
   * Get text content of the selection
   */
  const getSelectionText = useCallback(() => {
    return selection ? selection.toString() : ''
  }, [selection])

  /**
   * Check if a position is contained in the selection
   */
  const containsPosition = useCallback((position: CursorPosition | CaretPosition) => {
    if (!selection) return false
    
    const pos = position instanceof CaretPosition 
      ? position 
      : new CaretPosition(position.node, position.offset)
    
    return selection.contains(pos)
  }, [selection])

  /**
   * Calculate selection rects using the Selection class
   */
  const calculateSelectionRects = useCallback((editorRect: DOMRect): SelectionRect[] => {
    return selection ? selection.getSelectionRects(editorRect) : []
  }, [selection])

  return {
    // Backward compatibility - state as plain objects
    anchorPosition,
    focusPosition,
    selectionRects,
    goalX,
    isDragging,
    
    // Enhanced state - rich objects
    selection,
    
    // Original API - maintained for backward compatibility
    updateCursorPosition,
    updateSelection,
    startDragging,
    updateDragFocus,
    stopDragging,
    updateSelectionRects,
    setGoalX,
    isCollapsed,
    clearSelection,
    extendSelection,
    moveSelection,
    
    // Enhanced API - leveraging new class capabilities
    moveSelectionBy,
    extendSelectionBy,
    getSelectionDirection,
    collapseSelection,
    getSelectionBounds,
    getSelectionText,
    containsPosition,
    calculateSelectionRects,
  }
}