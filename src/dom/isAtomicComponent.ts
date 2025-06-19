import { isElementNode } from '../main'

// ------------------------------------------------------------
// Atomic Component Utilities
// ------------------------------------------------------------

export const isAtomicComponent = (node: Node) => {
  if (isElementNode(node)) {
    if (node.tagName === 'BR' || node.tagName === 'HR' || node.tagName === 'IMG' || node.tagName === 'TABLE') {
      return true
    }

    if ((node as HTMLElement).classList.contains('atomic-component')) {
      return true
    }

    return false
  }

  return false
}
