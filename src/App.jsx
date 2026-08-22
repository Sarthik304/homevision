import { lazy, Suspense, useEffect } from 'react'
import Navbar from './components/ui/Navbar'
import Sidebar from './components/ui/Sidebar'
import FloorPlanEditor from './components/editor/FloorPlanEditor'
import SharedDesignBanner from './components/ui/SharedDesignBanner'
import useHouseStore from './store/useHouseStore'
import useAuthStore from './store/useAuthStore'
import useDesignsStore from './store/useDesignsStore'
import { getColors } from './theme'

// lazy-load the 3D view — three.js/fiber/drei are ~5MB, only needed once opened
const HouseViewer = lazy(() => import('./components/3d/HouseViewer'))

export default function App() {
  const activeView = useHouseStore((s) => s.activeView)
  const darkMode = useHouseStore((s) => s.darkMode)
  const color = getColors(darkMode)

  // pick up existing Supabase session, subscribe to auth changes
  useEffect(() => {
    return useAuthStore.getState().init()
  }, [])

  // load a shared design from ?design=<uuid>, then strip it from the URL
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
