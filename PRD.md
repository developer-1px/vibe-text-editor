# Product Requirements Document (PRD)
## Vibe Text Editor - Caret & Cursor Implementation

### Overview
This document outlines the implementation specifications for the caret and cursor functionality in the Vibe Text Editor, a contenteditable-free rich text editor that provides precise cursor control and text selection capabilities.

## Core Concepts

### 1. Cursor Position Model
- **CursorPosition Interface**: `{ node: Node, offset: number }`
- **Dual Cursor System**: 
  - `anchorPosition`: Selection start point (fixed during selection)
  - `focusPosition`: Active cursor position (moves during selection)
- **Atomic Components**: DOM elements treated as single character units (tables, mentions, etc.)

### 2. Navigation Principles
- **Logical Navigation**: TreeWalker-based traversal that respects atomic component boundaries
- **Goal-X Maintenance**: Horizontal position preservation during vertical movement
- **Atomic Component Handling**: Internal navigation prohibited, cursor positioned before/after only

## Detailed Specifications

### Cursor Movement

#### 1. Mouse Click Navigation
- **Primary Click**: Positions cursor at exact click coordinates using `document.caretPositionFromPoint()`
- **Atomic Component Click**: 
  - Left half of component: cursor positioned at offset 0 (before)
  - Right half of component: cursor positioned at offset 1 (after)
- **Empty Area Fallback**: Click on padding/empty space moves cursor to nearest block end
- **Multi-click Support**:
  - Double-click: Word selection using browser's native word boundary detection
  - Triple-click: Block selection from first to last logical node

#### 2. Keyboard Navigation

##### Left/Right Arrow Keys
- **Text Nodes**: Character-by-character movement
- **Atomic Components**: 
  - From offset 0 to 1 or vice versa (internal navigation)
  - Cross-boundary navigation to adjacent logical nodes
- **Selection Handling**: Non-extending movement collapses to selection start/end

##### Up/Down Arrow Keys
- **Goal-X Preservation**: Maintains horizontal target coordinate across vertical moves
- **Standard Line Height**: Uses 14px constant for movement calculations
- **Atomic Component Navigation**: Positions cursor at appropriate offset based on Goal-X
- **Boundary Detection**: Uses line height threshold to detect actual line changes

##### Home/End Keys
- **Line Boundary Movement**: Start/end of visual line using coordinate-based detection
- **Editor Boundary** (Cmd+Arrow): First/last logical node in editor

##### Selection Extension
- **Shift Modifier**: All movement keys support selection extension
- **Anchor Preservation**: Selection start point remains fixed during extension
- **Selection Collapse**: Non-shift movement resets anchor to focus position

### Text Selection

#### 1. Selection Model
- **Boundary Calculation**: Start/end positions determined by document position comparison
- **Visual Rendering**: Custom highlight rectangles instead of native selection
- **Multi-line Support**: Three-part rendering (first line, middle block, last line)

#### 2. Selection Methods
- **Drag Selection**: Mouse down + move with real-time focus position updates
- **Keyboard Selection**: Shift + navigation keys
- **Word Selection**: Double-click with browser word boundary detection
- **Block Selection**: Triple-click selecting entire logical block
- **Select All**: Cmd+A from first to last logical node

### Atomic Components

#### 1. Definition
Elements with `atomic-component` CSS class that function as single characters:
- Tables
- Mentions (@user references)
- Other complex inline components

#### 2. Navigation Rules
- **No Internal Navigation**: Cursor cannot be positioned inside atomic components
- **Binary Positioning**: Only offset 0 (before) or 1 (after) allowed
- **TreeWalker Filtering**: Child nodes excluded from logical traversal
- **Click Handling**: Position determined by click location relative to component center

### Visual Implementation

#### 1. Custom Cursor
- **Positioning**: Absolute positioning based on `getPositionRect()` calculations
- **Height Adaptation**: Matches line height of current text context
- **Blink Animation**: CSS-based with user interaction pause (500ms delay)
- **Scroll Behavior**: Auto-scroll to keep cursor visible

#### 2. Selection Highlighting
- **Custom Rectangles**: Positioned div elements instead of native selection
- **Multi-line Rendering**: 
  - Single line: Simple rectangle from start to end
  - Multi-line: First line + middle block + last line
- **Coordinate Precision**: Integer pixel calculations for consistent rendering

### Technical Architecture

#### 1. Core Functions
- **Position Calculation**: `getPositionRect()` for cursor/selection coordinates
- **Navigation**: `moveLeft()`, `moveRight()` for lateral movement logic
- **Boundary Detection**: `getSelectionBoundary()` for start/end calculation
- **Node Traversal**: TreeWalker-based logical node navigation

#### 2. State Management
- **React Hooks**: useState for cursor/selection state
- **Goal-X Tracking**: Maintained across vertical movements
- **Blink Control**: Timer-based animation management
- **Drag State**: Mouse interaction state tracking

#### 3. Event Handling
- **Hotkey System**: Configurable keyboard shortcut mapping
- **Mouse Events**: Click, drag, and selection handling
- **Keyboard Events**: Arrow keys, modifiers, and special keys
- **Focus Management**: Editor focus and blur handling

### Performance Considerations
- **Coordinate Caching**: Goal-X preservation for vertical movement
- **Event Optimization**: Batched state updates during drag operations
- **Render Optimization**: Conditional cursor/selection rendering
- **Memory Management**: Timer cleanup and event listener management

### Browser Compatibility
- **Modern Browser Support**: Chrome, Firefox, Safari, Edge
- **API Dependencies**: `document.caretPositionFromPoint()`, TreeWalker API
- **Fallback Handling**: Graceful degradation for unsupported features
- **Platform Detection**: Mac vs. PC modifier key handling

---

*This specification serves as the foundation for the contenteditable-free text editor implementation, ensuring consistent and predictable cursor behavior across all interaction modes.*