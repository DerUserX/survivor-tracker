import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  // relative paths so the build works on GitHub Pages under /<repo>/
  base: './',
  plugins: [react(), tailwindcss()],
  // fixed port so it never clashes with other local dashboards
  server: { port: 5174 },
})
