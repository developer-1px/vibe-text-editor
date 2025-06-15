/**
 * Navigation utilities for finding nodes within the editor
 */

/**
 * Get the last logical text node within a container
 */
export function getLastLogicalNode(container: Node): Text | null {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // Only accept text nodes with actual content
        return node.textContent && node.textContent.trim()
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP
      }
    }
  )

  let lastNode: Text | null = null
  let currentNode = walker.firstChild()
  
  while (currentNode) {
    if (currentNode.nodeType === Node.TEXT_NODE) {
      lastNode = currentNode as Text
    }
    currentNode = walker.nextNode()
  }

  return lastNode
}

/**
 * Get the first logical text node within a container
 */
export function getFirstLogicalNode(container: Node): Text | null {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        return node.textContent && node.textContent.trim()
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP
      }
    }
  )

  const firstNode = walker.firstChild()
  return firstNode && firstNode.nodeType === Node.TEXT_NODE ? firstNode as Text : null
}