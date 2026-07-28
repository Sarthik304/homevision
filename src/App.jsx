import { Suspense, useEffect } from 'react'
import Navbar from './components/ui/Navbar'
import Sidebar from './components/ui/Sidebar'
import HouseViewer from './components/3d/HouseViewer'
import FloorPlanEditor from './components/editor/FloorPlanEditor'
import useHouseStore from './store/useHouseStore'
import { getColors } from './theme'

export default function App() {
  const { activeView, darkMode } = useHouseStore()
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
