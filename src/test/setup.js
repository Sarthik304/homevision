// runs before every test file (see vite.config.js's test.setupFiles) — extends `expect` with
// jest-dom's DOM matchers and unmounts any React Testing Library tree after each test so one
// component test's DOM doesn't leak into the next
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

afterEach(() => {
  cleanup()
})
