import { lazy, Suspense, useEffect } from 'react'
import Navbar from './components/ui/Navbar'
import Sidebar from './components/ui/Sidebar'
import FloorPlanEditor from './components/editor/FloorPlanEditor'
import SharedDesignBanner from './components/ui/SharedDesignBanner'
import useHouseStore from './store/useHouseStore'
import useAuthStore from './store/useAuthStore'
import useDesignsStore from './store/useDesignsStore'
import { getColors } from './theme'

// three.js + @react-three/fiber + drei (~5MB) are only needed for the 3D view — lazy() defers
// loading them until it's opened
const HouseViewer = lazy(() => import('./components/3d/HouseViewer'))

export default function App() {
  const activeView = useHouseStore((s) => s.activeView)
  const darkMode = useHouseStore((s) => s.darkMode)
  const color = getColors(darkMode)

  // once per app load: pick up any existing Supabase session and subscribe to future auth changes.
  // The returned unsubscribe is StrictMode-safe (see useAuthStore.init).
  useEffect(() => {
    return useAuthStore.getState().init()
  }, [])

  // a shareable link looks like <app>/?design=<uuid> — load it once on mount (works even
  // signed-out, see loadPublicDesign), then strip it from the URL so a later refresh doesn't
  // re-fetch and clobber whatever the visitor has since edited locally
  useEffect(() => {
    const designId = new URLSearchParams(window.location.search).get('design')
    if (!designId) return
    useDesignsStore.getState().loadPublicDesign(designId)
    window.history.replaceState(null, '', window.location.pathname)
  }, [])

  useEffect(() => {
    document.body.style.background = color.workspace
    document.body.style.color = color.text
  }, [color.workspace, color.text])

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: color.workspace,
        overflow: 'hidden',
      }}
    >
      <Navbar />
      <SharedDesignBanner />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {activeView === '3d' ? (
            <Suspense
              fallback={
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: color.muted,
                    fontSize: 14,
                  }}
                >
                  Loading 3D view...
                </div>
              }
            >
              <HouseViewer />
            </Suspense>
          ) : (
            <FloorPlanEditor />
          )}
        </div>

        <Sidebar />
      </div>
    </div>
  )
}
