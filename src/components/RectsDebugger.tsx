import React from 'react'

interface RectsDebuggerProps {
  rects: DOMRect[] | null
  containerRef?: React.RefObject<HTMLElement>
}

const RectsDebugger: React.FC<RectsDebuggerProps> = ({ rects, containerRef }) => {
  if (!rects || rects.length === 0) {
    return null
  }

  const containerRect = containerRef?.current?.getBoundingClientRect()
  const offsetX = containerRect?.left ?? 0
  const offsetY = containerRect?.top ?? 0

  return (
    <>
      {rects.map((rect, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            top: `${rect.top - offsetY}px`,
            left: `${rect.left - offsetX}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            backgroundColor: 'rgba(0, 128, 255, 0.3)',
            border: '1px solid blue',
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  )
}

export default RectsDebugger
