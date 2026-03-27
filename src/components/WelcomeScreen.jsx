import { useState } from 'react';
import { loadRecentFiles, removeRecentFile } from '../utils/fileUtils.js';

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return '';
  }
}

export default function WelcomeScreen({ onNew, onOpen, onOpenRecent, t, language, isDark, onToggleTheme, setLanguage }) {
  const [recentFiles, setRecentFiles] = useState(() => loadRecentFiles());

  const handleRemoveRecent = (e, filePath) => {
    e.stopPropagation();
    removeRecentFile(filePath);
    setRecentFiles((prev) => prev.filter((f) => f.filePath !== filePath));
  };

  return (
    <div className="flex flex-col h-full bg-studio-bg text-studio-text">

      {/* Minimal header — theme toggle only */}
      <header className="flex items-center h-11 px-4 flex-shrink-0 justify-end border-b border-studio-border">
        <ThemeBtn isDark={isDark} onToggle={onToggleTheme} />
      </header>

      {/* Centered content */}
      <div className="flex-1 flex items-center justify-center overflow-y-auto py-12">
        <div className="w-full max-w-sm px-6 flex flex-col items-center gap-8">

          {/* Brand */}
          <div className="flex flex-col items-center gap-4 text-center">
            <img
              src="./icon.png"
              alt="GridBead"
              className="w-20 h-20 rounded-2xl shadow-lg"
            />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{t.appName} Studio</h1>
              <p className="text-studio-muted mt-1.5 text-sm">{t.appTagline}</p>
            </div>
          </div>

          {/* Primary actions */}
          <div className="flex flex-col gap-2.5 w-full">
            <button
              onClick={onNew}
              className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
            >
              <IconPlus />
              {t.newProject}
            </button>
            <button
              onClick={onOpen}
              className="btn-ghost w-full py-3 text-sm flex items-center justify-center gap-2"
            >
              <IconFolder />
              {t.openPattern}
            </button>
          </div>

          {/* Language selector — centered so users notice it */}
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-[11px] text-studio-muted uppercase tracking-wider">{t.language}</span>
            <div className="flex items-center gap-1 bg-studio-panel rounded-full p-0.5 border border-studio-border">
              <LangBtn active={language === 'en'} onClick={() => setLanguage('en')}>EN — English</LangBtn>
              <LangBtn active={language === 'ru'} onClick={() => setLanguage('ru')}>RU — Русский</LangBtn>
            </div>
          </div>

          {/* Recent files */}
          {recentFiles.length > 0 && (
            <div className="w-full">
              <p className="text-[11px] font-semibold text-studio-muted uppercase tracking-wider mb-2">
                {t.recentFiles}
              </p>
              <div className="flex flex-col gap-1">
                {recentFiles.map((f, i) => (
                  <div key={i} className="relative group/row">
                    <button
                      onClick={() => (onOpenRecent ?? onOpen)(f.filePath)}
                      className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl bg-studio-panel border border-studio-border hover:border-studio-muted transition-colors group"
                    >
                      <IconFile className="text-studio-accent flex-shrink-0" />
                      <div className="flex-1 min-w-0 pr-5">
                        <div className="text-sm text-studio-text truncate group-hover:text-studio-accent transition-colors">
                          {f.name}
                        </div>
                        <div className="text-[11px] text-studio-muted">{formatDate(f.savedAt)}</div>
                      </div>
                    </button>
                    <button
                      onClick={(e) => handleRemoveRecent(e, f.filePath)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded text-studio-muted hover:text-studio-text opacity-0 group-hover/row:opacity-100 transition-opacity"
                      title="Remove from list"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Internal sub-components ───────────────────────────────────

function ThemeBtn({ isDark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      title={isDark ? 'Light mode' : 'Dark mode'}
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
  );
}

function LangBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
        active ? 'bg-studio-accent text-white' : 'text-studio-muted hover:text-studio-text'
      }`}
    >
      {children}
    </button>
  );
}

function IconPlus() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
    </svg>
  );
}

function IconFolder() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"/>
    </svg>
  );
}

function IconFile({ className = '' }) {
  return (
    <svg className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
    </svg>
  );
}
