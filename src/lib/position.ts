import type { CursorPosition } from '../types'

/**
 * Position-related utility functions
 */

/**
 * Compare two cursor positions for equality
 */
export function arePositionsEqual(pos1: CursorPosition | null, pos2: CursorPosition | null): boolean {
  if (!pos1 || !pos2) return pos1 === pos2
  return pos1.node === pos2.node && pos1.offset === pos2.offset
}

/**
 * Find cursor position from a point in the document
 */
export function findPositionFromPoint(clientX: number, clientY: number, container: HTMLElement): CursorPosition | null {
  if (!document.caretPositionFromPoint) {
    return null
  }

  const caretPosition = document.caretPositionFromPoint(clientX, clientY)
  if (!caretPosition) {
    return null
  }

  // Check if the position is within the container
  if (!container.contains(caretPosition.offsetNode)) {
    return null
  }

  return {
    node: caretPosition.offsetNode,
    offset: caretPosition.offset,
  }
}

/**
 * Get bounding rectangle for a cursor position
 */
export function getRectForPosition(position: CursorPosition): DOMRect | null {
  if (!position) return null

  try {
    const range = document.createRange()
    range.setStart(position.node, position.offset)
    range.collapse(true)
    return range.getBoundingClientRect()
  } catch (error) {
    console.warn('Failed to get rect for position:', error)
    return null
  }
}

/**
 * Get all client rects for a cursor position
 */
export function getRectsForPosition(position: CursorPosition): DOMRect[] {
  if (!position) return []

  try {
    const range = document.createRange()
    range.setStart(position.node, position.offset)
    range.collapse(true)
    return Array.from(range.getClientRects())
  } catch (error) {
    console.warn('Failed to get rects for position:', error)
    return []
  }
}