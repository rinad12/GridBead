export default function AboutModal({ onClose, t }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-studio-panel border border-studio-border rounded-xl shadow-2xl w-[380px] p-6 text-studio-text">
        <div className="flex items-center gap-3 mb-4">
          <img src="/icon.png" alt="GridBead" width="40" height="40" className="rounded-xl" />
          <div>
            <h2 className="text-xl font-bold">{t.aboutTitle}</h2>
            <p className="text-xs text-studio-muted">{t.aboutVersion}</p>
          </div>
        </div>

        <p className="text-sm text-studio-muted leading-relaxed mb-4">{t.aboutDesc}</p>

        <div className="border-t border-studio-border pt-4 text-xs text-studio-muted space-y-1">
          <p>✦ HTML5 Canvas Engine</p>
          <p>✦ Square, Brick & Peyote stitch grids</p>
          <p>✦ Real-time bead counter</p>
          <p>✦ Save/Load .bead files · Export PNG</p>
          <p>✦ English & Russian interface</p>
        </div>

        <div className="flex justify-end mt-5">
          <button onClick={onClose} className="btn-primary">{t.aboutClose}</button>
        </div>
      </div>
    </div>
  );
}
