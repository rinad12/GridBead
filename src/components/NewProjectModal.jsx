import { useState } from 'react';

const GRID_TYPES = ['square', 'brick', 'peyote'];

export default function NewProjectModal({ onConfirm, onCancel, t, showWarning = true }) {
  const [name, setName] = useState('New Design');
  const [width, setWidth] = useState(20);
  const [height, setHeight] = useState(20);
  const [gridType, setGridType] = useState('square');

  const handleConfirm = () => {
    onConfirm({
      projectName: name.trim() || 'New Design',
      width: Math.max(2, Math.min(200, parseInt(width) || 20)),
      height: Math.max(2, Math.min(200, parseInt(height) || 20)),
      gridType,
      cells: {},
    });
  };

  return (
    <Overlay>
      <div className="bg-studio-panel border border-studio-border rounded-xl shadow-2xl w-[380px] p-6 text-studio-text">
        <h2 className="text-lg font-bold mb-4">{t.newProjectTitle}</h2>

        <div className="flex flex-col gap-3">
          <Field label={t.newProjectName}>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-base"
              placeholder="My Beadwork"
            />
          </Field>

          <div className="flex gap-3">
            <Field label={t.newProjectWidth} className="flex-1">
              <input
                type="number" min={2} max={200}
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="input-base"
              />
            </Field>
            <Field label={t.newProjectHeight} className="flex-1">
              <input
                type="number" min={2} max={200}
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="input-base"
              />
            </Field>
          </div>

          <Field label={t.newProjectGrid}>
            <div className="flex flex-col gap-1">
              {GRID_TYPES.map((gt) => (
                <label key={gt} className="flex items-center gap-2 cursor-pointer group">
                  <span
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      gridType === gt ? 'border-studio-accent bg-studio-accent' : 'border-studio-border group-hover:border-studio-muted'
                    }`}
                  >
                    {gridType === gt && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                  <input type="radio" className="sr-only" checked={gridType === gt} onChange={() => setGridType(gt)} />
                  <span className="text-sm">{t[gt]}</span>
                </label>
              ))}
            </div>
          </Field>
        </div>

        {showWarning && (
          <p className="mt-4 text-xs text-yellow-500/80 bg-yellow-500/10 border border-yellow-500/20 rounded px-3 py-2">
            ⚠ {t.newProjectWarning}
          </p>
        )}

        <div className="flex gap-3 mt-5 justify-end">
          <button onClick={onCancel} className="btn-ghost">{t.newProjectCancel}</button>
          <button onClick={handleConfirm} className="btn-primary">{t.newProjectConfirm}</button>
        </div>
      </div>
    </Overlay>
  );
}

function Overlay({ children }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      {children}
    </div>
  );
}

function Field({ label, children, className = '' }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs text-studio-muted font-medium">{label}</label>
      {children}
    </div>
  );
}
