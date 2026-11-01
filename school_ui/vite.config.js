import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
  },
  // Use '/' during local dev server and '/SMS/school_ui/' when building for production deploy
  base: command === 'serve' ? '/' : '/SMS/school_ui/',
  server: {
    port: 5173,
    proxy: {
      '/school_erp/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
}))