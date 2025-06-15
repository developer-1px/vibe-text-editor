import { createCaretWalker } from '../walker'
import type { CaretPosition } from '../types'
import { getRectsForPosition } from '../position'
import { isElementNode, isTextNode } from '../../nodes'

interface NodeRect {
  node: Node
  rect: DOMRect
}

function getDistanceToGoalX(rect: DOMRect, goalX: number): number {
  if (goalX >= rect.left && goalX <= rect.right) {
    return 0
  }
  if (goalX < rect.left) {
    return rect.left - goalX
  }
  return goalX - rect.right
}

function findClosestRectToGoalX(nodeRects: NodeRect[], goalX: number): NodeRect | null {
  if (!nodeRects || nodeRects.length === 0) return null

  return nodeRects.reduce((closest, current) => {
    const closestDist = getDistanceToGoalX(closest.rect, goalX)
    const currentDist = getDistanceToGoalX(current.rect, goalX)
    return currentDist < closestDist ? current : closest
  })
}

function caretPositionFromPoint(x: number, y: number): CaretPosition | null {
  const position = document.caretPositionFromPoint(x, y)
  if (!position) return null
  return { node: position.offsetNode, offset: position.offset }
}

const calculateVerticalOverlap = (rect1: DOMRect, rect2: DOMRect): number => {
  const overlapTop = Math.max(rect1.top, rect2.top)
  const overlapBottom = Math.min(rect1.bottom, rect2.bottom)
  const overlapHeight = Math.max(0, overlapBottom - overlapTop)
  const minHeight = Math.min(rect1.height, rect2.height)
  return minHeight > 0 ? overlapHeight / minHeight : 0
}

function* walkValidRects(root: Element, startPosition: CaretPosition): Generator<NodeRect> {
  const { node: startNode, offset } = startPosition
  const walker = createCaretWalker(root)
  walker.currentNode = startNode

  // 현재 노드 처리
  const range = document.createRange()
  if (isTextNode(startNode)) {
    range.setStart(startNode, offset)
    range.setEnd(startNode, startNode.length)
    for (const rect of range.getClientRects()) {
      yield { node: startNode, rect }
    }
  } else if (isElementNode(startNode)) {
    // 원자 요소는 전체를 하나의 rect로 처리
    range.selectNode(startNode)
    yield { node: startNode, rect: range.getBoundingClientRect() }
  }

  // 다음 노드들 순회
  let node = walker.nextNode()
  while (node) {
    const range = document.createRange()
    if (isTextNode(node)) {
      range.selectNodeContents(node)
      for (const rect of range.getClientRects()) {
        yield { node, rect }
      }
    } else if (isElementNode(node)) {
      range.selectNode(node)
      yield { node, rect: range.getBoundingClientRect() }
    }
    node = walker.nextNode()
  }
}

function getNextLineRects(root: Element, currentPosition: CaretPosition, overlapThreshold = 0.5): NodeRect[] {
  const currentRects = getRectsForPosition(currentPosition)
  if (currentRects.length === 0) return []

  const currentLineRect = currentRects[0]
  const nextLineRects: NodeRect[] = []
  let foundNextLine = false

  for (const { node, rect } of walkValidRects(root, currentPosition)) {
    if (rect.height === 0) continue

    if (!foundNextLine) {
      if (calculateVerticalOverlap(currentLineRect, rect) < overlapThreshold && rect.bottom > currentLineRect.bottom) {
        foundNextLine = true
        nextLineRects.push({ node, rect })
      }
    } else {
      // 다음 라인에 속하는지 확인
      if (calculateVerticalOverlap(nextLineRects[0].rect, rect) >= overlapThreshold) {
        nextLineRects.push({ node, rect })
      } else {
        // 다음 라인이 끝남
        break
      }
    }
  }

  return nextLineRects
}

export function getNextLineCaretPosition(root: Element, currentPosition: CaretPosition, goalX: number | null): CaretPosition | null {
  const currentRect = getRectsForPosition(currentPosition)[0]
  const x = goalX ?? currentRect?.left ?? 0

  const nextLineRects = getNextLineRects(root, currentPosition)
  if (nextLineRects.length === 0) return null

  const closestNodeRect = findClosestRectToGoalX(nextLineRects, x)
  if (!closestNodeRect) return null

  const { node: targetNode, rect: closestRect } = closestNodeRect

  if (isElementNode(targetNode)) {
    const isCloserToLeft = Math.abs(x - closestRect.left) < Math.abs(x - closestRect.right)
    return { node: targetNode, offset: isCloserToLeft ? 0 : 1 }
  }

  return caretPositionFromPoint(x, closestRect.top + closestRect.height / 2)
}

function* walkValidRectsBackward(root: Element, startPosition: CaretPosition): Generator<NodeRect> {
  const { node: startNode, offset } = startPosition
  const walker = createCaretWalker(root)
  walker.currentNode = startNode

  // 현재 노드 처리
  const range = document.createRange()
  if (isTextNode(startNode)) {
    range.setStart(startNode, 0)
    range.setEnd(startNode, offset)
    const rects = Array.from(range.getClientRects()).reverse()
    for (const rect of rects) {
      yield { node: startNode, rect }
    }
  } else if (isElementNode(startNode)) {
    range.selectNode(startNode)
    yield { node: startNode, rect: range.getBoundingClientRect() }
  }

  // 이전 노드들 순회
  let node = walker.previousNode()
  while (node) {
    const range = document.createRange()
    if (isTextNode(node)) {
      range.selectNodeContents(node)
      const rects = Array.from(range.getClientRects()).reverse()
      for (const rect of rects) {
        yield { node, rect }
      }
    } else if (isElementNode(node)) {
      range.selectNode(node)
      yield { node, rect: range.getBoundingClientRect() }
    }
    node = walker.previousNode()
  }
}

function getPrevLineRects(root: Element, currentPosition: CaretPosition, overlapThreshold = 0.5): NodeRect[] {
  const currentRects = getRectsForPosition(currentPosition)
  if (currentRects.length === 0) return []

  const currentLineRect = currentRects[0]
  const prevLineRects: NodeRect[] = []
  let foundPrevLine = false

  for (const { node, rect } of walkValidRectsBackward(root, currentPosition)) {
    if (rect.height === 0) continue

    if (!foundPrevLine) {
      if (calculateVerticalOverlap(currentLineRect, rect) < overlapThreshold && rect.top < currentLineRect.top) {
        foundPrevLine = true
        prevLineRects.unshift({ node, rect })
      }
    } else {
      if (calculateVerticalOverlap(prevLineRects[0].rect, rect) >= overlapThreshold) {
        prevLineRects.unshift({ node, rect })
      } else {
        break
      }
    }
  }
  return prevLineRects
}

export function getPreviousLineCaretPosition(root: Element, currentPosition: CaretPosition, goalX: number | null): CaretPosition | null {
  const currentRect = getRectsForPosition(currentPosition)[0]
  const x = goalX ?? currentRect?.left ?? 0

  const prevLineRects = getPrevLineRects(root, currentPosition)
  if (prevLineRects.length === 0) return null

  const closestNodeRect = findClosestRectToGoalX(prevLineRects, x)
  if (!closestNodeRect) return null

  const { node: targetNode, rect: closestRect } = closestNodeRect

  if (isElementNode(targetNode)) {
    const isCloserToLeft = Math.abs(x - closestRect.left) < Math.abs(x - closestRect.right)
    return { node: targetNode, offset: isCloserToLeft ? 0 : 1 }
  }

  return caretPositionFromPoint(x, closestRect.top + closestRect.height / 2)
}
