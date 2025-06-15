export interface CaretPosition {
  node: Node
  offset: number
}

// Re-export for compatibility with existing CursorPosition usage
export type CursorPosition = CaretPosition
