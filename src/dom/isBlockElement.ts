import { isElementNode } from '../main'

export const isBlockElement = (node: Node): boolean => {
  if (isElementNode(node)) {
    const computedStyle = window.getComputedStyle(node)
    const display = computedStyle.display
    // display 값에 inline이 포함되지 않으면 블록 요소로 간주
    return !display.includes('inline')
  }
  return false
}
