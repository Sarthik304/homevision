import { Suspense } from 'react'
import Navbar from './components/ui/Navbar'
import Sidebar from './components/ui/Sidebar'
import HouseViewer from './components/3d/HouseViewer'
import FloorPlanEditor from './components/editor/FloorPlanEditor'
import useHouseStore from './store/useHouseStore'

// App is the root component — it decides the overall layout.
// Think of it as the shell that holds everything together.
// Layout: Navbar on top, Sidebar on the right, main view in the center.

export default function App() {
  const { activeView } = useHouseStore()

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#0f0f1a',
        overflow: 'hidden',
      }}
    >
      {/* Top navigation bar */}
      <Navbar />

      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Main view — switches between 2D and 3D */}
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
                    color: '#555',
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

        {/* Right sidebar */}
        <Sidebar />
      </div>
    </div>
  )
}
