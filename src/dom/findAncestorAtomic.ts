import { isAtomicComponent } from './isAtomicComponent'

export const findAncestorAtomic = (node: Node, root: Node): Element | null => {
  let current: Node | null = node
  while (current && current !== root) {
    if (isAtomicComponent(current)) return current as Element
    current = current.parentNode
  }
  return null
}
