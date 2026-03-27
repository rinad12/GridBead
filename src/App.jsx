import { useReducer, useState, useCallback, useEffect, useRef } from 'react';
import locales from './locales.js';
import { floodFill } from './utils/floodFill.js';
import {
  saveBeadNative, saveBeadAs,
  openBeadNative, exportPngNative,
  pushRecentFile,
} from './utils/fileUtils.js';

import TopBar from './components/TopBar.jsx';
import Sidebar from './components/Sidebar.jsx';
import BeadCanvas from './components/BeadCanvas.jsx';
import BeadCounter from './components/BeadCounter.jsx';
import WelcomeScreen from './components/WelcomeScreen.jsx';
import NewProjectModal from './components/NewProjectModal.jsx';
import ColorEditModal from './components/ColorEditModal.jsx';
import ExportModal from './components/ExportModal.jsx';
import AboutModal from './components/AboutModal.jsx';

// ─────────────────────────────────────────────
// Default color palette
// ─────────────────────────────────────────────
const DEFAULT_COLORS = [
  { id: 'c1',  name: 'White',  hex: '#FFFFFF' },
  { id: 'c2',  name: 'Black',  hex: '#1A1A1A' },
  { id: 'c3',  name: 'Red',    hex: '#E53E3E' },
  { id: 'c4',  name: 'Orange', hex: '#ED8936' },
  { id: 'c5',  name: 'Yellow', hex: '#ECC94B' },
  { id: 'c6',  name: 'Lime',   hex: '#68D391' },
  { id: 'c7',  name: 'Teal',   hex: '#38B2AC' },
  { id: 'c8',  name: 'Sky',    hex: '#63B3ED' },
  { id: 'c9',  name: 'Blue',   hex: '#4C51BF' },
  { id: 'c10', name: 'Purple', hex: '#9F7AEA' },
  { id: 'c11', name: 'Pink',   hex: '#ED64A6' },
  { id: 'c12', name: 'Brown',  hex: '#A0522D' },
  { id: 'c13', name: 'Silver', hex: '#A0AEC0' },
  { id: 'c14', name: 'Gold',   hex: '#D69E2E' },
];

// ─────────────────────────────────────────────
// State & reducer
// ─────────────────────────────────────────────
const initialState = {
  projectName: 'New Design',
  gridType: 'square',
  width: 20,
  height: 20,
  cells: {},
  colors: DEFAULT_COLORS,
  selectedColorId: 'c1',
  tool: 'pencil',
  showGrid: true,
};

let colorIdCounter = DEFAULT_COLORS.length + 1;

// Actions that make the project dirty (unsaved)
const DIRTY_ACTIONS = new Set([
  'SET_CELL', 'ERASE_CELL', 'FLOOD_FILL',
  'ADD_COLOR', 'UPDATE_COLOR', 'DELETE_COLOR',
  'RESIZE_GRID', 'SET_GRID_TYPE', 'SET_PROJECT_NAME',
  'CLEAR_CELLS',
]);

// Single-action operations that push their own history snapshot via dispatch
// (pencil/eraser strokes are handled by onStrokeStart instead)
const HISTORY_ACTIONS = new Set(['FLOOD_FILL', 'CLEAR_CELLS']);

const MAX_HISTORY = 20;

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

    case 'SET_CELLS':
      return { ...state, cells: action.cells };

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
        colors: state.colors,
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

    case 'CLEAR_CELLS':
      return { ...state, cells: {} };

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
  const [state, rawDispatch] = useReducer(reducer, initialState);
  const [language, setLanguage] = useState('en');
  const [isDark, setIsDark] = useState(true);

  // Screen: 'welcome' | 'canvas'
  const [screen, setScreen] = useState('welcome');
  const [isDirty, setIsDirty] = useState(false);
  const [fileHandle, setFileHandle] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);

  // Undo/redo history (tracks cells snapshots only)
  const [history, setHistory] = useState({ past: [], future: [] });

  // Stable ref to current cells — read without stale closure in callbacks
  const cellsRef = useRef(state.cells);
  cellsRef.current = state.cells;

  // Ref to BeadCanvas imperative handle (zoom controls)
  const canvasRef = useRef(null);

  const t = locales[language];

  // ── Dispatch wrapper: history + dirty tracking ──────
  const dispatch = useCallback((action) => {
    if (HISTORY_ACTIONS.has(action.type)) {
      setHistory((h) => ({
        past: [...h.past.slice(-(MAX_HISTORY - 1)), cellsRef.current],
        future: [],
      }));
    }
    rawDispatch(action);
    if (DIRTY_ACTIONS.has(action.type)) setIsDirty(true);
  }, []);

  // ── Stroke start: snapshot once before a pencil/eraser drag ──
  const handleStrokeStart = useCallback(() => {
    setHistory((h) => ({
      past: [...h.past.slice(-(MAX_HISTORY - 1)), cellsRef.current],
      future: [],
    }));
  }, []);

  // ── Undo / Redo ─────────────────────────────────────
  const handleUndo = useCallback(() => {
    setHistory((h) => {
      if (!h.past.length) return h;
      const past = h.past.slice();
      const prev = past.pop();
      rawDispatch({ type: 'SET_CELLS', cells: prev });
      setIsDirty(true);
      return { past, future: [cellsRef.current, ...h.future].slice(0, MAX_HISTORY) };
    });
  }, []);

  const handleRedo = useCallback(() => {
    setHistory((h) => {
      if (!h.future.length) return h;
      const future = h.future.slice();
      const next = future.shift();
      rawDispatch({ type: 'SET_CELLS', cells: next });
      setIsDirty(true);
      return { past: [...h.past, cellsRef.current].slice(-MAX_HISTORY), future };
    });
  }, []);

  // ── Zoom (delegates to canvas imperative handle) ────
  const handleZoomIn    = useCallback(() => canvasRef.current?.zoomIn(),    []);
  const handleZoomOut   = useCallback(() => canvasRef.current?.zoomOut(),   []);
  const handleZoomReset = useCallback(() => canvasRef.current?.resetZoom(), []);

  // ── Warn on close with unsaved changes ──────────────
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (isDirty && screen === 'canvas') { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty, screen]);

  // ── Global keyboard shortcuts ────────────────────────
  useEffect(() => {
    if (screen !== 'canvas') return;

    const onKeyDown = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;

      switch (e.key) {
        case 'z': e.preventDefault(); e.shiftKey ? handleRedo() : handleUndo(); break;
        case 'y': e.preventDefault(); handleRedo(); break;
        case 's': e.preventDefault(); e.shiftKey ? handleSaveAs() : handleSave(); break;
        case 'n': e.preventDefault(); handleNew(); break;
        case 'o': e.preventDefault(); handleOpen(); break;
        case '=':
        case '+': e.preventDefault(); handleZoomIn(); break;
        case '-': e.preventDefault(); handleZoomOut(); break;
        case '0': e.preventDefault(); handleZoomReset(); break;
        default: break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, handleUndo, handleRedo, handleZoomIn, handleZoomOut, handleZoomReset]);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('light', !next);
      return next;
    });
  }, []);

  // Modal state
  const [modal, setModal] = useState(null);
  const [editingColorId, setEditingColorId] = useState(null);

  const selectedColor = state.colors.find((c) => c.id === state.selectedColorId);

  // ── Navigation ────────────────────────────────────────
  const handleGoHome = useCallback(() => {
    if (isDirty && !window.confirm(t.unsavedChanges)) return;
    setScreen('welcome');
    setIsDirty(false);
    setFileHandle(null);
    setHistory({ past: [], future: [] });
  }, [isDirty, t]);

  // ── Canvas paint ──────────────────────────────────────
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
  }, [selectedColor, dispatch]);

  const onColorPick = useCallback((hexColor) => {
    const match = state.colors.find((c) => c.hex === hexColor);
    if (match) dispatch({ type: 'SELECT_COLOR', id: match.id });
    else        dispatch({ type: 'ADD_COLOR', data: { hex: hexColor, name: hexColor } });
  }, [state.colors, dispatch]);

  // ── Edit ─────────────────────────────────────────────
  const handleClearCanvas = useCallback(() => {
    if (!Object.keys(state.cells).length) return;
    if (!window.confirm(t.confirmClear)) return;
    dispatch({ type: 'CLEAR_CELLS' });
  }, [state.cells, t, dispatch]);

  // ── File ─────────────────────────────────────────────
  const handleNew = useCallback(() => setModal('new'), []);

  const handleOpen = useCallback(async () => {
    if (screen === 'canvas' && isDirty && !window.confirm(t.unsavedChanges)) return;
    try {
      const result = await openBeadNative();
      if (!result) return;
      rawDispatch({ type: 'LOAD_PROJECT', data: result.data });
      setFileHandle(result.fileHandle);
      setIsDirty(false);
      setHistory({ past: [], future: [] });
      setScreen('canvas');
      pushRecentFile(result.data.projectName || result.fileName);
    } catch (err) {
      alert('Failed to open file: ' + err.message);
    }
  }, [screen, isDirty, t]);

  const handleSave = useCallback(async () => {
    try {
      const handle = await saveBeadNative(state, fileHandle);
      if (handle) { setFileHandle(handle); pushRecentFile(state.projectName); }
      setIsDirty(false);
    } catch (err) {
      alert('Save failed: ' + err.message);
    }
  }, [state, fileHandle]);

  const handleSaveAs = useCallback(async () => {
    try {
      const handle = await saveBeadAs(state);
      if (handle) { setFileHandle(handle); pushRecentFile(state.projectName); }
      setIsDirty(false);
    } catch (err) {
      alert('Save failed: ' + err.message);
    }
  }, [state]);

  const handleExport = useCallback(() => setModal('export'), []);

  // ── Modals ────────────────────────────────────────────
  const handleNewConfirm = useCallback((data) => {
    rawDispatch({ type: 'NEW_PROJECT', data });
    setFileHandle(null);
    setIsDirty(false);
    setHistory({ past: [], future: [] });
    setModal(null);
    setScreen('canvas');
  }, []);

  const handleAddColor  = useCallback(() => { setEditingColorId(null); setModal('color-add'); }, []);
  const handleEditColor = useCallback((id) => { setEditingColorId(id); setModal('color-edit'); }, []);

  const handleColorConfirm = useCallback((data) => {
    if (modal === 'color-edit' && editingColorId) dispatch({ type: 'UPDATE_COLOR', id: editingColorId, data });
    else dispatch({ type: 'ADD_COLOR', data });
    setModal(null);
    setEditingColorId(null);
  }, [modal, editingColorId, dispatch]);

  const handleExportConfirm = useCallback(async (bg, scale) => {
    await exportPngNative(state, bg, scale);
    setModal(null);
  }, [state]);

  const editingColor = editingColorId ? state.colors.find((c) => c.id === editingColorId) : null;

  // ── Render ─────────────────────────────────────────────

  if (screen === 'welcome') {
    return (
      <>
        <WelcomeScreen
          onNew={handleNew}
          onOpen={handleOpen}
          t={t}
          language={language}
          setLanguage={setLanguage}
          isDark={isDark}
          onToggleTheme={toggleTheme}
        />
        {modal === 'new' && (
          <NewProjectModal onConfirm={handleNewConfirm} onCancel={() => setModal(null)} t={t} showWarning={false} />
        )}
      </>
    );
  }

  // ── Canvas screen ──────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-studio-bg">
      <TopBar
        language={language}
        setLanguage={setLanguage}
        onNew={handleNew}
        onOpen={handleOpen}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onExport={handleExport}
        onClearCanvas={handleClearCanvas}
        onAbout={() => setModal('about')}
        onGoHome={handleGoHome}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        isDirty={isDirty}
        showGrid={state.showGrid}
        onToggleGrid={() => dispatch({ type: 'TOGGLE_GRID' })}
        showSidebar={showSidebar}
        onToggleSidebar={() => setShowSidebar((v) => !v)}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        t={t}
      />

      <div className="flex flex-1 overflow-hidden">
        {showSidebar && (
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
        )}

        <main className="flex-1 overflow-hidden">
          <BeadCanvas
            ref={canvasRef}
            cells={state.cells}
            gridType={state.gridType}
            width={state.width}
            height={state.height}
            selectedColor={selectedColor?.hex ?? '#FFFFFF'}
            tool={state.tool}
            showGrid={state.showGrid}
            onCellPaint={onCellPaint}
            onColorPick={onColorPick}
            onStrokeStart={handleStrokeStart}
            isDark={isDark}
            t={t}
          />
        </main>

        {showSidebar && (
          <BeadCounter cells={state.cells} colors={state.colors} t={t} />
        )}
      </div>

      {/* ── Modals ── */}
      {modal === 'new' && (
        <NewProjectModal onConfirm={handleNewConfirm} onCancel={() => setModal(null)} t={t} showWarning={true} />
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
