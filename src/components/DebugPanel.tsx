import React from 'react'
import type { CursorPosition } from '../types'

interface StyledRect {
  top: number
  left: number
  width: number
  height: number
}

interface DebugPanelProps {
  anchor: CursorPosition | null
  focus: CursorPosition | null
  goalX: number | null
  isDragging: boolean
  isBlinking: boolean
  selectionRects: StyledRect[]
}

const DebugPanel: React.FC<DebugPanelProps> = ({ anchor, focus, goalX, isDragging, isBlinking, selectionRects }) => {
  const isCollapsed = anchor && focus && anchor.node === focus.node && anchor.offset === focus.offset

  const createPositionObject = (position: CursorPosition | null) => {
    if (!position) return null

    const { node, offset } = position
    return {
      offset,
      nodeType: node.nodeType === Node.TEXT_NODE ? 'Text Node' : node.nodeType === Node.ELEMENT_NODE ? 'Element Node' : 'Other',
      nodeName: node.nodeName,
      textContent: node.textContent,
    }
  }

  const debugData = {
    selectionActive: !isCollapsed,
    isDragging,
    isBlinking,
    goalX: goalX !== null ? Math.round(goalX) : null,
    anchor: createPositionObject(anchor),
    focus: createPositionObject(focus),
    selectionRects: selectionRects.map((rect) => ({
      ...rect,
      top: Math.round(rect.top),
      left: Math.round(rect.left),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    })),
  }

  return (
    <div className="debug-panel">
      <h2>Debug Inspector</h2>
      <pre
        contentEditable="plaintext-only"
        style={{
          width: '100%',
          fontFamily: 'monospace',
          fontSize: '9px',
          color: '#000',
          padding: '6px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          backgroundColor: '#f8f8f8',
          resize: 'vertical',
          overflow: 'auto',
          minHeight: '180px',
          margin: 0,
          boxSizing: 'border-box',
        }}
      >
        {JSON.stringify(debugData, null, 2)}
      </pre>
    </div>
  )
}

export default DebugPanel
