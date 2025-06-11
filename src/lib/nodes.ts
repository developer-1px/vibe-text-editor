/**
 * DOM 노드 관련 유틸리티 함수들
 */

import { CSS_CLASSES } from './constants'

/**
 * 노드 타입 감지 함수들
 */
export function isAtomicComponent(node: Node): boolean {
  return node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).classList.contains(CSS_CLASSES.ATOMIC_COMPONENT)
}

export function isTextNode(node: Node): boolean {
  return node.nodeType === Node.TEXT_NODE
}

export function isElementNode(node: Node): boolean {
  return node.nodeType === Node.ELEMENT_NODE
}

/**
 * 상위 atomic component를 찾는 함수
 */
export function findParentAtomicComponent(element: Element): HTMLElement | null {
  return element.closest(`.${CSS_CLASSES.ATOMIC_COMPONENT}`) as HTMLElement | null
}

/**
 * 지정된 노드에서부터 위로 올라가며 블록 레벨 요소 또는 atomic component를 찾는 함수
 */
export function findNearestBlock(node: Node | null): HTMLElement | null {
  let current = node
  while (current) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const element = current as HTMLElement

      // atomic-component는 바로 반환
      if (isAtomicComponent(element)) {
        return element
      }

      const display = window.getComputedStyle(element).display
      // p, li, h1-h6, blockquote, pre 등이 해당됩니다.
      if (['block', 'list-item', 'table-cell'].includes(display)) {
        // 단, 에디터 자체는 블록으로 취급하지 않습니다.
        if (element.classList.contains(CSS_CLASSES.EDITOR)) return null
        return element
      }
    }
    current = current.parentNode
  }
  return null
}