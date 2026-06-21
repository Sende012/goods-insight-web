import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: false,
    proxy: {
      // 鉴权走 user 微服务（更具体路径必须先声明）
      '/api/auth': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      '/api/users/me': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      '/api/workspaces': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      // 其他 /api/* 走主服务
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
  },
})