import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Served from https://app.roozfir.online/ (base path "/")
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
