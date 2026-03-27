#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Loomy – Project Setup & Structured Git Commit Script
# Run this once after cloning / initialising the repo.
# ─────────────────────────────────────────────────────────────
set -e

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   Loomy – Beadwork Designer Setup   ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── 1. Install dependencies ──────────────────────────────────
echo "► Installing dependencies..."
npm install
echo "  Done."
echo ""

# ── 2. Stage & commit: boilerplate ──────────────────────────
echo "► Committing boilerplate..."
git add \
  package.json \
  vite.config.js \
  tailwind.config.js \
  postcss.config.js \
  index.html \
  src/main.jsx \
  src/index.css

git commit -m "chore: initialise Loomy project (Vite + React + Tailwind CSS)"
echo "  ✔ Boilerplate committed."
echo ""

# ── 3. Stage & commit: Canvas Engine ────────────────────────
echo "► Committing Canvas Engine..."
git add \
  src/utils/floodFill.js \
  src/utils/fileUtils.js \
  src/components/BeadCanvas.jsx

git commit -m "feat(canvas): implement bead grid engine

- HTML5 Canvas renderer with zoom (0.3x–8x) and pan (wheel + middle-click + spacebar)
- Three stitch layouts: Square/Loom, Brick Stitch, Peyote Stitch
- Pencil, Eraser, Flood-Fill (BFS), and Eyedropper tools
- Real-time hover tooltip showing bead coordinates and hex color
- High-resolution PNG export with transparent/white/black background
- .bead (JSON) save/load file format"
echo "  ✔ Canvas Engine committed."
echo ""

# ── 4. Stage & commit: UI + Localisation ────────────────────
echo "► Committing UI & Localisation..."
git add \
  src/locales.js \
  src/App.jsx \
  src/components/TopBar.jsx \
  src/components/Sidebar.jsx \
  src/components/BeadCounter.jsx \
  src/components/NewProjectModal.jsx \
  src/components/ColorEditModal.jsx \
  src/components/ExportModal.jsx \
  src/components/AboutModal.jsx

git commit -m "feat(ui): complete Studio UI with EN/RU localisation

- Top bar: project name, file menu (New/Open/Save/Export/About), language toggle
- Sidebar: tool selector, grid type, dynamic grid resize, colour palette
  with add/edit/delete and context menu
- Bead counter panel: live per-colour counts + grand total
- Modals: New Project, Colour Editor, PNG Export settings, About
- Full English and Russian translations (instant no-reload toggle)
- Dark Studio theme via Tailwind custom colour tokens"
echo "  ✔ UI & Localisation committed."
echo ""

# ── 5. Done ──────────────────────────────────────────────────
echo "╔══════════════════════════════════════════════════════╗"
echo "║  Setup complete!  Run → npm run dev  to launch Loomy ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
