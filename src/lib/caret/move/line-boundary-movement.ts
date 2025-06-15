import type { CaretPosition } from '../types'
import { getRectsForPosition } from '../position'
import { createCaretWalker } from '../walker'
import { isElementNode, isTextNode } from '../../nodes'

function caretPositionFromPoint(x: number, y: number): CaretPosition | null {
  const position = document.caretPositionFromPoint(x, y)
  if (!position) return null
  return { node: position.offsetNode, offset: position.offset }
}

function getLineRects(root: Element, currentPosition: CaretPosition): DOMRect[] {
  const lineRects: DOMRect[] = []
  const currentRects = getRectsForPosition(currentPosition)
  if (currentRects.length === 0) return []

  const currentRect = currentRects[0]
  const walker = createCaretWalker(root)
  walker.currentNode = root

  let node = walker.firstChild()
  while (node) {
    const range = document.createRange()
    if (isTextNode(node)) {
      range.selectNodeContents(node)
      for (const rect of range.getClientRects()) {
        if (rect.bottom > currentRect.top && rect.top < currentRect.bottom) {
          lineRects.push(rect)
        }
      }
    } else if (isElementNode(node)) {
      range.selectNode(node)
      const rect = range.getBoundingClientRect()
      if (rect.bottom > currentRect.top && rect.top < currentRect.bottom) {
        lineRects.push(rect)
      }
    }
    node = walker.nextNode()
  }

  return lineRects
}

export function getLineStartCaretPosition(root: Element, currentPosition: CaretPosition): CaretPosition | null {
  const lineRects = getLineRects(root, currentPosition)
  if (lineRects.length === 0) return null

  const lineStartRect = lineRects.reduce((leftmost, current) => (current.left < leftmost.left ? current : leftmost))
  return caretPositionFromPoint(lineStartRect.left, lineStartRect.top + lineStartRect.height / 2)
}

export function getLineEndCaretPosition(root: Element, currentPosition: CaretPosition): CaretPosition | null {
  const lineRects = getLineRects(root, currentPosition)
  if (lineRects.length === 0) return null

  const lineEndRect = lineRects.reduce((rightmost, current) => (current.right > rightmost.right ? current : rightmost))
  return caretPositionFromPoint(lineEndRect.right, lineEndRect.top + lineEndRect.height / 2)
}
