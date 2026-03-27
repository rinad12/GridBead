import { useState, useEffect } from 'react';

export default function ColorEditModal({ initial, onConfirm, onCancel, t }) {
  const isEdit = !!initial;
  const [hex, setHex] = useState(initial?.hex ?? '#6c63ff');
  const [name, setName] = useState(initial?.name ?? '');
  const [hexInput, setHexInput] = useState(initial?.hex ?? '#6c63ff');

  const hexValid = /^#[0-9a-fA-F]{6}$/.test(hexInput);

  const handleHexInput = (val) => {
    setHexInput(val);
    if (/^#[0-9a-fA-F]{6}$/.test(val)) setHex(val);
  };

  const handleConfirm = () => {
    if (!hexValid) return;
    onConfirm({ hex: hex.toUpperCase(), name: name.trim() });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-studio-panel border border-studio-border rounded-xl shadow-2xl w-[340px] p-6 text-studio-text">
        <h2 className="text-lg font-bold mb-4">
          {isEdit ? t.colorModalEditTitle : t.colorModalAddTitle}
        </h2>

        <div className="flex flex-col gap-4">
          {/* Color picker + hex preview */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div
                className="w-16 h-16 rounded-full border-4 border-studio-border shadow-lg cursor-pointer overflow-hidden"
                style={{ backgroundColor: hex }}
              >
                <input
                  type="color"
                  value={hex}
                  onChange={(e) => { setHex(e.target.value); setHexInput(e.target.value); }}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                  title="Pick color"
                />
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <label className="text-xs text-studio-muted">{t.colorModalHex}</label>
              <input
                value={hexInput}
                onChange={(e) => handleHexInput(e.target.value)}
                className={`input-base font-mono uppercase ${!hexValid ? 'border-red-500' : ''}`}
                placeholder="#RRGGBB"
                maxLength={7}
              />
            </div>
          </div>

          {/* Color name */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-studio-muted">{t.colorModalName}</label>
            <input
              autoFocus={!isEdit}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-base"
              placeholder={t.noName}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-5 justify-end">
          <button onClick={onCancel} className="btn-ghost">{t.colorModalCancel}</button>
          <button onClick={handleConfirm} disabled={!hexValid} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
            {t.colorModalConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}
