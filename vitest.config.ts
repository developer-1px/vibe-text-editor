// vitest.config.ts
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      name: 'chromium',
      provider: 'playwright',
    },
    watch: false, // 테스트를 한 번만 실행하도록 설정
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
