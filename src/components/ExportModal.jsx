import { useState } from 'react';

export default function ExportModal({ onConfirm, onCancel, t }) {
  const [bg, setBg] = useState('white');
  const [scale, setScale] = useState(40);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-studio-panel border border-studio-border rounded-xl shadow-2xl w-[320px] p-6 text-studio-text">
        <h2 className="text-lg font-bold mb-4">{t.exportModalTitle}</h2>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-studio-muted mb-2 block">{t.exportBg}</label>
            <div className="flex gap-2">
              {['transparent', 'white', 'black'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setBg(opt)}
                  className={`flex-1 py-2 rounded text-sm border transition-colors ${
                    bg === opt
                      ? 'border-studio-accent bg-studio-accent/20 text-studio-text'
                      : 'border-studio-border text-studio-muted hover:border-studio-muted'
                  }`}
                >
                  {t[`exportBg${opt.charAt(0).toUpperCase() + opt.slice(1)}`]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-studio-muted mb-2 block">
              {t.exportScale}: <span className="text-studio-text font-mono">{scale}px</span>
            </label>
            <input
              type="range" min={10} max={80} step={10}
              value={scale}
              onChange={(e) => setScale(parseInt(e.target.value))}
              className="w-full accent-studio-accent"
            />
            <div className="flex justify-between text-[10px] text-studio-muted mt-0.5">
              <span>10px</span><span>40px</span><span>80px</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-5 justify-end">
          <button onClick={onCancel} className="btn-ghost">{t.exportCancel}</button>
          <button onClick={() => onConfirm(bg, scale)} className="btn-primary">{t.exportConfirm}</button>
        </div>
      </div>
    </div>
  );
}
