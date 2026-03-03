import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    // Dev proxy to bypass CORS for Freebox API calls.
    // In production, requests go directly to the Freebox on the LAN.
    proxy: {
      '/fbx-proxy': {
        target: 'https://mafreebox.freebox.fr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fbx-proxy/, ''),
        secure: false, // Accept Freebox self-signed cert in dev
      },
      '/hd1-proxy': {
        target: 'http://hd1.freebox.fr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/hd1-proxy/, ''),
      },
    },
  },
})
