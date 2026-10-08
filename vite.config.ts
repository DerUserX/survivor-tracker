import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  // relative paths so the build works on GitHub Pages under /<repo>/
  base: './',
  plugins: [react(), tailwindcss()],
})
