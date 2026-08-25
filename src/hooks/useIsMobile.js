import { useSyncExternalStore } from 'react'

const QUERY = '(max-width: 760px)'

function subscribe(callback) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches
}

// true on phone-sized viewports; re-evaluates live on resize/orientation change
export default function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot)
}
