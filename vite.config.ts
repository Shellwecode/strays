import { defineConfig } from 'vite'

// Dev serves the harness; the extension build gets its own entry in phase 3.
export default defineConfig({
  root: 'harness',
  server: { port: 5173 },
})
