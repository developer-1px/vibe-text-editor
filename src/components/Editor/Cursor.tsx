/**
 * 커서 렌더링 컴포넌트
 */

import React, { useEffect, useRef } from 'react'
import type { CursorPosition } from '../../types'
import { STANDARD_LINE_HEIGHT } from '../../lib/constants'
import { getPositionRect } from '../../lib/position'

interface CursorProps {
  position: CursorPosition | null
  isVisible: boolean
  isBlinking: boolean
  editorElement: HTMLDivElement | null
}

export function Cursor({ position, isVisible, isBlinking, editorElement }: CursorProps) {
  const cursorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!position || !editorElement || !isVisible || !cursorRef.current) {
      if (cursorRef.current) {
        cursorRef.current.style.display = 'none'
      }
      return
    }

    const rect = getPositionRect(position)
    if (!rect) {
      cursorRef.current.style.display = 'none'
      return
    }

    const editorRect = editorElement.getBoundingClientRect()

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
  }, [position, isVisible, editorElement])

  return (
    <div 
      ref={cursorRef} 
      className={`custom-cursor ${isBlinking ? 'blinking' : ''}`}
      style={{ display: 'none' }}
    />
  )
}