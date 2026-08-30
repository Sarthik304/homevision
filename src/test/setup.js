// runs before every test file — extends expect with jest-dom matchers and cleans up RTL after each test
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// jsdom has no matchMedia — stub it to "no match" so components like useIsMobile don't crash in tests
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
