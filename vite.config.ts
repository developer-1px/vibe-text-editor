/// <reference types="vitest" />
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts'],
    browser: {
      enabled: true,
      name: 'chromium',
      provider: 'playwright',
    },
    // watch: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
