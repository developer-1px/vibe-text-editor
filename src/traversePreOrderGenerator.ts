import type { Position } from './main'

export function* traversePreOrderGenerator(
  root: Node,
  startNode: Position,
  acceptNode: (node: Node) => false | unknown = () => {},
): Generator<Node, void, unknown> {
  let node: Node | null = startNode.node
  if (!root.contains(node)) {
    throw new Error('startNode is not a child of root')
  }

  while (node) {
    yield node

    if (acceptNode(node) !== false && node.firstChild) {
      node = node.firstChild
      continue
    }

    // 형제 또는 조상의 형제로 이동
    while (node && node !== root) {
      if (node.nextSibling) {
        node = node.nextSibling
        break
      }
      node = node.parentNode
    }

    if (node === root) node = null
  }
}

export function* traversePreOrderBackwardGenerator(
  root: Node,
  startNode: Position,
  acceptNode: (node: Node) => false | unknown = () => {},
): Generator<Node, void, unknown> {
  let node: Node | null = startNode.node
  if (!root.contains(node)) {
    throw new Error('startNode is not a child of root')
  }

  while (node && node !== root) {
    const prevSibling: Node | null = node.previousSibling
    if (prevSibling) {
      node = prevSibling
      while (node && acceptNode(node) !== false && node.lastChild) {
        node = node.lastChild
      }
    } else {
      node = node.parentNode
    }

    if (node && node !== root) {
      yield node
    } else {
      break
    }
  }
}
