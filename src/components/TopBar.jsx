import { useState } from 'react';

const BtnIcon = ({ onClick, title, children, className = '' }) => (
  <button
    onClick={onClick}
    title={title}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium text-studio-text hover:bg-studio-border transition-colors ${className}`}
  >
    {children}
  </button>
);

export default function TopBar({
  projectName, language, setLanguage,
  onNew, onOpen, onSave, onSaveAs, onExport, onAbout,
  onGoHome,
  isDark, onToggleTheme,
  isDirty,
  t,
}) {
  const [fileOpen, setFileOpen] = useState(false);

  return (
    <header className="flex items-center h-11 bg-studio-panel border-b border-studio-border px-4 gap-2 flex-shrink-0 z-10">

      {/* Home button */}
      <button
        onClick={onGoHome}
        title={t.backToHome}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-studio-border transition-colors text-studio-muted hover:text-studio-text flex-shrink-0"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7m-9 2v8m-4 0h12"/>
        </svg>
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-studio-border flex-shrink-0" />

      {/* Logo */}
      <div className="flex items-center gap-2 mr-2">
        <img src="/icon.png" alt="GridBead" width="22" height="22" className="rounded-md" />
        <span className="font-bold text-studio-text text-base tracking-tight hidden md:block">{t.appName}</span>
      </div>

      {/* Dirty indicator */}
      {isDirty && (
        <span
          className="w-2 h-2 rounded-full bg-studio-accent flex-shrink-0"
          title="Unsaved changes"
        />
      )}

      <div className="flex-1" />

      {/* Theme toggle */}
      <button
        onClick={onToggleTheme}
        title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
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

      {/* Language toggle */}
      <div className="flex items-center gap-1 bg-studio-bg rounded-full p-0.5 border border-studio-border">
        <LangBtn active={language === 'en'} onClick={() => setLanguage('en')}>EN</LangBtn>
        <LangBtn active={language === 'ru'} onClick={() => setLanguage('ru')}>RU</LangBtn>
      </div>

      {/* File menu — rightmost */}
      <div className="relative">
        <BtnIcon onClick={() => setFileOpen((o) => !o)} title={t.file}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
          </svg>
          {t.file}
        </BtnIcon>

        {fileOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setFileOpen(false)} />
            <div className="absolute right-0 top-full mt-1 w-48 bg-studio-panel border border-studio-border rounded-lg shadow-2xl z-50 py-1 text-sm">
              <DropItem icon="✦"  label={t.newProject} onClick={() => { onNew();    setFileOpen(false); }} />
              <DropItem icon="📂" label={t.open}       onClick={() => { onOpen();   setFileOpen(false); }} />
              <div className="my-1 border-t border-studio-border" />
              <DropItem icon="💾" label={t.save}       onClick={() => { onSave();   setFileOpen(false); }} />
              <DropItem icon="💾" label={t.saveAs}     onClick={() => { onSaveAs(); setFileOpen(false); }} />
              <div className="my-1 border-t border-studio-border" />
              <DropItem icon="🖼" label={t.exportPng}  onClick={() => { onExport(); setFileOpen(false); }} />
              <div className="my-1 border-t border-studio-border" />
              <DropItem icon="ℹ" label={t.about}      onClick={() => { onAbout();  setFileOpen(false); }} />
            </div>
          </>
        )}
      </div>
    </header>
  );
}

function DropItem({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 text-studio-text hover:bg-studio-border flex items-center gap-2 transition-colors"
    >
      <span className="text-base w-5 text-center">{icon}</span>
      {label}
    </button>
  );
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
