import { 
  getNextCaretPosition,
  getPreviousCaretPosition,
  getNextLineCaretPosition,
  getPreviousLineCaretPosition,
  getLineStartCaretPosition,
  getLineEndCaretPosition,
  getDocumentStartCaretPosition,
  getDocumentEndCaretPosition,
  getRectsForPosition
} from './index'
import { isTextNode, isElementNode } from '../nodes'
import type { CaretPosition as CaretPositionInterface } from './types'

/**
 * Enhanced CaretPosition class that provides rich functionality for cursor positioning,
 * Range integration, and DOM operations.
 */
export class CaretPosition implements CaretPositionInterface {
  readonly node: Node
  readonly offset: number

  constructor(node: Node, offset: number) {
    this.node = node
    this.offset = offset
  }

  /**
   * Create CaretPosition from a Range
   */
  static fromRange(range: Range): CaretPosition {
    return new CaretPosition(range.startContainer, range.startOffset)
  }

  /**
   * Create CaretPosition from mouse coordinates
   */
  static fromPoint(x: number, y: number): CaretPosition | null {
    const position = document.caretPositionFromPoint(x, y)
    if (!position) return null
    return new CaretPosition(position.offsetNode, position.offset)
  }

  /**
   * Create a Range from this position (collapsed range)
   */
  toRange(): Range {
    const range = document.createRange()
    
    if (isElementNode(this.node)) {
      // For atomic elements, create range relative to parent
      const parent = this.node.parentNode
      if (parent) {
        const childIndex = Array.from(parent.childNodes).indexOf(this.node as ChildNode)
        if (childIndex !== -1) {
          const targetIndex = this.offset === 0 ? childIndex : childIndex + 1
          range.setStart(parent, targetIndex)
          range.setEnd(parent, targetIndex)
          return range
        }
      }
      // Fallback: collapsed range before or after the element
      if (this.offset === 0) {
        range.setStartBefore(this.node)
        range.setEndBefore(this.node)
      } else {
        range.setStartAfter(this.node)
        range.setEndAfter(this.node)
      }
    } else {
      // For text nodes, use normal offset
      range.setStart(this.node, this.offset)
      range.setEnd(this.node, this.offset)
    }
    
    return range
  }

  /**
   * Create a Range between two CaretPositions
   */
  static createRange(start: CaretPosition, end: CaretPosition): Range {
    const range = document.createRange()
    
    // Determine the correct order
    const comparison = start.compareTo(end)
    const [startPos, endPos] = comparison <= 0 ? [start, end] : [end, start]
    
    // Helper function to safely set range boundaries for atomic elements
    const setRangeBoundary = (pos: CaretPosition, isStart: boolean) => {
      if (isElementNode(pos.node)) {
        // For atomic elements, we need to position relative to their parent
        const parent = pos.node.parentNode
        if (parent) {
          const childIndex = Array.from(parent.childNodes).indexOf(pos.node as ChildNode)
          if (childIndex !== -1) {
            const targetIndex = pos.offset === 0 ? childIndex : childIndex + 1
            if (isStart) {
              range.setStart(parent, targetIndex)
            } else {
              range.setEnd(parent, targetIndex)
            }
            return
          }
        }
        // Fallback: select the entire element
        if (isStart) {
          range.setStartBefore(pos.node)
        } else {
          range.setEndAfter(pos.node)
        }
      } else {
        // For text nodes, use normal offset
        if (isStart) {
          range.setStart(pos.node, pos.offset)
        } else {
          range.setEnd(pos.node, pos.offset)
        }
      }
    }
    
    setRangeBoundary(startPos, true)
    setRangeBoundary(endPos, false)
    
    return range
  }

  /**
   * Get client rectangles for this position
   */
  getClientRects(): DOMRect[] {
    return getRectsForPosition(this)
  }

  /**
   * Get bounding rectangle for this position
   */
  getBoundingClientRect(): DOMRect | null {
    const rects = this.getClientRects()
    if (rects.length === 0) return null
    return rects[0]
  }

  /**
   * Scroll this position into view
   */
  scrollIntoView(options?: ScrollIntoViewOptions): void {
    const rect = this.getBoundingClientRect()
    if (!rect) return

    // Create a temporary element to scroll to
    const tempElement = document.createElement('div')
    tempElement.style.position = 'absolute'
    tempElement.style.left = `${rect.left}px`
    tempElement.style.top = `${rect.top}px`
    tempElement.style.width = '1px'
    tempElement.style.height = `${rect.height}px`
    tempElement.style.pointerEvents = 'none'
    
    document.body.appendChild(tempElement)
    tempElement.scrollIntoView(options)
    document.body.removeChild(tempElement)
  }

  /**
   * Get next character position
   */
  next(root: Node): CaretPosition | null {
    const nextPos = getNextCaretPosition(root, this)
    return nextPos ? new CaretPosition(nextPos.node, nextPos.offset) : null
  }

  /**
   * Get previous character position
   */
  previous(root: Node): CaretPosition | null {
    const prevPos = getPreviousCaretPosition(root, this)
    return prevPos ? new CaretPosition(prevPos.node, prevPos.offset) : null
  }

  /**
   * Get next line position
   */
  nextLine(root: Element, goalX?: number): CaretPosition | null {
    const nextPos = getNextLineCaretPosition(root, this, goalX ?? null)
    return nextPos ? new CaretPosition(nextPos.node, nextPos.offset) : null
  }

  /**
   * Get previous line position
   */
  previousLine(root: Element, goalX?: number): CaretPosition | null {
    const prevPos = getPreviousLineCaretPosition(root, this, goalX ?? null)
    return prevPos ? new CaretPosition(prevPos.node, prevPos.offset) : null
  }

  /**
   * Get line start position
   */
  lineStart(root: Element): CaretPosition | null {
    const startPos = getLineStartCaretPosition(root, this)
    return startPos ? new CaretPosition(startPos.node, startPos.offset) : null
  }

  /**
   * Get line end position
   */
  lineEnd(root: Element): CaretPosition | null {
    const endPos = getLineEndCaretPosition(root, this)
    return endPos ? new CaretPosition(endPos.node, endPos.offset) : null
  }

  /**
   * Get document start position
   */
  static documentStart(root: Node): CaretPosition | null {
    const startPos = getDocumentStartCaretPosition(root)
    return startPos ? new CaretPosition(startPos.node, startPos.offset) : null
  }

  /**
   * Get document end position
   */
  static documentEnd(root: Node): CaretPosition | null {
    const endPos = getDocumentEndCaretPosition(root)
    return endPos ? new CaretPosition(endPos.node, endPos.offset) : null
  }

  /**
   * Check if this position equals another
   */
  equals(other: CaretPosition | CaretPositionInterface): boolean {
    return this.node === other.node && this.offset === other.offset
  }

  /**
   * Compare this position with another
   * Returns: -1 if this < other, 0 if equal, 1 if this > other
   */
  compareTo(other: CaretPosition | CaretPositionInterface): number {
    if (this.node === other.node) {
      return this.offset - other.offset
    }

    // Use Range.compareBoundaryPoints for different nodes
    const thisRange = this.toRange()
    const otherRange = other instanceof CaretPosition 
      ? other.toRange() 
      : new CaretPosition(other.node, other.offset).toRange()

    try {
      return thisRange.compareBoundaryPoints(Range.START_TO_START, otherRange)
    } catch {
      // Fallback: use document position comparison
      const position = this.node.compareDocumentPosition(other.node)
      if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1
      if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1
      return 0
    }
  }

  /**
   * Check if this position is before another
   */
  isBefore(other: CaretPosition | CaretPositionInterface): boolean {
    return this.compareTo(other) < 0
  }

  /**
   * Check if this position is after another
   */
  isAfter(other: CaretPosition | CaretPositionInterface): boolean {
    return this.compareTo(other) > 0
  }

  /**
   * Validate this position
   */
  isValid(): boolean {
    if (!this.node) return false

    if (isTextNode(this.node)) {
      const textLength = this.node.textContent?.length ?? 0
      return this.offset >= 0 && this.offset <= textLength
    }

    if (isElementNode(this.node)) {
      // For atomic elements, offset should be 0 or 1
      return this.offset === 0 || this.offset === 1
    }

    return false
  }

  /**
   * Normalize this position to ensure it's valid
   */
  normalize(): CaretPosition {
    if (this.isValid()) return this

    if (isTextNode(this.node)) {
      const textLength = this.node.textContent?.length ?? 0
      const normalizedOffset = Math.max(0, Math.min(this.offset, textLength))
      return new CaretPosition(this.node, normalizedOffset)
    }

    if (isElementNode(this.node)) {
      const normalizedOffset = this.offset <= 0 ? 0 : 1
      return new CaretPosition(this.node, normalizedOffset)
    }

    return this
  }

  /**
   * Clone this position
   */
  clone(): CaretPosition {
    return new CaretPosition(this.node, this.offset)
  }

  /**
   * Convert to plain object (for serialization, debugging)
   */
  toJSON(): CaretPositionInterface {
    return {
      node: this.node,
      offset: this.offset
    }
  }

  /**
   * String representation for debugging
   */
  toString(): string {
    const nodeType = isTextNode(this.node) ? 'Text' : 
                    isElementNode(this.node) ? `Element(${(this.node as Element).tagName})` : 'Node'
    const nodeContent = isTextNode(this.node) 
      ? `"${this.node.textContent?.slice(0, 20)}${(this.node.textContent?.length ?? 0) > 20 ? '...' : ''}"`
      : isElementNode(this.node) 
        ? `class="${(this.node as Element).className}"`
        : ''
    
    return `CaretPosition(${nodeType}[${this.offset}] ${nodeContent})`
  }
}