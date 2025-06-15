# lib.md - Library Architecture Documentation

## Overview

The `src/lib` directory contains the core business logic for the custom contenteditable-free text editor. The library is organized into several modules that handle different aspects of cursor positioning, text navigation, and DOM manipulation.

## Directory Structure

```
src/lib/
├── caret/                    # Caret positioning and movement logic
│   ├── index.ts             # Main exports
│   ├── types.ts             # Core type definitions
│   ├── position.ts          # Position-to-rect calculations
│   ├── walker.ts            # TreeWalker for atomic elements
│   ├── navigation.ts        # Next/previous position finding
│   └── move/                # Movement algorithms
│       ├── character-movement.ts      # Character-by-character navigation
│       ├── line-movement.ts          # Vertical line navigation
│       ├── line-boundary-movement.ts # Home/End key handling
│       └── document-boundary-movement.ts # Ctrl+Home/End handling
├── constants.ts             # Global constants and CSS classes
├── debug.ts                # Visual debugging utilities
├── hotkeys.ts              # Cross-platform keyboard shortcut handling  
├── nodes.ts                # DOM node type checking utilities
└── walker.ts               # Legacy TreeWalker (being replaced by caret/walker.ts)
```

## Core Modules

### 1. Caret System (`/caret`)

The caret system is the heart of the editor's cursor positioning logic.

#### **types.ts**
- Defines `CaretPosition` interface: `{ node: Node, offset: number }`
- Core data structure representing logical cursor position in DOM

#### **position.ts** 
- `getRectsForPosition()`: Converts logical positions to visual DOMRects
- Handles both text nodes (caret positioning) and atomic elements (boundary positioning)
- Adjusts rect heights for consistent cursor appearance

#### **walker.ts**
- `createCaretWalker()`: Creates TreeWalker for navigating atomic elements and text nodes
- Filters for `ATOMIC_ELEMENTS` (TABLE, HR, BR) and text nodes
- Replaces the legacy walker.ts implementation

#### **navigation.ts**
- `getNextCaretPosition()` / `getPreviousCaretPosition()`: Find adjacent logical positions
- Handles transitions between text nodes and atomic elements
- Core building blocks for character movement

#### **Movement Algorithms (`/move`)**

**character-movement.ts**: 
- Left/Right arrow key navigation
- Character-by-character traversal through text and atomic elements

**line-movement.ts**:
- Up/Down arrow key navigation with Goal-X coordinate preservation
- Complex vertical overlap calculations to find appropriate target lines
- Uses generators for efficient rect enumeration
- Handles multi-line text wrapping edge cases

**line-boundary-movement.ts**:
- Home/End key functionality
- Finds visual line start/end positions by analyzing DOMRects
- Groups rects by vertical overlap to identify line boundaries

**document-boundary-movement.ts**:
- Ctrl+Home/Ctrl+End functionality  
- Document-wide navigation to absolute start/end positions

### 2. Supporting Utilities

#### **constants.ts**
- `STANDARD_LINE_HEIGHT`: Minimum cursor height (20px)
- `CURSOR_BLINK_RESET_DELAY`: Animation timing (500ms)
- `CSS_CLASSES`: Centralized CSS class names for atomic components, cursors, etc.

#### **hotkeys.ts**
- Cross-platform keyboard shortcut parsing and matching
- Handles Mac Cmd vs PC Ctrl modifier key differences
- `createHotkeyHandler()`: Builds configurable keydown event handlers
- Supports hotkey string format: "mod+shift+arrow"

#### **nodes.ts**
- Type guard utilities: `isTextNode()`, `isElementNode()`
- Clean DOM node type checking without repetitive code

#### **debug.ts**
- `visualizeRect()` / `visualizeRects()`: Visual debugging overlays
- Creates temporary colored outlines over DOMRects for development
- Fade-out animations for non-intrusive debugging

## Key Architecture Concepts

### Atomic Components
Elements marked with `.atomic-component` CSS class are treated as single, indivisible units. The cursor can only be positioned before (offset: 0) or after (offset: 1) these elements, never inside them. Examples: tables, horizontal rules, mentions.

### Goal-X Coordinate
When navigating vertically (Up/Down arrows), the editor maintains the horizontal "goal" position to provide consistent cursor behavior across lines of varying lengths. This prevents cursor drift during vertical navigation.

### Position vs Rect Separation
The architecture clearly separates logical positions (`CaretPosition`) from visual rectangles (`DOMRect`). This allows the editor to work with abstract cursor positions while rendering them at precise pixel locations.

### TreeWalker Strategy
Custom TreeWalker implementations filter the DOM to only traverse relevant nodes (text nodes and atomic elements), skipping container elements like `<p>`, `<div>`, etc. This simplifies navigation logic.

## Integration Points

The lib modules integrate with the main application through:
- React hooks in `src/hooks/` that wrap lib functions in reactive state
- Main App.tsx imports core functions for mouse/keyboard event handling
- Selection system (not yet fully implemented in lib/) for range-based operations

## Migration Notes

The codebase is currently migrating from legacy implementations:
- `lib/walker.ts` → `lib/caret/walker.ts` (in progress)
- Some position/selection functions may be implemented directly in App.tsx and need extraction to lib/