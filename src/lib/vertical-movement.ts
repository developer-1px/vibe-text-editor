/**
 * 상하 이동 관련 복잡한 로직
 */

import type { CursorPosition } from '../types'
import { createRichNodeWalker } from './walker'
import { isAtomicComponent, isTextNode } from './nodes'
import { getPositionRect, arePositionsEqual } from './position'
import { getFirstLogicalNode, getLastLogicalNode } from './navigation'

/**
 * 상하 이동을 위한 모든 가능한 커서 위치 후보를 생성
 */
function generateAllCandidates(editorElement: HTMLElement): Array<{ position: CursorPosition; rect: DOMRect }> {
  const allCandidates: { position: CursorPosition; rect: DOMRect }[] = []
  const walker = createRichNodeWalker(editorElement)
  let node: Node | null
  
  while ((node = walker.nextNode())) {
    if (isAtomicComponent(node)) {
      for (const offset of [0, 1]) {
        const pos = { node, offset }
        const rect = getPositionRect(pos)
        if (rect) allCandidates.push({ position: pos, rect })
      }
    } else if (isTextNode(node) && node.textContent) {
      const content = node.textContent
      for (let i = 0; i <= content.length; i++) {
        const pos = { node, offset: i }
        const rect = getPositionRect(pos)
        if (rect) allCandidates.push({ position: pos, rect })
      }
    }
  }
  
  return allCandidates
}

/**
 * Y좌표 기준으로 후보들을 라인별로 그룹화
 */
function groupCandidatesByLines(candidates: Array<{ position: CursorPosition; rect: DOMRect }>): Array<Array<{ position: CursorPosition; rect: DOMRect }>> {
  if (candidates.length === 0) return []
  
  // Y좌표, X좌표 순으로 정렬
  candidates.sort((a, b) => {
    if (a.rect.top !== b.rect.top) return a.rect.top - b.rect.top
    return a.rect.left - b.rect.left
  })

  const lines: Array<Array<{ position: CursorPosition; rect: DOMRect }>> = []
  let currentLine: Array<{ position: CursorPosition; rect: DOMRect }> = []
  let lastTop = -1

  candidates.forEach((candidate) => {
    // 첫 번째 후보이거나, 이전 후보와 수직 거리가 충분히 가까우면 같은 라인으로 취급
    if (currentLine.length === 0 || candidate.rect.top - lastTop < candidate.rect.height / 2) {
      currentLine.push(candidate)
    } else {
      lines.push(currentLine)
      currentLine = [candidate]
    }
    lastTop = candidate.rect.top
  })
  lines.push(currentLine) // 마지막 라인 추가
  
  return lines
}

/**
 * 현재 커서 위치의 라인 인덱스 찾기
 */
function findCurrentLineIndex(
  lines: Array<Array<{ position: CursorPosition; rect: DOMRect }>>,
  focusPosition: CursorPosition,
  currentRect: DOMRect
): number {
  // 정확히 일치하는 라인을 먼저 찾기
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].some((c) => arePositionsEqual(c.position, focusPosition))) {
      return i
    }
  }

  // 정확히 일치하는 라인을 못찾은 경우, 가장 가까운 라인을 찾음
  const currentLineTop = Math.round(currentRect.top)
  let minDiff = Infinity
  let bestIndex = -1
  
  lines.forEach((line, index) => {
    const lineTop = Math.round(line[0].rect.top)
    const diff = Math.abs(lineTop - currentLineTop)
    if (diff < minDiff) {
      minDiff = diff
      bestIndex = index
    }
  })
  
  return bestIndex
}

/**
 * 목표 라인에서 최적의 후보 찾기
 */
function findBestCandidateInLine(
  lineCandidates: Array<{ position: CursorPosition; rect: DOMRect }>,
  targetX: number
): { position: CursorPosition; rect: DOMRect } | null {
  let bestCandidateIndex = -1
  let minDistance = Infinity

  lineCandidates.forEach((candidate, index) => {
    const distance = Math.abs(candidate.rect.left - targetX)
    if (distance < minDistance) {
      minDistance = distance
      bestCandidateIndex = index
    }
  })

  return bestCandidateIndex !== -1 ? lineCandidates[bestCandidateIndex] : null
}

/**
 * 상하 이동 로직 (전체 탐색 방식)
 */
export function handleVerticalMovement(
  direction: 'up' | 'down',
  focusPosition: CursorPosition,
  currentRect: DOMRect,
  targetX: number,
  editorElement: HTMLElement
): CursorPosition | null {
  // 1. 모든 가능한 커서 위치와 Rect를 생성
  const allCandidates = generateAllCandidates(editorElement)
  if (allCandidates.length === 0) return null

  // 2. Y좌표를 기준으로 라인별로 그룹화
  const lines = groupCandidatesByLines(allCandidates)

  // 3. 현재 라인을 찾고 목표 라인을 결정
  const currentLineIndex = findCurrentLineIndex(lines, focusPosition, currentRect)
  if (currentLineIndex === -1) return null

  const targetLineIndex = direction === 'up' ? currentLineIndex - 1 : currentLineIndex + 1

  // 4. 목표 라인에서 최적의 후보를 찾음
  if (targetLineIndex >= 0 && targetLineIndex < lines.length) {
    const targetLineCandidates = lines[targetLineIndex]
    const bestCandidate = findBestCandidateInLine(targetLineCandidates, targetX)
    
    if (bestCandidate) {
      return bestCandidate.position
    }
  }

  // 5. 어떤 후보도 찾지 못하면 문서의 시작/끝으로 이동
  const boundary = direction === 'up' ? 'start' : 'end'
  const targetNode = boundary === 'start' 
    ? getFirstLogicalNode(editorElement) 
    : getLastLogicalNode(editorElement)

  if (targetNode) {
    let offset: number
    if (targetNode.nodeType === Node.ELEMENT_NODE) {
      // atomic component인 경우
      offset = boundary === 'start' ? 0 : 1
    } else {
      // 텍스트 노드인 경우
      offset = boundary === 'start' ? 0 : targetNode.textContent?.length || 0
    }
    return { node: targetNode, offset }
  }

  return null
}