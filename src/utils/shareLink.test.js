// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { shareLinkFor } from './shareLink'

describe('shareLinkFor', () => {
  it('builds a link pointing at the current origin/path with the design id as a query param', () => {
    expect(shareLinkFor('abc-123')).toBe(`${window.location.origin}${window.location.pathname}?design=abc-123`)
  })
})
