export type NodeId = string

export interface NodeAttributes {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  code?: boolean
  link?: string
}

export interface TextNode {
  id: NodeId
  type: 'text'
  parent: NodeId | null
  text: string
  attributes?: NodeAttributes
}

export interface ElementNode {
  id: NodeId
  type: 'element'
  parent: NodeId | null
  tag: string // e.g., 'p', 'h2', 'b', 'li'
  children?: NodeId[]
}

export interface AtomicNode {
  id: NodeId
  type: 'atomic'
  parent: NodeId | null
  tag: string // 'hr', 'img', 'table'
}

export interface RootNode {
  id: NodeId
  type: 'root'
  parent: null
  children: NodeId[]
}

export interface DocumentNode {
  id: string
  type: 'root' | 'element' | 'text' | 'atomic'
  children?: string[]
  text?: string
  tag?: string
  attributes?: Record<string, any>
}

export type DocumentModel = Record<string, DocumentNode>

export function* traverseModelPreOrder(model: DocumentModel, startNodeId: string): Generator<DocumentNode> {
  const startNode = model[startNodeId]
  if (!startNode) return

  const stack: DocumentNode[] = [startNode]

  while (stack.length > 0) {
    const currentNode = stack.pop()!
    yield currentNode

    if (currentNode.children) {
      // 자식 노드를 역순으로 스택에 추가하여 왼쪽에서 오른쪽으로 순회하도록 합니다.
      for (let i = currentNode.children.length - 1; i >= 0; i--) {
        const childNode = model[currentNode.children[i]]
        if (childNode) {
          stack.push(childNode)
        }
      }
    }
  }
}

export interface ModelPosition {
  nodeId: string
  offset: number
}
