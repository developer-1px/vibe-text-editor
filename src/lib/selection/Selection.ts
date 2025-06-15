import { CaretPosition } from '../caret/CaretPosition'
import type { CaretPosition as CaretPositionInterface } from '../caret/types'

/**
 * Represents a text selection with anchor and focus positions
 */
export class Selection {
  private _anchor: CaretPosition
  private _focus: CaretPosition

  constructor(anchor: CaretPosition | CaretPositionInterface, focus?: CaretPosition | CaretPositionInterface) {
    this._anchor = anchor instanceof CaretPosition 
      ? anchor 
      : new CaretPosition(anchor.node, anchor.offset)
    
    this._focus = focus 
      ? (focus instanceof CaretPosition ? focus : new CaretPosition(focus.node, focus.offset))
      : this._anchor
  }

  /**
   * Create Selection from a Range
   */
  static fromRange(range: Range): Selection {
    const anchor = new CaretPosition(range.startContainer, range.startOffset)
    const focus = new CaretPosition(range.endContainer, range.endOffset)
    return new Selection(anchor, focus)
  }

  /**
   * Create collapsed Selection at a single position
   */
  static collapsed(position: CaretPosition | CaretPositionInterface): Selection {
    const caretPos = position instanceof CaretPosition 
      ? position 
      : new CaretPosition(position.node, position.offset)
    return new Selection(caretPos)
  }

  /**
   * Get anchor position
   */
  get anchor(): CaretPosition {
    return this._anchor
  }

  /**
   * Get focus position
   */
  get focus(): CaretPosition {
    return this._focus
  }

  /**
   * Set anchor position
   */
  setAnchor(position: CaretPosition | CaretPositionInterface): Selection {
    const newAnchor = position instanceof CaretPosition 
      ? position 
      : new CaretPosition(position.node, position.offset)
    return new Selection(newAnchor, this._focus)
  }

  /**
   * Set focus position
   */
  setFocus(position: CaretPosition | CaretPositionInterface): Selection {
    const newFocus = position instanceof CaretPosition 
      ? position 
      : new CaretPosition(position.node, position.offset)
    return new Selection(this._anchor, newFocus)
  }

  /**
   * Convert to Range
   */
  toRange(): Range {
    return CaretPosition.createRange(this._anchor, this._focus)
  }

  /**
   * Check if selection is collapsed (anchor equals focus)
   */
  isCollapsed(): boolean {
    return this._anchor.equals(this._focus)
  }

  /**
   * Get selection direction
   * Returns: 'forward' if focus is after anchor, 'backward' if before, 'none' if collapsed
   */
  getDirection(): 'forward' | 'backward' | 'none' {
    if (this.isCollapsed()) return 'none'
    return this._focus.isAfter(this._anchor) ? 'forward' : 'backward'
  }

  /**
   * Get start position (earliest in document order)
   */
  getStart(): CaretPosition {
    return this._anchor.isBefore(this._focus) ? this._anchor : this._focus
  }

  /**
   * Get end position (latest in document order)
   */
  getEnd(): CaretPosition {
    return this._anchor.isAfter(this._focus) ? this._anchor : this._focus
  }

  /**
   * Get bounds of the selection
   */
  getBounds(): { start: CaretPosition, end: CaretPosition } {
    return {
      start: this.getStart(),
      end: this.getEnd()
    }
  }

  /**
   * Collapse selection to anchor
   */
  collapseToAnchor(): Selection {
    return new Selection(this._anchor)
  }

  /**
   * Collapse selection to focus
   */
  collapseToFocus(): Selection {
    return new Selection(this._focus)
  }

  /**
   * Collapse selection to start
   */
  collapseToStart(): Selection {
    return new Selection(this.getStart())
  }

  /**
   * Collapse selection to end
   */
  collapseToEnd(): Selection {
    return new Selection(this.getEnd())
  }

  /**
   * Extend selection by moving focus
   */
  extend(newFocus: CaretPosition | CaretPositionInterface): Selection {
    return this.setFocus(newFocus)
  }

  /**
   * Move selection (both anchor and focus) by offset
   */
  move(root: Node, direction: 'forward' | 'backward', unit: 'character' | 'line' | 'lineboundary' | 'documentboundary', rootElement?: Element): Selection | null {
    let newPosition: CaretPosition | null = null

    switch (unit) {
      case 'character':
        newPosition = direction === 'forward' 
          ? this._focus.next(root)
          : this._focus.previous(root)
        break
      
      case 'line':
        if (!rootElement) break
        newPosition = direction === 'forward'
          ? this._focus.nextLine(rootElement)
          : this._focus.previousLine(rootElement)
        break
      
      case 'lineboundary':
        if (!rootElement) break
        newPosition = direction === 'forward'
          ? this._focus.lineEnd(rootElement)
          : this._focus.lineStart(rootElement)
        break
      
      case 'documentboundary':
        newPosition = direction === 'forward'
          ? CaretPosition.documentEnd(root)
          : CaretPosition.documentStart(root)
        break
    }

    return newPosition ? new Selection(newPosition) : null
  }

  /**
   * Extend selection by moving focus
   */
  extendMove(root: Node, direction: 'forward' | 'backward', unit: 'character' | 'line' | 'lineboundary' | 'documentboundary', rootElement?: Element): Selection | null {
    let newFocus: CaretPosition | null = null

    switch (unit) {
      case 'character':
        newFocus = direction === 'forward' 
          ? this._focus.next(root)
          : this._focus.previous(root)
        break
      
      case 'line':
        if (!rootElement) break
        newFocus = direction === 'forward'
          ? this._focus.nextLine(rootElement)
          : this._focus.previousLine(rootElement)
        break
      
      case 'lineboundary':
        if (!rootElement) break
        newFocus = direction === 'forward'
          ? this._focus.lineEnd(rootElement)
          : this._focus.lineStart(rootElement)
        break
      
      case 'documentboundary':
        newFocus = direction === 'forward'
          ? CaretPosition.documentEnd(root)
          : CaretPosition.documentStart(root)
        break
    }

    return newFocus ? this.setFocus(newFocus) : null
  }

  /**
   * Get client rectangles for the selection
   */
  getClientRects(): DOMRect[] {
    if (this.isCollapsed()) {
      return this._focus.getClientRects()
    }

    const range = this.toRange()
    return Array.from(range.getClientRects())
  }

  /**
   * Get selection rectangles for visual rendering
   */
  getSelectionRects(editorRect: DOMRect): Array<{ top: number, left: number, width: number, height: number }> {
    if (this.isCollapsed()) return []

    const rects = this.getClientRects()
    return rects.map(rect => ({
      top: rect.top - editorRect.top,
      left: rect.left - editorRect.left,
      width: rect.width,
      height: rect.height
    }))
  }

  /**
   * Check if selection contains a position
   */
  contains(position: CaretPosition | CaretPositionInterface): boolean {
    if (this.isCollapsed()) return false

    const pos = position instanceof CaretPosition 
      ? position 
      : new CaretPosition(position.node, position.offset)

    const { start, end } = this.getBounds()
    return !pos.isBefore(start) && !pos.isAfter(end)
  }

  /**
   * Check if selection intersects with another selection
   */
  intersects(other: Selection): boolean {
    if (this.isCollapsed() || other.isCollapsed()) return false

    const thisBounds = this.getBounds()
    const otherBounds = other.getBounds()

    return !(thisBounds.end.isBefore(otherBounds.start) || 
             thisBounds.start.isAfter(otherBounds.end))
  }

  /**
   * Get text content of the selection
   */
  toString(): string {
    if (this.isCollapsed()) return ''
    
    const range = this.toRange()
    return range.toString()
  }

  /**
   * Extract contents of the selection
   */
  extractContents(): DocumentFragment {
    if (this.isCollapsed()) return document.createDocumentFragment()
    
    const range = this.toRange()
    return range.extractContents()
  }

  /**
   * Clone contents of the selection
   */
  cloneContents(): DocumentFragment {
    if (this.isCollapsed()) return document.createDocumentFragment()
    
    const range = this.toRange()
    return range.cloneContents()
  }

  /**
   * Delete contents of the selection
   */
  deleteContents(): void {
    if (this.isCollapsed()) return
    
    const range = this.toRange()
    range.deleteContents()
  }

  /**
   * Insert node at selection
   */
  insertNode(node: Node): void {
    const range = this.toRange()
    range.insertNode(node)
  }

  /**
   * Surround selection contents with a node
   */
  surroundContents(newParent: Node): void {
    if (this.isCollapsed()) return
    
    const range = this.toRange()
    range.surroundContents(newParent)
  }

  /**
   * Check if this selection equals another
   */
  equals(other: Selection): boolean {
    return this._anchor.equals(other._anchor) && this._focus.equals(other._focus)
  }

  /**
   * Clone this selection
   */
  clone(): Selection {
    return new Selection(this._anchor.clone(), this._focus.clone())
  }

  /**
   * Convert to plain object (for serialization, debugging)
   */
  toJSON(): { anchor: CaretPositionInterface, focus: CaretPositionInterface } {
    return {
      anchor: this._anchor.toJSON(),
      focus: this._focus.toJSON()
    }
  }

  /**
   * String representation for debugging
   */
  inspect(): string {
    const direction = this.getDirection()
    const collapsed = this.isCollapsed() ? ' (collapsed)' : ''
    return `Selection[${direction}${collapsed}]\n  anchor: ${this._anchor.toString()}\n  focus: ${this._focus.toString()}`
  }
}