# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `pnpm dev` - Start development server with hot module replacement
- `pnpm build` - Build for production (runs TypeScript compilation + Vite build)
- `pnpm preview` - Preview production build locally
- `pnpm test` - Run tests using Vitest with browser testing (Playwright + Chromium)

## Architecture

This is a **custom contenteditable-free rich text editor core library** built with TypeScript + Vite. The editor implements cursor positioning, text selection, and navigation without relying on browser `contenteditable` functionality.

### Core Technologies  
- **TypeScript** with strict type checking across multiple config files
- **Vite** for fast development and building
- **Vitest** for browser-based testing with Playwright and Chromium
- **ESLint** with TypeScript-specific rules

### Editor Architecture

The editor provides DOM-like APIs while abstracting away native DOM selection complexities:
- Uses `document.caretPositionFromPoint()` for precise cursor positioning
- Implements text selection with visual highlighting across multiple lines  
- Supports "atomic components" (elements like `<hr>`, `<img>`, `<table>` treated as single units)
- Handles complex keyboard navigation including Meta+Arrow, line movement, character movement
- Maintains "Goal-X" coordinate for vertical cursor movement consistency
- Position normalization system that handles out-of-bounds offsets

### Key Classes

- **Editor**: Main editor class that provides DOM-like API methods
- **EditorRange**: Analogous to native DOM Range but with atomic component support
- **EditorSelection**: Handles selection state with anchor/focus positions and Goal-X tracking
- **Position**: Core type representing logical cursor position (`node: Node, offset: number`)
- **EditorTreeWalker**: Custom walker for navigating through text nodes and atomic components
- **EditorView**: Renders cursor and selection visual indicators

### Configuration Files

- `tsconfig.json` - Root TypeScript config
- `vite.config.ts` - Vite configuration with path aliases (@/ -> ./src/)
- `vitest.config.ts` - Test configuration for browser testing with Playwright
- `eslint.config.js` - ESLint with TypeScript rules

### Key Files

- `src/main.ts` - Core editor implementation with all classes (Editor, EditorRange, EditorSelection, etc.)
- `src/app.ts` - Simple entry point that calls main()
- `src/Iterator.ts` - Functional iterator utilities for traversal
- `src/DOMRect.ts` - Rectangle calculation utilities for cursor positioning
- `src/traversePreOrderGenerator.ts` - Tree traversal generators (forward/backward)
- `src/normalizeDocument.ts` - Document normalization utilities
- `tests/selection/move/` - Test suite for cursor/selection movement behaviors

## Testing

- Tests are located in `tests/` directory with `*.spec.ts` files
- Uses Vitest with browser testing (Playwright + Chromium) for DOM interaction testing
- Test files use path alias `@/` to reference `src/` directory
- Focus on testing cursor movement, selection behaviors, and atomic component interactions

## Development Conventions

- **Incremental development** - Make small, gradual changes rather than large refactors
- **Pure functions and abstraction layers** - Prioritize pure functions and maintain clean abstraction boundaries
- **Follow existing conventions** - Maintain consistency with the established codebase patterns
- **Preserve main.ts structure** - Keep core implementation in main.ts and develop dependencies in order
- **Use functions over classes** - Prefer functional programming approach
- **Limit file size** - Split files when they exceed ~300 lines
- **Keep API changes minimal** - Avoid making too many modifications at once
- **Programmatic API style** - Write APIs in a programmatic manner
