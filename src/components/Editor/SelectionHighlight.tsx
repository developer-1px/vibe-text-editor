/**
 * 텍스트 선택 영역 하이라이트 컴포넌트
 */

import React from 'react'
import type { StyledRect } from '../../lib/selection'

interface SelectionHighlightProps {
  selectionRects: StyledRect[]
}

export function SelectionHighlight({ selectionRects }: SelectionHighlightProps) {
  if (selectionRects.length === 0) {
    return null
  }

  return (
    <>
      {selectionRects.map((rect, i) => (
        <div
          key={i}
          className="selection-rect"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
        />
      ))}
    </>
  )
}