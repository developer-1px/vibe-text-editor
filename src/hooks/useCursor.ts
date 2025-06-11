/**
 * 커서 상태 및 깜빡임 관리 훅
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { CURSOR_BLINK_RESET_DELAY } from '../lib/constants'

export function useCursor() {
  // 커서 깜빡임 상태와 타이머
  const [isBlinking, setIsBlinking] = useState(true)
  const blinkTimeoutRef = useRef<number | null>(null)

  // 사용자의 입력에 반응하여 깜빡임을 제어하는 함수
  const resetBlink = useCallback(() => {
    // 일단 깜빡임을 멈춤
    setIsBlinking(false)
    // 이전에 설정된 타이머가 있다면 초기화
    if (blinkTimeoutRef.current) {
      clearTimeout(blinkTimeoutRef.current)
    }
    // 500ms 후에 깜빡임을 다시 시작하도록 타이머 설정
    blinkTimeoutRef.current = window.setTimeout(() => {
      setIsBlinking(true)
    }, CURSOR_BLINK_RESET_DELAY)
  }, [])

  // 컴포넌트가 언마운트될 때 타이머를 정리
  useEffect(() => {
    return () => {
      if (blinkTimeoutRef.current) {
        clearTimeout(blinkTimeoutRef.current)
      }
    }
  }, [])

  return {
    isBlinking,
    resetBlink,
  }
}