# 🏠 HomeVision

An interactive 3D home configurator. Design your house in 2D, walk through it in 3D.

## What it does right now

- **3D house viewer** — see your rooms rendered in 3D, rotate and zoom freely
- **2D floor plan editor** — top-down view, drag rooms to reposition them
- **Wall & floor color picker** — click a room, change its colors in real time
- **Room management** — add rooms, rename them, resize them, delete them
- **Switch views** — toggle between 2D and 3D with one click

## Tech stack

| Part | Technology |
|---|---|
| UI framework | React + Vite |
| 3D engine | Three.js via React Three Fiber |
| 3D helpers | Drei (orbit controls, lighting, grid) |
| 2D editor | Konva.js via react-konva |
| Color picker | react-colorful |
| State management | Zustand |

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

## Project structure

```
src/
├── components/
│   ├── 3d/
│   │   ├── HouseViewer.jsx      # The 3D canvas and scene
│   │   └── Room3D.jsx           # A single room in 3D (walls, floor, ceiling)
│   ├── editor/
│   │   └── FloorPlanEditor.jsx  # The 2D top-down floor plan view
│   └── ui/
│       ├── Navbar.jsx           # Top bar with 2D/3D toggle
│       └── Sidebar.jsx          # Room list + color/size controls
├── store/
│   └── useHouseStore.js         # Central data store (all rooms live here)
├── App.jsx                      # Root component — layout shell
└── main.jsx                     # Entry point
```

## Connecting to GitHub

```bash
git init
git add .
git commit -m "Initial commit — HomeVision starter"
git remote add origin https://github.com/YOUR_USERNAME/homevision.git
git push -u origin main
```

## Coming next (Phase 2)

- Upload floor plan image → AI reads dimensions
- User accounts and saved designs
- Real 3D furniture models
- Doors and windows
- Shareable design links
