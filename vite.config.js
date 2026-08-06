import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // most test files are pure-logic (store, geometry math) and don't need a DOM, so the default
    // stays 'node' for speed — component test files opt into jsdom individually with a
    // `// @vitest-environment jsdom` docblock at the top instead of paying jsdom's cost everywhere
    environment: 'node',
    setupFiles: ['./src/test/setup.js'],
  },
})
