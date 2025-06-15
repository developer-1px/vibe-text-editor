import { createCaretWalker } from '../walker'
import type { CaretPosition } from '../types'
import { isTextNode } from '../../nodes'

export function getDocumentStartCaretPosition(root: Node): CaretPosition | null {
  const walker = createCaretWalker(root)
  const firstNode = walker.firstChild()

  if (firstNode) {
    return { node: firstNode, offset: 0 }
  }

  return null
}

export function getDocumentEndCaretPosition(root: Node): CaretPosition | null {
  const walker = createCaretWalker(root)
  let lastNode: Node | null = null
  let currentNode = walker.firstChild()

  while (currentNode) {
    lastNode = currentNode
    currentNode = walker.nextNode()
  }

  if (lastNode) {
    if (isTextNode(lastNode)) {
      return { node: lastNode, offset: lastNode.textContent?.length ?? 0 }
    }
    // Atomic element
    return { node: lastNode, offset: 1 }
  }

  return null
}
