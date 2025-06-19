import { isElementNode, isTextNode } from '../main'
import { isAtomicComponent } from '@/dom/isAtomicComponent'
import { DocumentModel, TextNode, ElementNode, NodeAttributes, AtomicNode, NodeId } from '../entities/model'

export function buildModelFromDOM(rootElement: HTMLElement): DocumentModel {
  const model: DocumentModel = {}
  let nodeIdCounter = 0
  const generateNodeId = (): NodeId => `node-${++nodeIdCounter}`

  function traverse(domNode: Node, parentId: NodeId | null): NodeId | null {
    if (isTextNode(domNode)) {
      // 공백만 있는 텍스트 노드는 무시합니다.
      if (!domNode.textContent || !domNode.textContent.trim()) {
        return null
      }

      const id = generateNodeId()
      const node: TextNode = {
        id,
        type: 'text',
        parent: parentId,
        text: domNode.textContent,
      }

      // 부모를 순회하며 서식 속성을 수집합니다.
      const attributes: NodeAttributes = {}
      let current: Node | null = domNode.parentElement
      while (current && current !== rootElement) {
        if (isElementNode(current)) {
          const tag = current.tagName.toLowerCase()
          switch (tag) {
            case 'b':
            case 'strong':
              attributes.bold = true
              break
            case 'i':
            case 'em':
              attributes.italic = true
              break
            case 'u':
              attributes.underline = true
              break
            case 'code':
              attributes.code = true
              break
            case 'a':
              attributes.link = (current as HTMLAnchorElement).href
              break
          }
        }
        current = current.parentNode
      }
      if (Object.keys(attributes).length > 0) {
        node.attributes = attributes
      }

      model[id] = node
      return id
    }

    if (isElementNode(domNode)) {
      if (isAtomicComponent(domNode)) {
        const id = generateNodeId()
        const node: AtomicNode = {
          id,
          type: 'atomic',
          parent: parentId,
          tag: domNode.tagName.toLowerCase(),
        }
        model[id] = node
        return id
      }

      const id = generateNodeId()
      const node: ElementNode = {
        id,
        type: 'element',
        parent: parentId,
        tag: domNode.tagName.toLowerCase(),
        children: [],
      }
      model[id] = node

      domNode.childNodes.forEach((childDomNode) => {
        const childId = traverse(childDomNode, id)
        if (childId) {
          node.children!.push(childId)
        }
      })
      return id
    }

    return null
  }

  const rootId = traverse(rootElement, null)
  if (rootId) {
    const rootNode = model[rootId]
    // root 노드의 타입을 'root'로 변경하고 parent를 null로 설정합니다.
    if (rootNode.type === 'element') {
      ;(rootNode as any).type = 'root'
      rootNode.parent = null
    }
  }

  return model
}

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
