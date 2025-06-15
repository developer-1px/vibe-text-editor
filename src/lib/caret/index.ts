// Export types explicitly to avoid conflicts
export type { CaretPosition as CaretPositionInterface, CursorPosition } from './types'

// Export the CaretPosition class
export { CaretPosition } from './CaretPosition'

// Export movement functions
export * from './move/character-movement'
export * from './move/line-movement'
export * from './move/line-boundary-movement'
export * from './move/document-boundary-movement'

// Export position and walker utilities
export * from './position'
export * from './walker'
