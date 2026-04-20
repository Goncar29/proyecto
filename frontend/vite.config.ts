import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { config } from 'dotenv'

// Load .env from repo root (one level up from frontend/).
// override: true — ensures BACKEND_PORT from .env wins over any PORT injected by
// tooling (e.g. preview servers that set PORT to the frontend port).
config({ path: path.resolve(__dirname, '../.env'), override: true })

// Use 127.0.0.1 explicitly — on Windows + Node 18+, 'localhost' triggers dual-stack
// (IPv4 + IPv6) resolution in internalConnectMultiple which causes EADDRINUSE errors.
const backendPort = process.env.BACKEND_PORT ?? process.env.PORT ?? '3006'
const backendTarget = `http://127.0.0.1:${backendPort}`

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/health': {
        target: backendTarget,
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
