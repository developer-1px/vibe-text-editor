export function visualizeRect(rect: DOMRect, color: string = '#ff0000', duration: number = 1000) {
  const div = document.createElement('div')

  div.style.position = 'fixed'
  div.style.left = rect.left + 'px'
  div.style.top = rect.top + 'px'
  div.style.width = rect.width + 'px'
  div.style.height = rect.height + 'px'
  div.style.outline = `1px solid ${color}`
  div.style.pointerEvents = 'none'
  div.style.zIndex = '9999'
  div.style.transition = 'opacity 0.2s ease-out'
  div.style.backgroundColor = 'rgba(0, 128, 255, .3);'
  document.body.appendChild(div)

  // 페이드 아웃 효과를 위해 약간의 지연 후 opacity 설정
  setTimeout(() => {
    div.style.opacity = '0'
  }, duration - 200)

  // 완전히 제거
  setTimeout(() => {
    document.body.removeChild(div)
  }, duration)
}

// 여러 개의 DOMRect를 한번에 시각화하는 헬퍼 함수
export function visualizeRects(rects: DOMRectList | DOMRect[], color?: string, duration?: number) {
  Array.from(rects).forEach((rect) => {
    visualizeRect(rect, color, duration)
  })
}
