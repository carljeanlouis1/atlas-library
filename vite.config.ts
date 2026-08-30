import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    // `npm run dev` has no D1 or R2 behind it, so read the live archive
    // instead of an empty local database. Dev only - never bundled.
    proxy: {
      '/api': {
        target: 'https://atlas-library.pages.dev',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
