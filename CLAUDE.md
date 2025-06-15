# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `pnpm dev` - Start development server with hot module replacement
- `pnpm build` - Build for production (runs TypeScript compilation + Vite build)
- `pnpm lint` - Run ESLint to check code quality
- `pnpm preview` - Preview production build locally

## Architecture

This is a **custom contenteditable-free rich text editor** built with React + TypeScript + Vite. The editor implements cursor positioning, text selection, and navigation without relying on browser `contenteditable` functionality.

### Core Technologies
- **React 19** with functional components and hooks
- **TypeScript** with strict type checking across multiple config files
- **Vite** for fast development and building with SWC for React Fast Refresh
- **ESLint** with TypeScript and React-specific rules

### Editor Architecture

The editor uses a custom cursor implementation that:
- Uses `document.caretPositionFromPoint()` for precise cursor positioning
- Implements text selection with visual highlighting across multiple lines
- Supports "atomic components" (non-text elements like tables treated as single units)
- Handles complex keyboard navigation including Home/End, Cmd+Arrow combinations
- Maintains "Goal-X" coordinate for vertical cursor movement

### Key Components

- **CursorPosition**: Core type representing logical cursor position (`node: Node, offset: number`)
- **TreeWalker**: Custom walker for navigating through text nodes and atomic components
- **Hotkey System**: Configurable keyboard shortcut handling with cross-platform support
- **Selection Rendering**: Visual highlight system for text selections across multiple lines

### Configuration Files

- `tsconfig.json` - Root config with project references
- `tsconfig.app.json` - App-specific TypeScript settings (strict mode enabled)
- `tsconfig.node.json` - Node.js tooling configuration
- `eslint.config.js` - ESLint with React hooks and TypeScript rules

### Key Files

- `src/App.tsx` - Main editor implementation with cursor and selection logic
- `src/lib/walker.ts` - TreeWalker for navigating text nodes and atomic components
- `src/lib/hotkeys.ts` - Cross-platform keyboard shortcut handling
- `src/lib/types.ts` - Core type definitions
- `src/components/DebugPanel.tsx` - Debug interface for cursor state
- `src/main.tsx` - Application entry point

## Development Conventions

- **Use functions over classes** - Prefer functional programming approach
- **Limit file size** - Split files when they exceed ~300 lines
- **Keep API changes minimal** - Avoid making too many modifications at once
- **Programmatic API style** - Write APIs in a programmatic manner
