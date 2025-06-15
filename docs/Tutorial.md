# Tutorial: Getting Started with Vibe Text Editor

## Introduction

This tutorial will guide you through integrating Vibe Text Editor into your React application. By the end, you'll have a fully functional rich text editor with custom cursor positioning and selection capabilities.

## Prerequisites

- Node.js 16+ and npm/yarn/pnpm
- React 18+ knowledge
- Basic TypeScript familiarity
- Understanding of modern web APIs

## Installation

```bash
npm install vibe-text-editor
# or
yarn add vibe-text-editor
# or
pnpm add vibe-text-editor
```

## Quick Start

### 1. Basic Editor Setup

Create a simple editor component:

```tsx
import React from 'react'
import { useSelection, useCursor, useKeyboardHandlers } from 'vibe-text-editor'
import 'vibe-text-editor/styles.css'

function MyEditor() {
  const editorRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)

  // Enhanced selection management
  const {
    anchorPosition,
    focusPosition,
    selectionRects,
    updateSelection,
    moveSelectionBy,
    extendSelectionBy,
  } = useSelection()

  // Cursor blinking and visual feedback
  const { isBlinking, resetBlink } = useCursor()

  // Keyboard navigation handlers
  const { hotkeyHandler } = useKeyboardHandlers({
    focusPosition,
    anchorPosition,
    editorRef,
    resetBlink,
    updateSelection,
    moveSelectionBy,
    extendSelectionBy,
  })

  return (
    <div className="editor-container">
      <div
        ref={editorRef}
        className="vibe-editor"
        onKeyDown={hotkeyHandler}
        tabIndex={0}
      >
        {/* Cursor rendering */}
        <div 
          ref={cursorRef} 
          className={`vibe-cursor ${isBlinking ? 'blinking' : ''}`} 
        />
        
        {/* Selection highlighting */}
        {selectionRects.map((rect, i) => (
          <div
            key={i}
            className="vibe-selection"
            style={{
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            }}
          />
        ))}
        
        {/* Your content */}
        <p>Start typing here...</p>
      </div>
    </div>
  )
}
```

### 2. Add Mouse Interaction

Implement click and drag selection:

```tsx
import { findPositionFromPoint } from 'vibe-text-editor/utils'

// Add to your component
const handleMouseDown = useCallback((e: React.MouseEvent) => {
  const position = findPositionFromPoint(e.clientX, e.clientY, editorRef.current)
  if (position) {
    if (e.shiftKey) {
      // Extend selection
      updateSelection(anchorPosition, position)
    } else {
      // Start new selection
      startDragging(position)
    }
    resetBlink()
  }
}, [anchorPosition, updateSelection, startDragging, resetBlink])

// Add onMouseDown={handleMouseDown} to your editor div
```

### 3. Handle Atomic Components

Mark special elements as atomic components:

```tsx
function MyEditor() {
  return (
    <div className="vibe-editor" /* ... other props */>
      <p>Regular text content</p>
      
      {/* Tables are treated as single units */}
      <table className="atomic-component">
        <tr>
          <td>Cell 1</td>
          <td>Cell 2</td>
        </tr>
      </table>
      
      <p>More text content</p>
      
      {/* Custom components can also be atomic */}
      <div className="atomic-component custom-widget">
        <CustomWidget data={widgetData} />
      </div>
    </div>
  )
}
```

## Advanced Usage

### Custom Keyboard Shortcuts

```tsx
import { createHotkeyHandler } from 'vibe-text-editor/hotkeys'

const customHotkeys = createHotkeyHandler([
  {
    hotkey: 'mod+b',
    handler: () => toggleBold(),
    preventDefault: true,
  },
  {
    hotkey: 'mod+i',
    handler: () => toggleItalic(),
    preventDefault: true,
  },
  {
    hotkey: 'mod+k',
    handler: () => insertLink(),
    preventDefault: true,
  },
])

// Combine with default handlers
const combinedHandler = (e: KeyboardEvent) => {
  customHotkeys(e)
  hotkeyHandler(e)
}
```

### Working with CaretPosition

```tsx
import { CaretPosition } from 'vibe-text-editor/core'

// Create positions programmatically
const startPos = CaretPosition.documentStart(editorRef.current)
const endPos = CaretPosition.documentEnd(editorRef.current)

// Navigate between positions
const nextPos = currentPos.next(editorRef.current)
const prevPos = currentPos.previous(editorRef.current)

// Line navigation with Goal-X
const nextLinePos = currentPos.nextLine(editorRef.current, goalX)

// Range operations
const range = CaretPosition.createRange(startPos, endPos)
const textContent = range.toString()
```

### Selection Management

```tsx
import { Selection } from 'vibe-text-editor/core'

// Create selections
const selection = new Selection(anchorPos, focusPos)

// Query selection properties
const direction = selection.getDirection() // 'forward' | 'backward' | 'none'
const isCollapsed = selection.isCollapsed()
const bounds = selection.getBounds()

// Manipulate selections
const extended = selection.extend(newFocusPos)
const collapsed = selection.collapseToStart()

// Get selection content
const text = selection.toString()
const rects = selection.getSelectionRects(editorRect)
```

## Styling

### Basic CSS

```css
.vibe-editor {
  position: relative;
  padding: 20px;
  outline: none;
  cursor: text;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  line-height: 1.6;
}

.vibe-cursor {
  position: absolute;
  width: 1px;
  background: #000;
  pointer-events: none;
  z-index: 10;
}

.vibe-cursor.blinking {
  animation: blink 1s infinite;
}

.vibe-selection {
  position: absolute;
  background: rgba(0, 123, 255, 0.3);
  pointer-events: none;
}

.atomic-component {
  user-select: none;
  cursor: pointer;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
```

### Dark Theme Support

```css
.vibe-editor.dark {
  background: #1a1a1a;
  color: #e0e0e0;
}

.vibe-editor.dark .vibe-cursor {
  background: #ffffff;
}

.vibe-editor.dark .vibe-selection {
  background: rgba(255, 255, 255, 0.2);
}
```

## Testing Your Editor

### Unit Tests

```tsx
import { render, fireEvent } from '@testing-library/react'
import { CaretPosition, Selection } from 'vibe-text-editor/core'

describe('Editor Navigation', () => {
  test('cursor moves with arrow keys', () => {
    const { container } = render(<MyEditor />)
    const editor = container.querySelector('.vibe-editor')
    
    // Focus editor
    editor?.focus()
    
    // Simulate arrow key
    fireEvent.keyDown(editor, { key: 'ArrowRight' })
    
    // Assert cursor position changed
    // ... test implementation
  })
  
  test('selection extends with shift+arrow', () => {
    // ... test implementation
  })
})
```

### Integration Tests

```tsx
import { act, renderHook } from '@testing-library/react'
import { useSelection } from 'vibe-text-editor'

describe('Selection Hook', () => {
  test('manages selection state correctly', () => {
    const { result } = renderHook(() => useSelection())
    
    act(() => {
      result.current.updateSelection(mockAnchor, mockFocus)
    })
    
    expect(result.current.anchorPosition).toEqual(mockAnchor)
    expect(result.current.focusPosition).toEqual(mockFocus)
  })
})
```

## Common Patterns

### Undo/Redo Implementation

```tsx
function useEditorHistory() {
  const [history, setHistory] = useState<EditorState[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  
  const saveState = useCallback((state: EditorState) => {
    setHistory(prev => [...prev.slice(0, currentIndex + 1), state])
    setCurrentIndex(prev => prev + 1)
  }, [currentIndex])
  
  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
      return history[currentIndex - 1]
    }
  }, [currentIndex, history])
  
  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(prev => prev + 1)
      return history[currentIndex + 1]
    }
  }, [currentIndex, history])
  
  return { saveState, undo, redo }
}
```

### Custom Component Integration

```tsx
function MyCustomEditor() {
  const insertWidget = useCallback((type: string, data: any) => {
    const widget = (
      <div className="atomic-component custom-widget" data-type={type}>
        <WidgetRenderer type={type} data={data} />
      </div>
    )
    
    // Insert at current cursor position
    insertAtPosition(focusPosition, widget)
  }, [focusPosition])
  
  return (
    <div>
      <Toolbar onInsertWidget={insertWidget} />
      <Editor />
    </div>
  )
}
```

## Troubleshooting

### Common Issues

1. **Cursor not appearing**: Ensure editor has `tabIndex={0}` and is focused
2. **Selection not working**: Check that mouse handlers are properly attached
3. **Keyboard shortcuts conflicting**: Use `preventDefault: true` in hotkey configs
4. **Performance issues**: Consider virtualization for large documents

### Debug Mode

```tsx
import { DebugPanel } from 'vibe-text-editor/debug'

function MyEditor() {
  return (
    <>
      <Editor />
      {process.env.NODE_ENV === 'development' && (
        <DebugPanel
          anchor={anchorPosition}
          focus={focusPosition}
          selection={selection}
        />
      )}
    </>
  )
}
```

## Next Steps

- Explore the [Reference](./Reference.md) for complete API documentation
- Check out [Examples](./examples/) for real-world implementations
- Join our [Discord](https://discord.gg/vibe-editor) for community support
- Contribute to the project on [GitHub](https://github.com/vibe-text-editor/vibe)

## Resources

- [API Reference](./Reference.md)
- [Example Projects](./examples/)
- [Migration Guide](./Migration.md)
- [Plugin Development](./Plugins.md)
- [Performance Guide](./Performance.md)