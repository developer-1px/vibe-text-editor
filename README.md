# Vibe Text Editor

> A revolutionary contenteditable-free rich text editor framework for React

[![npm version](https://badge.fury.io/js/vibe-text-editor.svg)](https://www.npmjs.com/package/vibe-text-editor)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18+-61dafb.svg)](https://reactjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- 🚫 **ContentEditable-Free**: No more browser inconsistencies and unpredictable behavior
- 🎯 **Precise Control**: Custom cursor positioning and selection system
- ⚡ **Performance**: Efficient rendering with minimal re-renders
- 🔧 **TypeScript First**: Complete type safety with rich IntelliSense
- 🎨 **Atomic Components**: Tables, images, and custom widgets as single units
- ⌨️ **Rich Keyboard Support**: All standard editor shortcuts with customization
- 🖱️ **Advanced Mouse Interaction**: Click, drag, double-click, triple-click
- 📱 **Framework Ready**: Built for React, portable to other frameworks

## 🚀 Quick Start

### Installation

```bash
npm install vibe-text-editor
# or
yarn add vibe-text-editor
# or
pnpm add vibe-text-editor
```

### Basic Usage

```tsx
import React, { useRef } from 'react'
import { useSelection, useCursor, useKeyboardHandlers } from 'vibe-text-editor'
import 'vibe-text-editor/styles.css'

function MyEditor() {
  const editorRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)

  const {
    anchorPosition,
    focusPosition,
    selectionRects,
    updateSelection,
    moveSelectionBy,
    extendSelectionBy,
  } = useSelection()

  const { isBlinking, resetBlink } = useCursor()

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
    <div
      ref={editorRef}
      className="vibe-editor"
      onKeyDown={hotkeyHandler}
      tabIndex={0}
    >
      <div 
        ref={cursorRef} 
        className={`vibe-cursor ${isBlinking ? 'blinking' : ''}`} 
      />
      
      {selectionRects.map((rect, i) => (
        <div key={i} className="vibe-selection" style={rect} />
      ))}
      
      <p>Start editing here...</p>
      
      <table className="atomic-component">
        <tr><td>Atomic</td><td>Table</td></tr>
      </table>
    </div>
  )
}
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│                 Vibe Editor                 │
├─────────────────────────────────────────────┤
│  React Layer                                │
│  ├── useSelection (State Management)       │
│  ├── useKeyboardHandlers (Input)           │
│  └── useCursor (Visual Feedback)           │
├─────────────────────────────────────────────┤
│  Core Engine                                │
│  ├── CaretPosition (Rich Positioning)      │
│  ├── Selection (Range Management)          │
│  ├── TreeWalker (DOM Navigation)           │
│  └── Hotkeys (Cross-platform Input)        │
├─────────────────────────────────────────────┤
│  Browser APIs                              │
│  ├── document.caretPositionFromPoint()     │
│  ├── Range API                             │
│  └── TreeWalker                            │
└─────────────────────────────────────────────┘
```

## 💡 Why Vibe Editor?

### The Problem

Traditional rich text editors rely on `contenteditable`, which brings:
- **Browser Inconsistencies**: Different behavior across browsers
- **Unpredictable DOM**: Uncontrolled mutations and formatting
- **Selection Issues**: Cursor positioning bugs around complex elements
- **Performance Problems**: Heavy re-renders and memory leaks

### Our Solution

Vibe Editor completely avoids `contenteditable` and implements:
- **Custom Cursor System**: Precise positioning with `document.caretPositionFromPoint()`
- **Rich Selection Model**: Direction-aware selections with visual highlighting
- **Atomic Components**: Tables, widgets, and media as single navigable units
- **Predictable Behavior**: Consistent experience across all browsers

## 🎯 Key Concepts

### CaretPosition

Rich cursor positioning with navigation methods:

```typescript
import { CaretPosition } from 'vibe-text-editor'

// Create positions
const start = CaretPosition.documentStart(editor)
const end = CaretPosition.documentEnd(editor)

// Navigate
const next = position.next(editor)
const nextLine = position.nextLine(editor, goalX)

// Compare
const isBefore = pos1.isBefore(pos2)
```

### Selection

Advanced selection management:

```typescript
import { Selection } from 'vibe-text-editor'

// Create selections
const selection = new Selection(anchor, focus)

// Query state
const direction = selection.getDirection()
const text = selection.toString()

// Manipulate
const extended = selection.extend(newFocus)
const collapsed = selection.collapseToStart()
```

### Atomic Components

Mark elements as single units:

```tsx
// Tables treated as atomic
<table className="atomic-component">
  <tr><td>Cell 1</td><td>Cell 2</td></tr>
</table>

// Custom widgets
<div className="atomic-component custom-widget">
  <MyWidget />
</div>
```

## 🎮 Interactive Demo

Try our [live demo](https://vibe-editor-demo.vercel.app) to experience:
- ✅ Precise cursor positioning
- ✅ Smooth keyboard navigation  
- ✅ Advanced selection operations
- ✅ Atomic component interaction
- ✅ Cross-browser consistency

## 📚 Documentation

- [🎯 Tutorial](./docs/Tutorial.md) - Step-by-step integration guide
- [📖 API Reference](./docs/Reference.md) - Complete API documentation
- [🏗️ Background](./docs/Background.md) - Architecture and design principles
- [🧪 Examples](./examples/) - Real-world implementation examples

## 🌟 Examples

### Basic Rich Text Editor

```tsx
import { VibeEditor, Toolbar } from 'vibe-text-editor'

function RichTextEditor() {
  return (
    <div>
      <Toolbar tools={['bold', 'italic', 'link', 'image']} />
      <VibeEditor
        placeholder="Start writing..."
        onChange={handleChange}
        onSelectionChange={handleSelectionChange}
      />
    </div>
  )
}
```

### Collaborative Editor

```tsx
import { useCollaboration } from 'vibe-text-editor/collaboration'

function CollaborativeEditor() {
  const { participants, operations } = useCollaboration({
    documentId: 'doc-123',
    userId: 'user-456',
  })

  return (
    <VibeEditor
      operations={operations}
      participants={participants}
      onOperation={handleOperation}
    />
  )
}
```

### Custom Atomic Components

```tsx
function CustomEditor() {
  const insertChart = useCallback(() => {
    const chartWidget = (
      <div className="atomic-component chart-widget">
        <ChartRenderer data={chartData} />
      </div>
    )
    insertAtCursor(chartWidget)
  }, [])

  return (
    <div>
      <button onClick={insertChart}>Insert Chart</button>
      <VibeEditor />
    </div>
  )
}
```

## 🔌 Plugin Ecosystem

Extend Vibe Editor with plugins:

```tsx
import { usePlugin } from 'vibe-text-editor/plugins'
import { MathPlugin } from '@vibe/plugin-math'
import { TablePlugin } from '@vibe/plugin-table'
import { CollaborationPlugin } from '@vibe/plugin-collaboration'

function AdvancedEditor() {
  usePlugin(MathPlugin, { delimiters: ['$', '$$'] })
  usePlugin(TablePlugin, { resizable: true })
  usePlugin(CollaborationPlugin, { server: 'ws://localhost:8080' })

  return <VibeEditor />
}
```

## 🧪 Testing

Comprehensive test utilities:

```tsx
import { render, fireEvent } from '@testing-library/react'
import { createEditorTestUtils } from 'vibe-text-editor/testing'

test('cursor navigation', () => {
  const { getByTestId } = render(<MyEditor />)
  const editor = getByTestId('editor')
  
  const utils = createEditorTestUtils(editor)
  
  utils.setCursor(0, 5)
  utils.pressKey('ArrowRight')
  
  expect(utils.getCursorPosition()).toEqual({ node: textNode, offset: 6 })
})
```

## 🎨 Styling

Fully customizable with CSS:

```css
.vibe-editor {
  /* Editor container */
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  line-height: 1.6;
}

.vibe-cursor {
  /* Custom cursor */
  background: #007acc;
  width: 2px;
}

.vibe-selection {
  /* Selection highlight */
  background: rgba(0, 123, 255, 0.3);
}

.atomic-component {
  /* Atomic elements */
  border: 2px solid #007acc;
  user-select: none;
}
```

## 🚧 Roadmap

### Current (v1.0)
- ✅ Core cursor and selection system
- ✅ Keyboard navigation
- ✅ Atomic component support
- ✅ TypeScript definitions

### Next (v1.1)
- [ ] Text editing operations
- [ ] Undo/redo system
- [ ] Copy/paste functionality
- [ ] Basic formatting

### Future (v2.0)
- [ ] Plugin architecture
- [ ] Collaborative editing
- [ ] Mobile support
- [ ] Performance optimizations

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/vibe-text-editor/vibe.git
cd vibe

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Build library
pnpm build
```

## 📄 License

MIT © [Vibe Text Editor](https://github.com/vibe-text-editor)

## 🙏 Acknowledgments

- Inspired by [ProseMirror](https://prosemirror.net/)'s architecture
- Cursor positioning techniques from modern editors
- Community feedback and contributions

---

<div align="center">
  <strong>
    <a href="https://vibe-editor.dev">Website</a> •
    <a href="./docs/Tutorial.md">Tutorial</a> •
    <a href="./docs/Reference.md">API</a> •
    <a href="https://discord.gg/vibe-editor">Discord</a>
  </strong>
</div>