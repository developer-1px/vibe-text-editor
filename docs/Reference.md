# API Reference

## Core Classes

### CaretPosition

Enhanced cursor position class with rich functionality for navigation and Range operations.

#### Constructor

```typescript
new CaretPosition(node: Node, offset: number)
```

**Parameters:**
- `node`: The DOM node containing the cursor
- `offset`: The character offset within the node

#### Static Methods

##### `fromRange(range: Range): CaretPosition`
Creates a CaretPosition from a DOM Range.

```typescript
const position = CaretPosition.fromRange(selection.getRangeAt(0))
```

##### `fromPoint(x: number, y: number): CaretPosition | null`
Creates a CaretPosition from mouse coordinates.

```typescript
const position = CaretPosition.fromPoint(e.clientX, e.clientY)
```

##### `createRange(start: CaretPosition, end: CaretPosition): Range`
Creates a DOM Range between two positions.

```typescript
const range = CaretPosition.createRange(startPos, endPos)
```

##### `documentStart(root: Node): CaretPosition | null`
Gets the first position in a document.

```typescript
const start = CaretPosition.documentStart(editorElement)
```

##### `documentEnd(root: Node): CaretPosition | null`
Gets the last position in a document.

```typescript
const end = CaretPosition.documentEnd(editorElement)
```

#### Instance Methods

##### Navigation

###### `next(root: Node): CaretPosition | null`
Gets the next character position.

```typescript
const nextPos = currentPos.next(editorElement)
```

###### `previous(root: Node): CaretPosition | null`
Gets the previous character position.

```typescript
const prevPos = currentPos.previous(editorElement)
```

###### `nextLine(root: Element, goalX?: number): CaretPosition | null`
Moves to the next line, optionally maintaining horizontal position.

```typescript
const nextLinePos = currentPos.nextLine(editorElement, 150)
```

###### `previousLine(root: Element, goalX?: number): CaretPosition | null`
Moves to the previous line, optionally maintaining horizontal position.

```typescript
const prevLinePos = currentPos.previousLine(editorElement, 150)
```

###### `lineStart(root: Element): CaretPosition | null`
Gets the start of the current line.

```typescript
const startPos = currentPos.lineStart(editorElement)
```

###### `lineEnd(root: Element): CaretPosition | null`
Gets the end of the current line.

```typescript
const endPos = currentPos.lineEnd(editorElement)
```

##### Range Operations

###### `toRange(): Range`
Creates a collapsed Range at this position.

```typescript
const range = position.toRange()
```

###### `getClientRects(): DOMRect[]`
Gets the visual rectangles for this position.

```typescript
const rects = position.getClientRects()
```

###### `getBoundingClientRect(): DOMRect | null`
Gets the bounding rectangle for this position.

```typescript
const rect = position.getBoundingClientRect()
```

##### Comparison

###### `equals(other: CaretPosition): boolean`
Checks if two positions are equal.

```typescript
const isEqual = pos1.equals(pos2)
```

###### `compareTo(other: CaretPosition): number`
Compares two positions (-1, 0, or 1).

```typescript
const comparison = pos1.compareTo(pos2)
```

###### `isBefore(other: CaretPosition): boolean`
Checks if this position comes before another.

```typescript
const isBefore = pos1.isBefore(pos2)
```

###### `isAfter(other: CaretPosition): boolean`
Checks if this position comes after another.

```typescript
const isAfter = pos1.isAfter(pos2)
```

##### Utility

###### `isValid(): boolean`
Validates the position.

```typescript
const isValid = position.isValid()
```

###### `normalize(): CaretPosition`
Returns a normalized version of the position.

```typescript
const normalized = position.normalize()
```

###### `clone(): CaretPosition`
Creates a copy of the position.

```typescript
const copy = position.clone()
```

###### `scrollIntoView(options?: ScrollIntoViewOptions): void`
Scrolls this position into view.

```typescript
position.scrollIntoView({ block: 'center' })
```

---

### Selection

Advanced selection management with anchor and focus positions.

#### Constructor

```typescript
new Selection(anchor: CaretPosition, focus?: CaretPosition)
```

**Parameters:**
- `anchor`: The anchor (start) position
- `focus`: The focus (end) position (defaults to anchor for collapsed selection)

#### Static Methods

##### `fromRange(range: Range): Selection`
Creates a Selection from a DOM Range.

```typescript
const selection = Selection.fromRange(document.getSelection().getRangeAt(0))
```

##### `collapsed(position: CaretPosition): Selection`
Creates a collapsed selection at a position.

```typescript
const selection = Selection.collapsed(position)
```

#### Properties

##### `anchor: CaretPosition`
The anchor (start) position of the selection.

##### `focus: CaretPosition`
The focus (end) position of the selection.

#### Instance Methods

##### State

###### `isCollapsed(): boolean`
Checks if the selection is collapsed (cursor mode).

```typescript
const isCollapsed = selection.isCollapsed()
```

###### `getDirection(): 'forward' | 'backward' | 'none'`
Gets the selection direction.

```typescript
const direction = selection.getDirection()
```

###### `getStart(): CaretPosition`
Gets the start position (earliest in document order).

```typescript
const start = selection.getStart()
```

###### `getEnd(): CaretPosition`
Gets the end position (latest in document order).

```typescript
const end = selection.getEnd()
```

###### `getBounds(): { start: CaretPosition, end: CaretPosition }`
Gets both start and end positions.

```typescript
const { start, end } = selection.getBounds()
```

##### Manipulation

###### `setAnchor(position: CaretPosition): Selection`
Returns a new selection with updated anchor.

```typescript
const newSelection = selection.setAnchor(newAnchor)
```

###### `setFocus(position: CaretPosition): Selection`
Returns a new selection with updated focus.

```typescript
const newSelection = selection.setFocus(newFocus)
```

###### `extend(newFocus: CaretPosition): Selection`
Extends the selection to a new focus position.

```typescript
const extended = selection.extend(newPosition)
```

###### `collapseToAnchor(): Selection`
Collapses the selection to the anchor.

```typescript
const collapsed = selection.collapseToAnchor()
```

###### `collapseToFocus(): Selection`
Collapses the selection to the focus.

```typescript
const collapsed = selection.collapseToFocus()
```

###### `collapseToStart(): Selection`
Collapses the selection to the start.

```typescript
const collapsed = selection.collapseToStart()
```

###### `collapseToEnd(): Selection`
Collapses the selection to the end.

```typescript
const collapsed = selection.collapseToEnd()
```

##### Movement

###### `move(root: Node, direction: 'forward' | 'backward', unit: Unit, rootElement?: Element): Selection | null`
Moves the entire selection.

```typescript
type Unit = 'character' | 'line' | 'lineboundary' | 'documentboundary'
const moved = selection.move(root, 'forward', 'character')
```

###### `extendMove(root: Node, direction: 'forward' | 'backward', unit: Unit, rootElement?: Element): Selection | null`
Extends the selection by moving the focus.

```typescript
const extended = selection.extendMove(root, 'forward', 'line', editorElement)
```

##### Content

###### `toString(): string`
Gets the text content of the selection.

```typescript
const text = selection.toString()
```

###### `extractContents(): DocumentFragment`
Extracts the selection contents from the DOM.

```typescript
const fragment = selection.extractContents()
```

###### `cloneContents(): DocumentFragment`
Clones the selection contents.

```typescript
const clone = selection.cloneContents()
```

###### `deleteContents(): void`
Deletes the selection contents.

```typescript
selection.deleteContents()
```

##### Visual

###### `getClientRects(): DOMRect[]`
Gets the visual rectangles for the selection.

```typescript
const rects = selection.getClientRects()
```

###### `getSelectionRects(editorRect: DOMRect): SelectionRect[]`
Gets styled selection rectangles for rendering.

```typescript
interface SelectionRect {
  top: number
  left: number
  width: number
  height: number
}

const rects = selection.getSelectionRects(editorBounds)
```

##### Queries

###### `contains(position: CaretPosition): boolean`
Checks if the selection contains a position.

```typescript
const contains = selection.contains(position)
```

###### `intersects(other: Selection): boolean`
Checks if two selections intersect.

```typescript
const intersects = selection.intersects(otherSelection)
```

---

## React Hooks

### useSelection

Main hook for managing editor selection state.

#### Usage

```typescript
const {
  // State (backward compatible)
  anchorPosition,
  focusPosition,
  selectionRects,
  goalX,
  isDragging,
  
  // Enhanced state
  selection,
  
  // Basic operations
  updateCursorPosition,
  updateSelection,
  startDragging,
  updateDragFocus,
  stopDragging,
  updateSelectionRects,
  setGoalX,
  
  // Enhanced operations
  moveSelectionBy,
  extendSelectionBy,
  getSelectionDirection,
  collapseSelection,
  getSelectionBounds,
  getSelectionText,
  containsPosition,
  calculateSelectionRects,
} = useSelection()
```

#### Return Value

##### State Properties

- `anchorPosition: CursorPosition | null` - Anchor position as plain object
- `focusPosition: CursorPosition | null` - Focus position as plain object
- `selectionRects: SelectionRect[]` - Visual selection rectangles
- `goalX: number | null` - Target X coordinate for line navigation
- `isDragging: boolean` - Whether drag selection is active
- `selection: Selection | null` - Enhanced selection object

##### Basic Methods

- `updateCursorPosition(position: CursorPosition | CaretPosition): void`
- `updateSelection(anchor: CursorPosition | CaretPosition | null, focus: CursorPosition | CaretPosition | null): void`
- `startDragging(initialPosition: CursorPosition | CaretPosition): void`
- `updateDragFocus(newFocus: CursorPosition | CaretPosition): void`
- `stopDragging(): void`
- `updateSelectionRects(rects: SelectionRect[]): void`
- `setGoalX(x: number | null): void`

##### Enhanced Methods

- `moveSelectionBy(root: Node, direction: 'forward' | 'backward', unit: Unit, rootElement?: Element): void`
- `extendSelectionBy(root: Node, direction: 'forward' | 'backward', unit: Unit, rootElement?: Element): void`
- `getSelectionDirection(): 'forward' | 'backward' | 'none'`
- `collapseSelection(toStart?: boolean): void`
- `getSelectionBounds(): { start: CaretPosition, end: CaretPosition } | null`
- `getSelectionText(): string`
- `containsPosition(position: CursorPosition | CaretPosition): boolean`
- `calculateSelectionRects(editorRect: DOMRect): SelectionRect[]`

### useCursor

Hook for managing cursor visual state and blinking.

#### Usage

```typescript
const { isBlinking, resetBlink } = useCursor()
```

#### Return Value

- `isBlinking: boolean` - Whether cursor should be blinking
- `resetBlink(): void` - Resets cursor blinking animation

### useKeyboardHandlers

Hook for handling keyboard navigation and shortcuts.

#### Usage

```typescript
const { hotkeyHandler, getRectForPosition } = useKeyboardHandlers({
  focusPosition,
  anchorPosition,
  goalX,
  editorRef,
  resetBlink,
  updateSelection,
  setGoalX,
  moveSelectionBy,
  extendSelectionBy,
})
```

#### Parameters

```typescript
interface UseKeyboardHandlersProps {
  focusPosition: CursorPosition | null
  anchorPosition: CursorPosition | null
  goalX: number | null
  editorRef: React.RefObject<HTMLElement>
  resetBlink: () => void
  updateSelection: (anchor: CursorPosition | null, focus: CursorPosition | null) => void
  setGoalX: (x: number | null) => void
  moveSelectionBy?: (root: Node, direction: 'forward' | 'backward', unit: Unit, rootElement?: Element) => void
  extendSelectionBy?: (root: Node, direction: 'forward' | 'backward', unit: Unit, rootElement?: Element) => void
}
```

#### Return Value

- `hotkeyHandler: (e: KeyboardEvent) => void` - Keyboard event handler
- `getRectForPosition: (position: CursorPosition) => DOMRect | null` - Position to rect utility

---

## Utility Functions

### Position Utilities

#### `findPositionFromPoint(clientX: number, clientY: number, container: HTMLElement): CursorPosition | null`

Finds cursor position from mouse coordinates.

```typescript
const position = findPositionFromPoint(e.clientX, e.clientY, editorElement)
```

#### `arePositionsEqual(pos1: CursorPosition | null, pos2: CursorPosition | null): boolean`

Compares two cursor positions for equality.

```typescript
const isEqual = arePositionsEqual(anchor, focus)
```

#### `getRectForPosition(position: CursorPosition): DOMRect | null`

Gets bounding rectangle for a position.

```typescript
const rect = getRectForPosition(position)
```

### Node Utilities

#### `isTextNode(node: Node): node is Text`

Type guard for text nodes.

```typescript
if (isTextNode(node)) {
  console.log(node.textContent)
}
```

#### `isElementNode(node: Node): node is Element`

Type guard for element nodes.

```typescript
if (isElementNode(node)) {
  console.log(node.tagName)
}
```

#### `isAtomicComponent(node: Node): boolean`

Checks if a node is an atomic component.

```typescript
const isAtomic = isAtomicComponent(node)
```

#### `findParentAtomicComponent(element: Element): HTMLElement | null`

Finds the nearest atomic component ancestor.

```typescript
const atomicParent = findParentAtomicComponent(element)
```

#### `findNearestBlock(node: Node): Element | null`

Finds the nearest block-level element.

```typescript
const blockElement = findNearestBlock(node)
```

### Selection Utilities

#### `selectWord(position: CursorPosition): SelectionRange | null`

Selects the word at a given position.

```typescript
interface SelectionRange {
  anchorPos: CursorPosition
  focusPos: CursorPosition
}

const wordSelection = selectWord(position)
```

#### `selectBlock(position: CursorPosition): BlockSelection | null`

Selects the block containing a position.

```typescript
interface BlockSelection {
  startPos: CursorPosition
  endPos: CursorPosition
}

const blockSelection = selectBlock(position)
```

#### `calculateSelectionRects(anchorPosition: CursorPosition | null, focusPosition: CursorPosition | null, containerRect: DOMRect): SelectionRect[]`

Calculates visual selection rectangles.

```typescript
const rects = calculateSelectionRects(anchor, focus, editorBounds)
```

### Hotkey System

#### `createHotkeyHandler(configs: HotkeyConfig[]): (event: KeyboardEvent) => void`

Creates a keyboard shortcut handler.

```typescript
interface HotkeyConfig {
  hotkey: string
  handler: (event: KeyboardEvent) => void
  preventDefault?: boolean
}

const handler = createHotkeyHandler([
  {
    hotkey: 'mod+b',
    handler: () => toggleBold(),
    preventDefault: true,
  },
  {
    hotkey: 'shift+enter',
    handler: () => insertLineBreak(),
  },
])
```

#### Hotkey Format

Hotkeys use a simple string format with modifiers:

- `mod` - Cmd on Mac, Ctrl on Windows/Linux
- `ctrl` - Ctrl key
- `shift` - Shift key
- `alt` - Alt/Option key
- `meta` - Meta/Cmd key

Examples:
- `'mod+a'` - Select all
- `'shift+arrow_right'` - Extend selection right
- `'ctrl+shift+arrow_up'` - Extend selection up
- `'alt+arrow_left'` - Word navigation

---

## Type Definitions

### Core Types

```typescript
// Basic cursor position
interface CursorPosition {
  node: Node
  offset: number
}

// Enhanced cursor position interface
interface CaretPositionInterface extends CursorPosition {}

// Selection rectangle for rendering
interface SelectionRect {
  top: number
  left: number
  width: number
  height: number
}

// Selection range
interface SelectionRange {
  anchorPos: CursorPosition
  focusPos: CursorPosition
}

// Block selection
interface BlockSelection {
  startPos: CursorPosition
  endPos: CursorPosition
}

// Navigation units
type NavigationUnit = 'character' | 'line' | 'lineboundary' | 'documentboundary'

// Selection direction
type SelectionDirection = 'forward' | 'backward' | 'none'
```

### Hotkey Types

```typescript
interface Hotkey {
  meta: boolean
  ctrl: boolean
  shift: boolean
  alt: boolean
  key: string
}

interface HotkeyConfig {
  hotkey: string
  handler: (event: KeyboardEvent) => void
  preventDefault?: boolean
}
```

---

## Error Handling

### Common Exceptions

#### `InvalidPositionError`
Thrown when trying to create an invalid cursor position.

```typescript
try {
  const position = new CaretPosition(node, -1) // Invalid offset
} catch (error) {
  if (error instanceof InvalidPositionError) {
    // Handle invalid position
  }
}
```

#### `RangeCreationError`
Thrown when Range creation fails.

```typescript
try {
  const range = CaretPosition.createRange(start, end)
} catch (error) {
  if (error instanceof RangeCreationError) {
    // Handle range creation failure
  }
}
```

### Best Practices

1. **Always validate positions** before using them
2. **Handle null returns** from navigation methods
3. **Use try-catch** for Range operations
4. **Check element validity** before DOM operations

```typescript
// Good practice
const nextPos = currentPos.next(root)
if (nextPos && nextPos.isValid()) {
  updateCursorPosition(nextPos)
}

// Better practice with error handling
try {
  const nextPos = currentPos.next(root)
  if (nextPos?.isValid()) {
    updateCursorPosition(nextPos)
  }
} catch (error) {
  console.warn('Navigation failed:', error)
}
```

---

## Performance Considerations

### Optimization Tips

1. **Batch position updates** to avoid excessive re-renders
2. **Use memo for expensive calculations**
3. **Debounce selection rectangle updates**
4. **Virtualize large documents**

```typescript
// Optimize selection rect updates
const debouncedUpdateRects = useMemo(
  () => debounce(updateSelectionRects, 16),
  [updateSelectionRects]
)

// Memoize expensive calculations
const selectionText = useMemo(
  () => selection?.toString() || '',
  [selection]
)
```

### Memory Management

- CaretPosition and Selection instances are immutable
- Use object pooling for frequently created positions
- Clean up event listeners and timers

---

## Browser Compatibility

- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

### Feature Requirements

- `document.caretPositionFromPoint()` (with fallbacks)
- `Range.getBoundingClientRect()`
- `TreeWalker`
- Modern JavaScript features (ES2018+)