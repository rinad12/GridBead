import { useReducer, useState, useCallback } from 'react';
import locales from './locales.js';
import { floodFill } from './utils/floodFill.js';
import { downloadBead, openBeadFile, exportPng } from './utils/fileUtils.js';

import TopBar from './components/TopBar.jsx';
import Sidebar from './components/Sidebar.jsx';
import BeadCanvas from './components/BeadCanvas.jsx';
import BeadCounter from './components/BeadCounter.jsx';
import NewProjectModal from './components/NewProjectModal.jsx';
import ColorEditModal from './components/ColorEditModal.jsx';
import ExportModal from './components/ExportModal.jsx';
import AboutModal from './components/AboutModal.jsx';

// ─────────────────────────────────────────────
// Default color palette
// ─────────────────────────────────────────────
const DEFAULT_COLORS = [
  { id: 'c1',  name: 'White',      hex: '#FFFFFF' },
  { id: 'c2',  name: 'Black',      hex: '#1A1A1A' },
  { id: 'c3',  name: 'Red',        hex: '#E53E3E' },
  { id: 'c4',  name: 'Orange',     hex: '#ED8936' },
  { id: 'c5',  name: 'Yellow',     hex: '#ECC94B' },
  { id: 'c6',  name: 'Lime',       hex: '#68D391' },
  { id: 'c7',  name: 'Teal',       hex: '#38B2AC' },
  { id: 'c8',  name: 'Sky',        hex: '#63B3ED' },
  { id: 'c9',  name: 'Blue',       hex: '#4C51BF' },
  { id: 'c10', name: 'Purple',     hex: '#9F7AEA' },
  { id: 'c11', name: 'Pink',       hex: '#ED64A6' },
  { id: 'c12', name: 'Brown',      hex: '#A0522D' },
  { id: 'c13', name: 'Silver',     hex: '#A0AEC0' },
  { id: 'c14', name: 'Gold',       hex: '#D69E2E' },
];

// ─────────────────────────────────────────────
// State shape & reducer
// ─────────────────────────────────────────────
const initialState = {
  projectName: 'New Design',
  gridType: 'square',
  width: 20,
  height: 20,
  cells: {},             // { "col,row": "#RRGGBB" }
  colors: DEFAULT_COLORS,
  selectedColorId: 'c1',
  tool: 'pencil',
  showGrid: true,
};

let colorIdCounter = DEFAULT_COLORS.length + 1;

function reducer(state, action) {
  switch (action.type) {

    case 'SET_CELL':
      return { ...state, cells: { ...state.cells, [`${action.col},${action.row}`]: action.color } };

    case 'ERASE_CELL': {
      const cells = { ...state.cells };
      delete cells[`${action.col},${action.row}`];
      return { ...state, cells };
    }

    case 'FLOOD_FILL': {
      const newCells = floodFill(
        state.cells, action.col, action.row,
        action.fillColor, state.width, state.height
      );
      return { ...state, cells: newCells };
    }

    case 'SET_GRID_TYPE':
      return { ...state, gridType: action.gridType };

    case 'RESIZE_GRID': {
      const cells = {};
      for (const [key, color] of Object.entries(state.cells)) {
        const [col, row] = key.split(',').map(Number);
        if (col < action.width && row < action.height) cells[key] = color;
      }
      return { ...state, width: action.width, height: action.height, cells };
    }

    case 'NEW_PROJECT':
      return {
        ...initialState,
        colors: state.colors, // keep palette by default
        ...action.data,
        cells: action.data.cells ?? {},
      };

    case 'LOAD_PROJECT':
      return { ...state, ...action.data };

    case 'SELECT_COLOR':
      return { ...state, selectedColorId: action.id, tool: state.tool === 'eyedropper' ? 'pencil' : state.tool };

    case 'SET_TOOL':
      return { ...state, tool: action.tool };

    case 'TOGGLE_GRID':
      return { ...state, showGrid: !state.showGrid };

    case 'ADD_COLOR': {
      const id = `custom_${colorIdCounter++}`;
      return { ...state, colors: [...state.colors, { id, ...action.data }], selectedColorId: id };
    }

    case 'UPDATE_COLOR':
      return {
        ...state,
        colors: state.colors.map((c) => (c.id === action.id ? { ...c, ...action.data } : c)),
      };

    case 'DELETE_COLOR': {
      const colorHex = state.colors.find((c) => c.id === action.id)?.hex;
      const cells = {};
      for (const [key, color] of Object.entries(state.cells)) {
        if (color !== colorHex) cells[key] = color;
      }
      const remaining = state.colors.filter((c) => c.id !== action.id);
      return {
        ...state,
        colors: remaining,
        cells,
        selectedColorId: state.selectedColorId === action.id ? (remaining[0]?.id ?? null) : state.selectedColorId,
      };
    }

    case 'SET_PROJECT_NAME':
      return { ...state, projectName: action.name };

    default:
      return state;
  }
}

// ─────────────────────────────────────────────
// App
// ─────────────────────────────────────────────
export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [language, setLanguage] = useState('en');
  const [isDark, setIsDark] = useState(true);
  const t = locales[language];

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('light', !next);
      return next;
    });
  }, []);

  // Modal states
  const [modal, setModal] = useState(null); // 'new' | 'color-add' | 'color-edit' | 'export' | 'about'
  const [editingColorId, setEditingColorId] = useState(null);

  const selectedColor = state.colors.find((c) => c.id === state.selectedColorId);

  // ── Canvas paint handler ──────────────────────
  const onCellPaint = useCallback((action) => {
    if (action.type === 'SET_CELL') {
      if (!selectedColor) return;
      dispatch({ ...action, color: selectedColor.hex });
    } else if (action.type === 'FLOOD_FILL') {
      if (!selectedColor) return;
      dispatch({ ...action, fillColor: selectedColor.hex });
    } else {
      dispatch(action);
    }
  }, [selectedColor]);

  const onColorPick = useCallback((hexColor) => {
    const match = state.colors.find((c) => c.hex === hexColor);
    if (match) {
      dispatch({ type: 'SELECT_COLOR', id: match.id });
    } else {
      // Add the picked color to palette
      dispatch({ type: 'ADD_COLOR', data: { hex: hexColor, name: hexColor } });
    }
  }, [state.colors]);

  // ── File operations ───────────────────────────
  const handleNew = useCallback(() => setModal('new'), []);

  const handleOpen = useCallback(async () => {
    try {
      const data = await openBeadFile();
      dispatch({ type: 'LOAD_PROJECT', data });
    } catch (err) {
      if (err.message !== 'No file selected') alert('Failed to open file: ' + err.message);
    }
  }, []);

  const handleSave = useCallback(() => {
    downloadBead(state);
  }, [state]);

  const handleExport = useCallback(() => setModal('export'), []);

  // ── Modals ────────────────────────────────────
  const handleNewConfirm = useCallback((data) => {
    dispatch({ type: 'NEW_PROJECT', data });
    setModal(null);
  }, []);

  const handleAddColor = useCallback(() => {
    setEditingColorId(null);
    setModal('color-add');
  }, []);

  const handleEditColor = useCallback((id) => {
    setEditingColorId(id);
    setModal('color-edit');
  }, []);

  const handleColorConfirm = useCallback((data) => {
    if (modal === 'color-edit' && editingColorId) {
      dispatch({ type: 'UPDATE_COLOR', id: editingColorId, data });
    } else {
      dispatch({ type: 'ADD_COLOR', data });
    }
    setModal(null);
    setEditingColorId(null);
  }, [modal, editingColorId]);

  const handleExportConfirm = useCallback((bg, scale) => {
    exportPng(state, bg, scale);
    setModal(null);
  }, [state]);

  const editingColor = editingColorId ? state.colors.find((c) => c.id === editingColorId) : null;

  return (
    <div className="flex flex-col h-full bg-studio-bg">
      {/* Top bar */}
      <TopBar
        projectName={state.projectName}
        language={language}
        setLanguage={setLanguage}
        onNew={handleNew}
        onOpen={handleOpen}
        onSave={handleSave}
        onExport={handleExport}
        onAbout={() => setModal('about')}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        t={t}
      />

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <Sidebar
          tool={state.tool}
          setTool={(tool) => dispatch({ type: 'SET_TOOL', tool })}
          gridType={state.gridType}
          setGridType={(gridType) => dispatch({ type: 'SET_GRID_TYPE', gridType })}
          gridWidth={state.width}
          gridHeight={state.height}
          onResize={(w, h) => dispatch({ type: 'RESIZE_GRID', width: w, height: h })}
          colors={state.colors}
          selectedColorId={state.selectedColorId}
          onSelectColor={(id) => dispatch({ type: 'SELECT_COLOR', id })}
          onAddColor={handleAddColor}
          onEditColor={handleEditColor}
          onDeleteColor={(id) => dispatch({ type: 'DELETE_COLOR', id })}
          showGrid={state.showGrid}
          toggleGrid={() => dispatch({ type: 'TOGGLE_GRID' })}
          t={t}
        />

        {/* Canvas area */}
        <main className="flex-1 overflow-hidden">
          <BeadCanvas
            cells={state.cells}
            gridType={state.gridType}
            width={state.width}
            height={state.height}
            selectedColor={selectedColor?.hex ?? '#FFFFFF'}
            tool={state.tool}
            showGrid={state.showGrid}
            onCellPaint={onCellPaint}
            onColorPick={onColorPick}
            isDark={isDark}
            t={t}
          />
        </main>

        {/* Right: bead counter */}
        <BeadCounter cells={state.cells} colors={state.colors} t={t} />
      </div>

      {/* ── Modals ── */}
      {modal === 'new' && (
        <NewProjectModal onConfirm={handleNewConfirm} onCancel={() => setModal(null)} t={t} />
      )}

      {(modal === 'color-add' || modal === 'color-edit') && (
        <ColorEditModal
          initial={editingColor ?? null}
          onConfirm={handleColorConfirm}
          onCancel={() => { setModal(null); setEditingColorId(null); }}
          t={t}
        />
      )}

      {modal === 'export' && (
        <ExportModal onConfirm={handleExportConfirm} onCancel={() => setModal(null)} t={t} />
      )}

      {modal === 'about' && (
        <AboutModal onClose={() => setModal(null)} t={t} />
      )}
    </div>
  );
}
