import { app, BrowserWindow, ipcMain, dialog, Menu, globalShortcut } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { autoUpdater } from 'electron-updater';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const isDev      = process.env.NODE_ENV === 'development';

let mainWindow     = null;
let pendingFilePath = null;

// ── Windows: file path is passed as a CLI argument ────────────
// argv[0] = electron binary, argv[1] = app path (packaged) or main.js (dev)
const cliFile = process.argv.find(
  (arg, i) => i > 1 && arg.endsWith('.beadgrid') && !arg.startsWith('-')
);
if (cliFile) pendingFilePath = cliFile;

// ── macOS: file association fires 'open-file' before 'ready' ──
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (mainWindow?.webContents) {
    mainWindow.webContents.send('app:open-file', filePath);
  } else {
    pendingFilePath = filePath;
  }
});

// ─────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width:     1280,
    height:    800,
    minWidth:  800,
    minHeight: 600,
    title:     'GridBead Studio',
    icon:      path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload:          path.join(__dirname, 'src', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration:  false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  // Once the renderer has loaded, forward any pending file path
  mainWindow.webContents.once('did-finish-load', () => {
    if (pendingFilePath) {
      mainWindow.webContents.send('app:open-file', pendingFilePath);
      pendingFilePath = null;
    }
  });

  // Intercept the OS close button — let the renderer decide whether to confirm
  mainWindow.on('close', (e) => {
    e.preventDefault();
    mainWindow.webContents.send('app:request-close');
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── Auto-updater ──────────────────────────────────────────────
function setupAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', () => {
    mainWindow?.webContents.send('app:update-available');
  });

  autoUpdater.on('update-downloaded', async () => {
    const { response } = await dialog.showMessageBox(mainWindow, {
      type:    'info',
      title:   'Update Ready',
      message: 'A new version of GridBead Studio has been downloaded.',
      detail:  'Restart now to apply the update?',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId:  1,
    });
    if (response === 0) autoUpdater.quitAndInstall();
  });

  autoUpdater.on('error', (err) => {
    // Silently ignore network/no-internet errors; log others in dev
    if (isDev) console.error('Auto-updater error:', err.message);
  });

  // Check after a short delay so the window is fully loaded
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  }, 3000);
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  if (!isDev) setupAutoUpdater();

  // ── Global shortcuts (work even after native menu is removed) ──
  // DevTools
  globalShortcut.register('F12', () => mainWindow?.webContents.toggleDevTools());
  globalShortcut.register('CommandOrControl+Shift+I', () => mainWindow?.webContents.toggleDevTools());

  // File operations — sent to renderer via IPC so React handles them
  globalShortcut.register('CommandOrControl+S',       () => mainWindow?.webContents.send('app:shortcut-save'));
  globalShortcut.register('CommandOrControl+Shift+S', () => mainWindow?.webContents.send('app:shortcut-save-as'));
  globalShortcut.register('CommandOrControl+O',       () => mainWindow?.webContents.send('app:shortcut-open'));
  globalShortcut.register('CommandOrControl+N',       () => mainWindow?.webContents.send('app:shortcut-new'));

  // Edit operations
  globalShortcut.register('CommandOrControl+Z',       () => mainWindow?.webContents.send('app:shortcut-undo'));
  globalShortcut.register('CommandOrControl+Shift+Z', () => mainWindow?.webContents.send('app:shortcut-redo'));
  globalShortcut.register('CommandOrControl+Y',       () => mainWindow?.webContents.send('app:shortcut-redo'));

  // Zoom
  globalShortcut.register('CommandOrControl+Equal',   () => mainWindow?.webContents.send('app:shortcut-zoom-in'));
  globalShortcut.register('CommandOrControl+Minus',   () => mainWindow?.webContents.send('app:shortcut-zoom-out'));
  globalShortcut.register('CommandOrControl+0',       () => mainWindow?.webContents.send('app:shortcut-zoom-reset'));

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => globalShortcut.unregisterAll());

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC: Save dialog ──────────────────────────────────────────
ipcMain.handle('dialog:save', async (_e, suggestedName) => {
  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
    title:       'Save Beadwork Pattern',
    defaultPath: suggestedName,
    filters:     [{ name: 'GridBead Patterns', extensions: ['beadgrid'] }],
  });
  return canceled ? null : (filePath ?? null);
});

// ── IPC: Open dialog ──────────────────────────────────────────
ipcMain.handle('dialog:open', async () => {
  const { filePaths, canceled } = await dialog.showOpenDialog(mainWindow, {
    title:      'Open Beadwork Pattern',
    filters:    [{ name: 'GridBead Patterns', extensions: ['beadgrid'] }],
    properties: ['openFile'],
  });
  return canceled || !filePaths.length ? null : filePaths[0];
});

// ── IPC: Confirm close (sent by renderer after user approved) ─
ipcMain.handle('app:confirm-close', () => {
  mainWindow?.destroy();
});

// ── IPC: Write file ───────────────────────────────────────────
ipcMain.handle('fs:write', async (_e, filePath, content) => {
  await fs.writeFile(filePath, content, 'utf-8');
});

// ── IPC: Read file ────────────────────────────────────────────
ipcMain.handle('fs:read', async (_e, filePath) => {
  return fs.readFile(filePath, 'utf-8');
});

// ── IPC: Check for updates manually ──────────────────────────
ipcMain.handle('app:check-for-updates', async () => {
  try {
    await autoUpdater.checkForUpdates();
  } catch {
    // No internet or no published release — ignore
  }
});
