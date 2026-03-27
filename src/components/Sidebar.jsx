import { useState, useRef } from 'react';

const GRID_TYPES = ['square', 'brick', 'peyote'];

const TOOL_ICONS = {
  pencil: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  ),
  eraser: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-9 9M14 4l6 6-9 9H5v-6l9-9z" />
    </svg>
  ),
  fill: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  ),
  eyedropper: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4 .568.568 0 01.163-.413l9.65-9.65a.5.5 0 01.707 0l3.536 3.536a.5.5 0 010 .707l-9.65 9.65A.568.568 0 017 21z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 13l1.5-1.5a2.121 2.121 0 000-3L16 5" />
    </svg>
  ),
};

export default function Sidebar({
  tool, setTool,
  gridType, setGridType,
  gridWidth, gridHeight, onResize,
  colors, selectedColorId,
  onSelectColor, onAddColor, onEditColor, onDeleteColor,
  showGrid, toggleGrid,
  t,
}) {
  const [wInput, setWInput] = useState(gridWidth);
  const [hInput, setHInput] = useState(gridHeight);
  const [colorMenu, setColorMenu] = useState(null); // { id, x, y }

  const applySize = () => {
    const w = Math.max(2, Math.min(200, parseInt(wInput) || gridWidth));
    const h = Math.max(2, Math.min(200, parseInt(hInput) || gridHeight));
    setWInput(w);
    setHInput(h);
    onResize(w, h);
  };

  const selectedColor = colors.find((c) => c.id === selectedColorId);

  return (
    <aside className="w-[220px] flex-shrink-0 bg-studio-panel border-r border-studio-border flex flex-col overflow-y-auto">

      {/* ── Tools ─────────────────────────────── */}
      <Section title={t.tools}>
        <div className="grid grid-cols-2 gap-1.5">
          {['pencil', 'eraser', 'fill', 'eyedropper'].map((toolId) => (
            <ToolBtn
              key={toolId}
              active={tool === toolId}
              onClick={() => setTool(toolId)}
              title={t[toolId]}
              icon={TOOL_ICONS[toolId]}
              label={t[toolId]}
            />
          ))}
        </div>
        <div className="mt-2">
          <ToggleRow label={t.showGrid} value={showGrid} onChange={toggleGrid} />
        </div>
      </Section>

      {/* ── Grid type ─────────────────────────── */}
      <Section title={t.gridType}>
        <div className="flex flex-col gap-1">
          {GRID_TYPES.map((gt) => (
            <button
              key={gt}
              onClick={() => setGridType(gt)}
              className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                gridType === gt
                  ? 'bg-studio-accent text-white'
                  : 'text-studio-muted hover:bg-studio-border hover:text-studio-text'
              }`}
            >
              {t[gt]}
            </button>
          ))}
        </div>
      </Section>

      {/* ── Dimensions ────────────────────────── */}
      <Section title={t.dimensions}>
        <div className="flex flex-col gap-2">
          <DimInput label={t.width} value={wInput} onChange={setWInput} />
          <DimInput label={t.height} value={hInput} onChange={setHInput} />
          <button
            onClick={applySize}
            className="w-full py-1.5 bg-studio-accent hover:bg-studio-accent-hover text-white text-sm rounded font-medium transition-colors"
          >
            {t.apply}
          </button>
        </div>
      </Section>

      {/* ── Active color ──────────────────────── */}
      {selectedColor && (
        <div className="px-3 py-2 bg-studio-bg/50 border-y border-studio-border flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full border-2 border-studio-accent shadow-md flex-shrink-0"
            style={{ backgroundColor: selectedColor.hex }}
          />
          <div className="flex-1 overflow-hidden">
            <div className="text-xs font-semibold text-studio-text truncate">{selectedColor.name || t.noName}</div>
            <div className="text-[10px] text-studio-muted font-mono">{selectedColor.hex}</div>
          </div>
        </div>
      )}

      {/* ── Palette ───────────────────────────── */}
      <Section title={t.palette} className="flex-1">
        <div className="flex flex-wrap gap-2 mb-3">
          {colors.map((c) => (
            <div key={c.id} className="relative group">
              <button
                className={`w-8 h-8 rounded-full border-2 transition-all color-swatch ${
                  c.id === selectedColorId
                    ? 'border-white scale-110 shadow-lg'
                    : 'border-studio-border hover:border-studio-muted hover:scale-105'
                }`}
                style={{ backgroundColor: c.hex }}
                onClick={() => onSelectColor(c.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setColorMenu({ id: c.id, x: e.clientX, y: e.clientY });
                }}
                title={`${c.name || t.noName} (${c.hex})`}
              />
            </div>
          ))}
        </div>

        <button
          onClick={onAddColor}
          className="w-full py-1.5 border border-dashed border-studio-border text-studio-muted hover:text-studio-text hover:border-studio-muted text-sm rounded transition-colors flex items-center justify-center gap-1.5"
        >
          <span className="text-lg leading-none">+</span>
          {t.addColor}
        </button>
      </Section>

      {/* Color context menu */}
      {colorMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setColorMenu(null)} />
          <div
            className="fixed z-50 bg-studio-panel border border-studio-border rounded-lg shadow-2xl py-1 text-sm w-36"
            style={{ left: colorMenu.x, top: colorMenu.y }}
          >
            <CtxItem label={t.editName} onClick={() => { onEditColor(colorMenu.id); setColorMenu(null); }} />
            <CtxItem label={t.deleteColor} danger onClick={() => { onDeleteColor(colorMenu.id); setColorMenu(null); }} />
          </div>
        </>
      )}
    </aside>
  );
}

function Section({ title, children, className = '' }) {
  return (
    <div className={`px-3 py-3 border-b border-studio-border ${className}`}>
      <h3 className="text-[11px] font-semibold text-studio-muted uppercase tracking-wider mb-2">{title}</h3>
      {children}
    </div>
  );
}

function ToolBtn({ active, onClick, title, icon, label }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex flex-col items-center gap-1 py-2 px-1 rounded text-xs transition-colors ${
        active
          ? 'bg-studio-accent text-white'
          : 'text-studio-muted hover:bg-studio-border hover:text-studio-text'
      }`}
    >
      {icon}
      <span className="text-[10px]">{label}</span>
    </button>
  );
}

function ToggleRow({ label, value, onChange }) {
  return (
    <button
      onClick={onChange}
      className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-studio-border transition-colors"
    >
      <span className="text-sm text-studio-muted">{label}</span>
      <div
        className={`w-9 h-5 rounded-full transition-colors relative ${value ? 'bg-studio-accent' : 'bg-studio-border'}`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`}
        />
      </div>
    </button>
  );
}

function DimInput({ label, value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-studio-muted w-14 flex-shrink-0">{label}</label>
      <input
        type="number"
        min={2}
        max={200}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-studio-bg border border-studio-border rounded px-2 py-1 text-sm text-studio-text focus:outline-none focus:border-studio-accent w-full"
      />
    </div>
  );
}

function CtxItem({ label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 hover:bg-studio-border transition-colors ${
        danger ? 'text-red-400' : 'text-studio-text'
      }`}
    >
      {label}
    </button>
  );
}
