export function isTextNode(node: Node): node is Text {
  return node.nodeType === Node.TEXT_NODE
}

export function isElementNode(node: Node): node is Element {
  return node.nodeType === Node.ELEMENT_NODE
}

/**
 * Check if a node is an atomic component
 */
export function isAtomicComponent(node: Node): boolean {
  return node.nodeType === Node.ELEMENT_NODE && 
         (node as HTMLElement).classList.contains('atomic-component')
}

/**
 * Find the nearest parent atomic component
 */
export function findParentAtomicComponent(element: Element): HTMLElement | null {
  return element.closest('.atomic-component') as HTMLElement | null
}

/**
 * Find the nearest block-level element
 */
export function findNearestBlock(node: Node): Element | null {
  let currentNode = node

  while (currentNode && currentNode !== document.body) {
    if (currentNode.nodeType === Node.ELEMENT_NODE) {
      const element = currentNode as Element
      const computedStyle = window.getComputedStyle(element)
      
      // Check for block-level elements
      if (computedStyle.display === 'block' || 
          computedStyle.display === 'list-item' ||
          element.tagName.match(/^(P|DIV|H[1-6]|BLOCKQUOTE|PRE|UL|OL|LI|SECTION|ARTICLE|HEADER|FOOTER)$/)) {
        return element
      }
    }
    currentNode = currentNode.parentNode as Node
  }

  return null
}
