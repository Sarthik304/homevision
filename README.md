# 🏠🦖 HomeVision

An interactive home configurator. Design your floor plan in 2D, then walk through the same house in 3D.

## What it does right now

- **2D floor plan editor** — drag rooms to reposition them, resize via edge handles, pan and zoom the canvas
- **Smart snapping** — drag a room near another and it snaps flush edge-to-edge, or corner-to-corner when the two just touch diagonally, so walls line up straight
- **New rooms spawn where you're looking** — adding a room or floor drops it at the center of your current 2D view instead of a fixed corner
- **Interior walls** — add walls inside a room, drag their endpoints to rotate/stretch them, place doors and windows on them
- **Boundary walls, doors & windows** — toggle any of a room's four outer walls on/off, add doors and windows with configurable width/position (and height for windows)
- **Wall & floor color picker** — click a wall or floor to select it, double-click (in 3D) or use the sidebar to change its color live
- **Room management** — add rooms or open floor areas, rename, resize, and delete them from the sidebar
- **3D house viewer** — the same house rendered in Three.js, walls cut out around doors/windows, auto-centered on the grid regardless of where rooms sit in 2D space
- **Dark mode** — toggle from the navbar, applied across both views
- **Switch views** — jump between the 2D plan and 3D view with one click

## Tech stack

| Part | Technology |
|---|---|
| UI framework | React + Vite |
| 3D engine | Three.js via React Three Fiber |
| 3D helpers | Drei (orbit controls, lighting, grid) |
| 2D editor | Konva.js via react-konva |
| Color picker | react-colorful |
| State management | Zustand |
| Linting | oxlint |

## Getting started

### 1. Install dependencies
```bash
npm install
```

### 2. Start the dev server
```bash
npm run dev
```

### 3. Open in browser
Visit `http://localhost:5173`

Other scripts: `npm run build` (production build), `npm run preview` (preview the build), `npm run lint` (oxlint).

## Project structure

```
src/
├── components/
│   ├── 3d/
│   │   ├── HouseViewer.jsx      # 3D canvas/scene, camera, grid, color picker popup
│   │   └── Room3D.jsx           # A single room in 3D (walls, floor, ceiling, door/window cutouts)
│   ├── editor/
│   │   └── FloorPlanEditor.jsx  # 2D top-down floor plan view (drag, resize, snapping, pan/zoom)
│   └── ui/
│       ├── Navbar.jsx           # Top bar with 2D/3D toggle and dark mode switch
│       └── Sidebar.jsx          # Room list, color/size controls, doors/windows/interior walls
├── store/
│   └── useHouseStore.js         # Central data store (all rooms, walls, doors, windows live here)
├── constants/
│   └── floorPlan.js             # Shared 2D scale/padding constants (editor <-> store)
├── theme.js                      # Color palette + tokens (light/dark)
├── App.jsx                      # Root component — layout shell
└── main.jsx                     # Entry point
```

## Coming next (Phase 2)

- Upload floor plan image → AI reads dimensions
- User accounts and saved designs
- Real 3D furniture models
- Shareable design links
