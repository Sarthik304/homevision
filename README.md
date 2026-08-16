# 🏠🦖 HomeVision

An interactive home configurator. Design your floor plan in 2D, then walk through the same house in 3D.

## What it does right now

- **2D floor plan editor** — drag rooms to reposition them, resize via edge handles, pan and zoom the canvas
- **Rectangle & L-shaped rooms** — pick a shape when adding a room; L-shaped rooms get a draggable notch with its own resize handles
- **Rotation** — spin a room in 45° clicks via its drag handle, or type an exact degree in the sidebar
- **Multi-select** — shift-click rooms or shift-drag a marquee box to select several, then drag any one to move the whole group together
- **Smart snapping** — drag a room near another and it snaps flush edge-to-edge, or corner-to-corner when the two just touch diagonally, so walls line up straight
- **New rooms spawn where you're looking** — adding a room or floor drops it at the center of your current 2D view instead of a fixed corner
- **Interior walls** — add walls inside a room, drag their endpoints to rotate/stretch them, place doors and windows on them
- **Boundary walls, doors & windows** — toggle any of a room's four outer walls on/off, add doors and windows with configurable width/position (and height for windows)
- **Wall & floor color picker** — click a wall or floor to select it, double-click (or double-tap) a wall in 3D to change just that wall's color, with an eyedropper to sample a color from another wall
- **Meters or feet** — toggle the display unit from the navbar; room geometry is still stored in meters underneath
- **Room management** — add rooms or open floor areas, rename, resize, and delete them from the sidebar (with a confirmation before deleting)
- **3D house viewer** — the same house rendered in Three.js, walls cut out around doors/windows, auto-centered on the grid regardless of where rooms sit in 2D space
- **Dark mode** — toggle from the navbar, applied across both views
- **Switch views** — jump between the 2D plan and 3D view with one click
- **Crash recovery** — an error boundary catches render crashes instead of showing a blank page, with options to retry or reload

## Tech stack

| Part | Technology |
|---|---|
| UI framework | React + Vite |
| 3D engine | Three.js via React Three Fiber |
| 3D helpers | Drei (orbit controls, lighting, grid) |
| 2D editor | Konva.js via react-konva |
| Color picker | react-colorful |
| State management | Zustand |
| Testing | Vitest + React Testing Library |
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

Other scripts: `npm run build` (production build), `npm run preview` (preview the build), `npm run lint` (oxlint), `npm test` (run the Vitest suite).

## Project structure

```
src/
├── components/
│   ├── 3d/
│   │   ├── HouseViewer.jsx      # 3D canvas/scene, camera, grid, color picker popup + eyedropper
│   │   └── Room3D.jsx           # A single room in 3D (walls, floor, ceiling, door/window cutouts)
│   ├── editor/
│   │   └── FloorPlanEditor.jsx  # 2D top-down floor plan view (drag, resize, rotate, snapping, multi-select, pan/zoom)
│   ├── ui/
│   │   ├── Navbar.jsx           # Top bar: 2D/3D toggle, unit toggle, dark mode switch
│   │   └── Sidebar.jsx          # Room list, color/size/rotation controls, doors/windows/interior walls
│   └── ErrorBoundary.jsx        # Catches render crashes, offers retry/reload instead of a blank page
├── store/
│   └── useHouseStore.js         # Central data store (all rooms, walls, doors, windows live here)
├── constants/
│   ├── floorPlan.js             # Shared 2D scale/padding constants (editor <-> store)
│   └── lshape.js                # L-shaped room edge/wall-key geometry
├── utils/
│   ├── roomGeometry.js          # Drag-snap math for the 2D editor
│   ├── wallGeometry.js          # 3D wall/opening layout math (rect + L-shaped rooms)
│   ├── interiorWallGeometry.js  # Interior wall drag/stretch/snap math
│   ├── units.js                 # Meters <-> feet conversion/formatting for display
│   └── id.js                    # Unique id generation for rooms/walls/doors/windows
├── theme.js                      # Color palette + tokens (light/dark)
├── App.jsx                      # Root component — layout shell
└── main.jsx                     # Entry point
```

Most files under `utils/`, `constants/`, and `store/` have a matching `*.test.js` alongside them.

## Coming next (Phase 2)

- Upload floor plan image → AI reads dimensions
- User accounts and saved designs
- Real 3D furniture models
- Shareable design links
