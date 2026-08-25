// runs before every test file (see vite.config.js's test.setupFiles) — extends `expect` with
// jest-dom's DOM matchers and unmounts any React Testing Library tree after each test so one
// component test's DOM doesn't leak into the next
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// jsdom has no layout engine, so it never matches a real media query — stub it to "no match"
// (desktop-sized) so components using matchMedia (e.g. useIsMobile) don't crash in tests
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })
}

afterEach(() => {
  cleanup()
})
