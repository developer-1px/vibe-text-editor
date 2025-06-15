import { useRef } from 'react'
import {
  type CaretPosition,
  getNextCaretPosition,
  getPreviousCaretPosition,
  getNextLineCaretPosition,
  getPreviousLineCaretPosition,
  getLineStartCaretPosition,
  getLineEndCaretPosition,
  getDocumentStartCaretPosition,
  getDocumentEndCaretPosition,
  getRectsForPosition,
} from '../lib/caret'
import { visualizeRects } from '../lib/debug'

type Alter = 'move' | 'extend'
type Direction = 'forward' | 'backward'
type Unit = 'character' | 'line' | 'lineboundary' | 'documentboundary'

export function useCaretNavigation(rootElRef: React.RefObject<HTMLElement>) {
  const caretPositionRef = useRef<CaretPosition | null>(null)
  const goalXRef = useRef<number | null>(null)
  const lastDirectionRef = useRef(0)

  function collapse(position: CaretPosition) {
    goalXRef.current = null
    updateCaretPosition(position)
  }

  function modify(alter: Alter, direction: Direction, unit: Unit) {
    const root = rootElRef.current
    const currentPos = caretPositionRef.current
    if (!root || !currentPos) return

    let newPosition: CaretPosition | null = null

    if (unit === 'character') {
      goalXRef.current = null
      newPosition = direction === 'forward' ? getNextCaretPosition(root, currentPos) : getPreviousCaretPosition(root, currentPos)
    }
    //
    else if (unit === 'line') {
      if (goalXRef.current === null) {
        const rects = getRectsForPosition(currentPos)
        goalXRef.current = rects.length > 0 ? rects[0].left : 0
      }
      newPosition =
        direction === 'forward'
          ? getNextLineCaretPosition(root, currentPos, goalXRef.current)
          : getPreviousLineCaretPosition(root, currentPos, goalXRef.current)
    }
    //
    else if (unit === 'lineboundary') {
      goalXRef.current = null
      newPosition = direction === 'forward' ? getLineEndCaretPosition(root, currentPos) : getLineStartCaretPosition(root, currentPos)
    }
    //
    else if (unit === 'documentboundary') {
      goalXRef.current = null
      newPosition = direction === 'forward' ? getDocumentEndCaretPosition(root) : getDocumentStartCaretPosition(root)
    }

    lastDirectionRef.current = direction === 'forward' ? 1 : 0
    updateCaretPosition(newPosition)
  }

  // effect!!
  function updateCaretPosition(newPosition: CaretPosition | null) {
    if (!newPosition) return

    caretPositionRef.current = newPosition
    const rects = getRectsForPosition(newPosition)
    const rect = rects[1] || rects[0]

    visualizeRects(rects)
    console.log('Current Position:', newPosition)
  }

  return new (class {
    collapse = collapse
    modify = modify
  })()
}
