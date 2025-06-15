// src/types.ts
// Import from caret module for consistency
export type { CaretPosition as CursorPosition } from './lib/caret/types'

// Keep the old interface for backward compatibility
export interface CursorPositionLegacy {
  node: Node;
  offset: number;
} 