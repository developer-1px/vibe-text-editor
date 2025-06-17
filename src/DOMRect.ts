export function getHorizontalDistance(rect: DOMRect, x: number): number {
  // x가 rect 내에 있으면 음수 값을 반환하여 우선순위를 높입니다.
  if (x >= rect.left && x <= rect.right) {
    return -1
  }
  // rect의 중심점과 x 사이의 거리를 계산합니다.
  return Math.abs((rect.left + rect.right) / 2 - x)
}

export function findBestPosition<T extends { rect: DOMRect }>(positions: T[], goalX: number): T | null {
  if (positions.length === 0) return null

  // 주어진 위치들 중에서 goalX와 가장 가까운 위치를 찾습니다.
  return positions.reduce((best, current) =>
    getHorizontalDistance(current.rect, goalX) < getHorizontalDistance(best.rect, goalX) ? current : best,
  )
}

export function calculateVerticalOverlapRatio(rect1: DOMRect, rect2: DOMRect): number {
  const overlapTop = Math.max(rect1.top, rect2.top)
  const overlapBottom = Math.min(rect1.bottom, rect2.bottom)
  const overlapHeight = Math.max(0, overlapBottom - overlapTop)
  const minHeight = Math.min(rect1.height, rect2.height)
  return minHeight > 0 ? overlapHeight / minHeight : 0
}

export function debugRect(rects: DOMRect[]) {
  for (const rect of rects) {
    const div = document.createElement('div')
    div.style.position = 'fixed'
    div.style.top = rect.top + 'px'
    div.style.left = rect.left + 'px'
    div.style.width = rect.width + 'px'
    div.style.height = rect.height + 'px'
    div.style.backgroundColor = 'rgba(0, 0, 255, 0.2)'
    div.style.outline = '1px solid red'
    div.style.pointerEvents = 'none'
    document.body.appendChild(div)
    setTimeout(() => {
      div.remove()
    }, 1000)
  }
}
