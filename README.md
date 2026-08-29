# 🏠🦖 HomeVision

An interactive home configurator. Design your floor plan in 2D, then walk through the same house in 3D.

**Live:** [homevision-beta.vercel.app](https://homevision-beta.vercel.app)

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
- **Furniture** — drop in beds, sofas, tables, chairs, and wardrobes from presets, drag to reposition, resize by dragging a corner, or double-click (double-tap) a piece to type its exact width/depth/height
- **Meters or feet** — toggle the display unit from the navbar; room geometry is still stored in meters underneath
- **Room management** — add rooms or open floor areas, rename, resize, and delete them from the sidebar (with a confirmation before deleting)
- **Accounts & saved designs** — sign up/sign in, save the current design to your account, and load, delete, or bulk-delete-all of your saved designs from "My designs" to free up space (needs a Supabase project — see [Set up accounts & saved designs](#set-up-accounts--saved-designs-optional) below; the app runs fine without one, it just shows a setup hint instead)
- **Shareable design links** — mark a saved design public to get a link anyone can open (and fork their own copy of) without needing an account
- **3D house viewer** — the same house rendered in Three.js, walls cut out around doors/windows, auto-centered on the grid regardless of where rooms sit in 2D space
- **Dark mode** — toggle from the navbar, applied across both views
- **Mobile-friendly** — touch pinch-to-zoom and pan on the 2D canvas, a bottom-sheet properties drawer and collapsed navbar menu on small screens
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
| Accounts & saved designs | Supabase (Postgres + Auth) |
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

## Set up accounts & saved designs (optional)

Everything else in the app works with zero setup. Accounts and saved designs are backed by
[Supabase](https://supabase.com) and only need configuring if you want that feature:

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the SQL editor in your project and run [`supabase/schema.sql`](supabase/schema.sql) — it creates the `designs` table and its row-level security policies (each user can only see/edit their own).
3. In **Project Settings → API**, copy the **Project URL** and **anon public** key.
4. Copy `.env.example` to `.env.local` and fill in those two values:
   ```bash
   cp .env.example .env.local
   ```
5. Restart the dev server (`npm run dev`) so Vite picks up the new env vars.

Without this, "Sign in" and "My designs" still appear in the navbar, but open a panel explaining
how to connect Supabase instead of a working form — the rest of the app is unaffected.

## Project structure

```
src/
├── components/
│   ├── 3d/
│   │   ├── HouseViewer.jsx      # 3D canvas/scene, camera, grid, color picker popup + eyedropper
│   │   └── Room3D.jsx           # A single room in 3D (walls, floor, ceiling, door/window cutouts, furniture)
│   ├── editor/
│   │   └── FloorPlanEditor.jsx  # 2D top-down floor plan view (drag, resize, rotate, snapping, multi-select, furniture, pinch/pan/zoom)
│   ├── ui/
│   │   ├── Navbar.jsx           # Top bar: 2D/3D toggle, unit toggle, dark mode switch, account controls (collapses to a menu on mobile)
│   │   ├── Sidebar.jsx          # Room list, color/size/rotation controls, doors/windows/interior walls, furniture (a bottom-sheet drawer on mobile)
│   │   ├── Modal.jsx            # Shared centered-dialog wrapper (used by the auth/designs panels)
│   │   ├── OpenDesignModal.jsx  # Paste a shared design link (or bare id) to open someone else's design
│   │   ├── SharedDesignBanner.jsx # Shown when viewing a design via share link; lets the visitor save their own copy
│   │   └── DimensionInput.jsx   # Number input for exact width/depth/height, clamped on blur
│   ├── auth/
│   │   ├── AuthModal.jsx            # Sign in / create account form (or a Supabase setup hint if unconfigured)
│   │   ├── DesignsPanel.jsx         # Save the current design; list/load/delete/share your saved designs
│   │   └── DeleteAccountSection.jsx # "Danger zone" account deletion, gated behind typing a confirmation word
│   └── ErrorBoundary.jsx        # Catches render crashes, offers retry/reload instead of a blank page
├── store/
│   ├── useHouseStore.js         # Central data store (all rooms, walls, doors, windows, furniture live here)
│   ├── useAuthStore.js          # Signed-in user + sign up/in/out/delete, backed by Supabase Auth
│   └── useDesignsStore.js       # Saved-design list + save/load/delete/share against Supabase
├── lib/
│   └── supabaseClient.js        # Supabase client (null if VITE_SUPABASE_* env vars aren't set)
├── hooks/
│   └── useIsMobile.js           # Media-query hook driving the mobile layouts above
├── constants/
│   ├── floorPlan.js             # Shared 2D scale/padding constants (editor <-> store)
│   ├── lshape.js                # L-shaped room edge/wall-key geometry
│   └── furniture.js             # Furniture presets (type, size, color) offered in the sidebar
├── utils/
│   ├── roomGeometry.js          # Drag-snap math for the 2D editor
│   ├── wallGeometry.js          # 3D wall/opening layout math (rect + L-shaped rooms)
│   ├── interiorWallGeometry.js  # Interior wall drag/stretch/snap math
│   ├── furnitureGeometry.js     # Corner-drag resize math for furniture
│   ├── pointerPosition.js       # Reads clientX/Y from either a mouse or touch event
│   ├── units.js                 # Meters <-> feet conversion/formatting for display
│   ├── shareLink.js             # Builds a design's shareable URL
│   └── id.js                    # Unique id generation for rooms/walls/doors/windows/furniture
├── theme.js                      # Color palette + tokens (light/dark)
├── App.jsx                      # Root component — layout shell
└── main.jsx                     # Entry point

supabase/
└── schema.sql                   # `designs` table + row-level security policies — run in Supabase's SQL editor
```

Most files under `utils/`, `constants/`, and `store/` have a matching `*.test.js` alongside them.

## Coming next (Phase 2)

- Upload floor plan image → AI reads dimensions
- Real 3D furniture models (furniture today is placeholder colored boxes, sized to scale)
