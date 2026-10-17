import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Port 8008 for both `npm run dev` and `npm run preview`. On the cPanel
// server the built app is served on 8008 by server/serve.cjs instead.
const server = {
  port: 8008,
  host: '0.0.0.0',
  strictPort: true,
  allowedHosts: ['newtravelweb.tgpaddy.com'], // lowercase: Vite compares exactly and browsers send it lowercased
}

// https://vite.dev/config/
export default defineConfig({
  base: "/",
  plugins: [react()],
  server,
  preview: server,
})
