import { lazy, Suspense, useEffect } from 'react'
import Navbar from './components/ui/Navbar'
import Sidebar from './components/ui/Sidebar'
import FloorPlanEditor from './components/editor/FloorPlanEditor'
import useHouseStore from './store/useHouseStore'
import { getColors } from './theme'

// three.js + @react-three/fiber + drei are ~5MB and only needed once someone opens the 3D view —
// lazy() defers fetching/parsing that whole chunk until then, instead of it loading on every visit
const HouseViewer = lazy(() => import('./components/3d/HouseViewer'))

export default function App() {
  const activeView = useHouseStore((s) => s.activeView)
  const darkMode = useHouseStore((s) => s.darkMode)
  const color = getColors(darkMode)

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
