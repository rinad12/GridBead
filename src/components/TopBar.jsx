import { useState, useRef, useEffect } from 'react';

export default function TopBar({
  language, setLanguage,
  onNew, onOpen, onSave, onSaveAs, onExport,
  onClearCanvas,
  onAbout,
  onGoHome,
  isDark, onToggleTheme,
  isDirty,
  showGrid, onToggleGrid,
  showSidebar, onToggleSidebar,
  canUndo, canRedo, onUndo, onRedo,
  onZoomIn, onZoomOut, onZoomReset,
  t,
}) {
  return (
    <header className="flex items-center h-11 bg-studio-panel border-b border-studio-border px-3 gap-1 flex-shrink-0 z-10 select-none">

      {/* Home */}
      <button
        onClick={onGoHome}
        title={t.backToHome}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-studio-border transition-colors text-studio-muted hover:text-studio-text flex-shrink-0"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7m-9 2v8m-4 0h12"/>
        </svg>
      </button>

      <div className="w-px h-5 bg-studio-border flex-shrink-0 mx-1" />

      {/* Logo */}
      <div className="flex items-center gap-2 mr-3">
        <img src="/icon.png" alt="GridBead" width="22" height="22" className="rounded-md" />
        <span className="font-bold text-studio-text text-base tracking-tight hidden md:block">{t.appName}</span>
      </div>

      {/* ── File menu ── */}
      <Menu label={t.file}>
        <DropItem label={t.newProject} icon="✦"  kbd="Ctrl+N"       onClick={onNew} />
        <DropItem label={t.open}       icon="📂" kbd="Ctrl+O"       onClick={onOpen} />
        <Divider />
        <DropItem label={t.save}       icon="💾" kbd="Ctrl+S"       onClick={onSave} />
        <DropItem label={t.saveAs}     icon="💾" kbd="Ctrl+Shift+S" onClick={onSaveAs} />
        <Divider />
        <DropItem label={t.exportPng}  icon="🖼" onClick={onExport} />
      </Menu>

      {/* ── Edit menu ── */}
      <Menu label={t.edit}>
        <DropItem label={t.undo}        icon="↩" kbd="Ctrl+Z" onClick={onUndo} disabled={!canUndo} />
        <DropItem label={t.redo}        icon="↪" kbd="Ctrl+Y" onClick={onRedo} disabled={!canRedo} />
        <Divider />
        <DropItem label={t.clearCanvas} icon="🗑" onClick={onClearCanvas} danger />
      </Menu>

      {/* ── View menu ── */}
      <Menu label={t.view}>
        <DropItem label={t.zoomIn}    icon="🔍" kbd="Ctrl++"  onClick={onZoomIn} />
        <DropItem label={t.zoomOut}   icon="🔍" kbd="Ctrl+−"  onClick={onZoomOut} />
        <DropItem label={t.zoomReset} icon="⊡"  kbd="Ctrl+0"  onClick={onZoomReset} />
        <Divider />
        <DropCheck label={t.showGrid}    checked={showGrid}    onClick={onToggleGrid} />
        <DropCheck label={t.showSidebar} checked={showSidebar} onClick={onToggleSidebar} />
        <Divider />
        <DropItem
          label={isDark ? t.lightMode : t.darkMode}
          icon={isDark ? '☀' : '☾'}
          onClick={onToggleTheme}
        />
      </Menu>

      {/* ── Help menu ── */}
      <Menu label={t.help}>
        <DropItem label={t.aboutGridBead} icon="ℹ" onClick={onAbout} />
      </Menu>

      <div className="flex-1" />

      {/* Dirty dot */}
      {isDirty && (
        <span className="w-2 h-2 rounded-full bg-studio-accent flex-shrink-0" title="Unsaved changes" />
      )}

      {/* Language */}
      <div className="flex items-center gap-1 bg-studio-bg rounded-full p-0.5 border border-studio-border">
        <LangBtn active={language === 'en'} onClick={() => setLanguage('en')}>EN</LangBtn>
        <LangBtn active={language === 'ru'} onClick={() => setLanguage('ru')}>RU</LangBtn>
      </div>

      {/* Theme icon */}
      <button
        onClick={onToggleTheme}
        title={isDark ? t.lightMode : t.darkMode}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-studio-border transition-colors text-studio-muted hover:text-studio-text"
      >
        {isDark ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="5"/>
            <path strokeLinecap="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
          </svg>
        )}
      </button>
    </header>
  );
}

// ── Menu component ────────────────────────────────────────────

function Menu({ label, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`px-2.5 py-1 rounded text-sm font-medium transition-colors ${
          open
            ? 'bg-studio-border text-studio-text'
            : 'text-studio-muted hover:bg-studio-border hover:text-studio-text'
        }`}
      >
        {label}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 min-w-[190px] bg-studio-panel border border-studio-border rounded-lg shadow-2xl z-50 py-1 text-sm anim-fade-up">
          {injectClose(children, close)}
        </div>
      )}
    </div>
  );
}

function injectClose(children, close) {
  const arr = Array.isArray(children) ? children : [children];
  return arr.map((child, i) =>
    child ? { ...child, key: i, props: { ...child.props, _close: close } } : child
  );
}

// ── Drop items ────────────────────────────────────────────────

function DropItem({ label, icon, onClick, danger, disabled, kbd, _close }) {
  return (
    <button
      onClick={() => { if (!disabled) { onClick?.(); _close?.(); } }}
      className={`w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors ${
        disabled
          ? 'opacity-35 cursor-default'
          : danger
            ? 'text-red-400 hover:bg-studio-border'
            : 'text-studio-text hover:bg-studio-border'
      }`}
    >
      <span className="w-5 text-center text-base leading-none">{icon}</span>
      <span className="flex-1">{label}</span>
      {kbd && <span className="text-[10px] text-studio-muted font-mono">{kbd}</span>}
    </button>
  );
}

function DropCheck({ label, checked, onClick, kbd, _close }) {
  return (
    <button
      onClick={() => { onClick?.(); _close?.(); }}
      className="w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors hover:bg-studio-border text-studio-text"
    >
      <span className="w-5 flex items-center justify-center">
        {checked ? (
          <svg className="w-4 h-4 text-studio-accent" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
        ) : (
          <span className="inline-block w-4 h-4" />
        )}
      </span>
      <span className="flex-1">{label}</span>
      {kbd && <span className="text-[10px] text-studio-muted font-mono">{kbd}</span>}
    </button>
  );
}

function Divider() {
  return <div className="my-1 border-t border-studio-border" />;
}

function LangBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${
        active ? 'bg-studio-accent text-white' : 'text-studio-muted hover:text-studio-text'
      }`}
    >
      {children}
    </button>
  );
}
