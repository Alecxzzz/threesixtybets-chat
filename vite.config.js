import { defineConfig } from 'vite'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import hlsProxy from './vite-plugins/hls-proxy'

// Vite 8 + React 19 + Tailwind v4 (solo utilities, sin preflight: ver
// src/styles/tailwind.css). El alias "@" es lo que esperan los componentes
// de shadcn/ui (components.json -> aliases.utils = "@/lib/utils").
export default defineConfig({
  plugins: [react(), tailwindcss(), hlsProxy()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})

