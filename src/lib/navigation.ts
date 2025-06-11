/**
 * 커서 네비게이션 관련 함수들
 */

import type { CursorPosition } from '../types'
import { createRichNodeWalker } from './walker'
import { isTextNode, isElementNode } from './nodes'
import { getSelectionBoundary } from './position'

/**
 * TreeWalker 기반 네비게이션 함수들
 */
export function getNextLogicalNode(currentNode: Node, editorRoot: HTMLElement): Node | null {
  const walker = createRichNodeWalker(editorRoot)
  walker.currentNode = currentNode
  return walker.nextNode()
}

export function getPreviousLogicalNode(currentNode: Node, editorRoot: HTMLElement): Node | null {
  const walker = createRichNodeWalker(editorRoot)
  walker.currentNode = currentNode
  return walker.previousNode()
}

/**
 * 특정 컨테이너의 첫 번째/마지막 논리적 노드를 찾는 함수들
 */
export function getFirstLogicalNode(container: HTMLElement): Node | null {
  const walker = createRichNodeWalker(container)
  return walker.nextNode()
}

export function getLastLogicalNode(container: HTMLElement): Node | null {
  const walker = createRichNodeWalker(container)
  let lastNode: Node | null = null
  let currentNode: Node | null
  while ((currentNode = walker.nextNode()) !== null) {
    lastNode = currentNode
  }
  return lastNode
}

/**
 * 가로 이동 통합 로직
 */
export function moveHorizontally(
  direction: 'left' | 'right',
  focusPosition: CursorPosition,
  anchorPosition: CursorPosition | null,
  editorRoot: HTMLElement,
  hasSelection: boolean,
): CursorPosition | null {
  // 선택 영역이 있고 확장하지 않는 경우, 선택 영역의 경계로 이동
  if (hasSelection) {
    const boundaries = getSelectionBoundary(anchorPosition, focusPosition)
    if (boundaries) {
      return direction === 'left' ? boundaries.start : boundaries.end
    }
  }

  const { node, offset } = focusPosition
  const isMovingLeft = direction === 'left'

  // 1. 같은 노드 내에서 이동
  // Atomic Component 내부 이동
  if (isElementNode(node)) {
    if (isMovingLeft && offset === 1) return { node, offset: 0 }
    if (!isMovingLeft && offset === 0) return { node, offset: 1 }
  }
  // Text Node 내부 이동
  if (isTextNode(node)) {
    if (isMovingLeft && offset > 0) return { node, offset: offset - 1 }
    if (!isMovingLeft && offset < (node.textContent?.length || 0)) return { node, offset: offset + 1 }
  }

  // 2. 노드 경계를 넘어 다른 노드로 이동
  const adjacentNode = isMovingLeft ? getPreviousLogicalNode(node, editorRoot) : getNextLogicalNode(node, editorRoot)

  if (!adjacentNode) return null // 에디터의 시작/끝에 도달

  if (isMovingLeft) {
    // 이전 노드의 끝으로 이동
    if (isTextNode(adjacentNode)) {
      return { node: adjacentNode, offset: adjacentNode.textContent?.length || 0 }
    } else {
      // Atomic Component
      return { node: adjacentNode, offset: 1 }
    }
  } else {
    // 오른쪽으로 이동
    // 다음 노드의 시작으로 이동
    return { node: adjacentNode, offset: 0 }
  }
}

/**
 * 좌측 이동 로직
 */
export function moveLeft(
  focusPosition: CursorPosition,
  anchorPosition: CursorPosition | null,
  editorRoot: HTMLElement,
  hasSelection: boolean,
): CursorPosition | null {
  return moveHorizontally('left', focusPosition, anchorPosition, editorRoot, hasSelection)
}

/**
 * 우측 이동 로직
 */
export function moveRight(
  focusPosition: CursorPosition,
  anchorPosition: CursorPosition | null,
  editorRoot: HTMLElement,
  hasSelection: boolean,
): CursorPosition | null {
  return moveHorizontally('right', focusPosition, anchorPosition, editorRoot, hasSelection)
}