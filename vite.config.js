import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import hlsProxy from './vite-plugins/hls-proxy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), hlsProxy()],
})
