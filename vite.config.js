import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // `vercel dev` assigns a dynamic port via PORT and expects the dev
    // server to bind to it; Vite doesn't read that env var on its own,
    // which otherwise makes `vercel dev` fail with "Failed to detect a
    // server running on port <N>". Plain `vite`/`npm run dev` is
    // unaffected since PORT is unset there, leaving the 5173 default.
    port: Number(process.env.PORT) || 5173,
  },
})
