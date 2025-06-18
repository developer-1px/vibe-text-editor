import { isTextNode } from './main'

export function normalizeDocument(doc: HTMLElement) {
  // Remove extra spaces from text nodes
  const walker = document.createTreeWalker(doc, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode: (node: Node) => {
      if (isTextNode(node)) {
        node.nodeValue = node.nodeValue?.replace(/\s+/g, ' ') || ''
        return NodeFilter.FILTER_ACCEPT
      }

      const display = getComputedStyle(node as Element).display
      const isBlock = !display.includes('inline')
      if (isBlock) {
        if (isTextNode(node.firstChild)) {
          node.firstChild.nodeValue = node.firstChild.nodeValue?.trimStart() || ''
        }
        if (isTextNode(node.lastChild)) {
          node.lastChild.nodeValue = node.lastChild.nodeValue?.trimEnd() || ''
        }
        if (isTextNode(node.previousSibling)) {
          node.previousSibling.nodeValue = node.previousSibling.nodeValue?.trimEnd() || ''
        }
        if (isTextNode(node.nextSibling)) {
          node.nextSibling.nodeValue = node.nextSibling.nodeValue?.trimStart() || ''
        }
      }
      return NodeFilter.FILTER_ACCEPT
    },
  })
  while (walker.nextNode());
  doc.normalize()
  return doc
}
