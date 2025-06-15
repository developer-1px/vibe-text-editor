import type { CursorPosition } from '../types'
import { isTextNode } from './nodes'

export interface SelectionRange {
  anchorPos: CursorPosition
  focusPos: CursorPosition
}

export interface BlockSelection {
  startPos: CursorPosition
  endPos: CursorPosition
}

export interface SelectionRect {
  top: number
  left: number
  width: number
  height: number
}

/**
 * Select a word at the given position
 */
export function selectWord(position: CursorPosition): SelectionRange | null {
  if (!isTextNode(position.node)) {
    return null
  }

  const textNode = position.node as Text
  const text = textNode.textContent || ''
  const offset = position.offset

  // Find word boundaries
  const wordRegex = /\b/g
  const boundaries: number[] = []
  let match
  
  while ((match = wordRegex.exec(text)) !== null) {
    boundaries.push(match.index)
  }

  // Find the word boundaries around the current offset
  let startOffset = 0
  let endOffset = text.length

  for (let i = 0; i < boundaries.length; i++) {
    if (boundaries[i] <= offset) {
      startOffset = boundaries[i]
    }
    if (boundaries[i] > offset) {
      endOffset = boundaries[i]
      break
    }
  }

  // If we're at a word boundary, select the word after it
  if (startOffset === offset && endOffset > offset) {
    // We're at the start of a word
  } else if (endOffset === offset && startOffset < offset) {
    // We're at the end of a word, select the word before
  }

  return {
    anchorPos: { node: textNode, offset: startOffset },
    focusPos: { node: textNode, offset: endOffset }
  }
}

/**
 * Select the entire block containing the given position
 */
export function selectBlock(position: CursorPosition): BlockSelection | null {
  // Find the nearest block element
  let currentNode = position.node
  let blockElement: Element | null = null

  // Traverse up to find block element
  while (currentNode && currentNode !== document.body) {
    if (currentNode.nodeType === Node.ELEMENT_NODE) {
      const element = currentNode as Element
      const computedStyle = window.getComputedStyle(element)
      if (computedStyle.display === 'block' || 
          computedStyle.display === 'list-item' ||
          element.tagName.match(/^(P|DIV|H[1-6]|BLOCKQUOTE|PRE|UL|OL|LI)$/)) {
        blockElement = element
        break
      }
    }
    currentNode = currentNode.parentNode as Node
  }

  if (!blockElement) {
    return null
  }

  // Find first and last text positions in the block
  const walker = document.createTreeWalker(
    blockElement,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        return node.textContent && node.textContent.trim() 
          ? NodeFilter.FILTER_ACCEPT 
          : NodeFilter.FILTER_SKIP
      }
    }
  )

  const firstTextNode = walker.firstChild()
  const lastTextNode = walker.lastChild()

  if (!firstTextNode || !lastTextNode) {
    return null
  }

  return {
    startPos: { node: firstTextNode, offset: 0 },
    endPos: { node: lastTextNode, offset: lastTextNode.textContent?.length || 0 }
  }
}

/**
 * Calculate selection rectangles for rendering
 */
export function calculateSelectionRects(
  anchorPosition: CursorPosition | null,
  focusPosition: CursorPosition | null,
  containerRect: DOMRect
): SelectionRect[] {
  if (!anchorPosition || !focusPosition) {
    return []
  }

  try {
    const range = document.createRange()
    
    // Determine the start and end positions
    const comparison = anchorPosition.node.compareDocumentPosition(focusPosition.node)
    const isAnchorFirst = comparison === 0 
      ? anchorPosition.offset <= focusPosition.offset
      : Boolean(comparison & Node.DOCUMENT_POSITION_FOLLOWING)

    const startPos = isAnchorFirst ? anchorPosition : focusPosition
    const endPos = isAnchorFirst ? focusPosition : anchorPosition

    range.setStart(startPos.node, startPos.offset)
    range.setEnd(endPos.node, endPos.offset)

    const clientRects = Array.from(range.getClientRects())
    
    return clientRects.map(rect => ({
      top: Math.round(rect.top - containerRect.top),
      left: Math.round(rect.left - containerRect.left),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    }))
  } catch (error) {
    console.warn('Failed to calculate selection rects:', error)
    return []
  }
}