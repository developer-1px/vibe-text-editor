const ATOMIC_ELEMENTS = ['TABLE', 'HR', 'BR']

export function createCaretWalker(root: Node) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return NodeFilter.FILTER_ACCEPT
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        if (ATOMIC_ELEMENTS.includes(node.nodeName)) {
          console.log('acceptNodex111', node, node.nodeName)
          return NodeFilter.FILTER_ACCEPT
        }
        // if ((node as Element).classList.contains('mention')) {
        //   return NodeFilter.FILTER_ACCEPT
        // }
        return NodeFilter.FILTER_SKIP
      }

      console.log('acceptNodex', node, node.nodeName)
      return NodeFilter.FILTER_REJECT
    },
  })

  return walker
}
