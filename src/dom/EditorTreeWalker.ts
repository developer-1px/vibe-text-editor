import { acceptNode } from '../main'
import { isAtomicComponent } from './isAtomicComponent'

export class EditorTreeWalker {
  root: Node
  currentNode: Node

  constructor(root: Node, currentNode?: Node) {
    this.root = root
    this.currentNode = currentNode || root
  }

  private getNextNode(node: Node | null, direction: 'forward' | 'backward'): Node | null {
    if (!node) return null

    if (direction === 'forward') {
      if (!isAtomicComponent(node) && node.firstChild) {
        return node.firstChild
      }
      if (node.nextSibling) {
        return node.nextSibling
      }
      let temp: Node | null = node
      while (temp) {
        if (temp === this.root) return null
        if (temp.nextSibling) return temp.nextSibling
        temp = temp.parentNode
      }
      return null
    } else {
      if (node === this.root) return null
      if (node.previousSibling) {
        let current = node.previousSibling
        while (!isAtomicComponent(current) && current.lastChild) {
          current = current.lastChild
        }
        return current
      }
      const parent = node.parentNode
      if (parent === this.root) return null
      return parent
    }
  }

  private *traverse(direction: 'forward' | 'backward'): Generator<Node> {
    let node: Node | null = this.currentNode

    while (node) {
      if (acceptNode(node) === NodeFilter.FILTER_ACCEPT) {
        this.currentNode = node
        yield node
      }
      node = this.getNextNode(node, direction)
    }
  }

  *forward(): Generator<Node> {
    yield* this.traverse('forward')
  }

  *backward(): Generator<Node> {
    yield* this.traverse('backward')
  }
}
