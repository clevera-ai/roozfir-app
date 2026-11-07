import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Served from https://clevera-ai.github.io/tallyfox-sandbox/
export default defineConfig({
  base: '/tallyfox-sandbox/',
  plugins: [react(), tailwindcss()],
})
