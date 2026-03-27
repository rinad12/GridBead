'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Register a callback that fires when the main process sends a file path
   * (OS file association double-click). Returns a cleanup function.
   * @param {(filePath: string) => void} callback
   * @returns {() => void}
   */
  onOpenFile(callback) {
    const handler = (_event, filePath) => callback(filePath);
    ipcRenderer.on('app:open-file', handler);
    return () => ipcRenderer.removeListener('app:open-file', handler);
  },

  /**
   * Show native Save dialog filtered to .beadgrid.
   * @param {string} suggestedName  e.g. "my_design.beadgrid"
   * @returns {Promise<string|null>}  Chosen path, or null if cancelled.
   */
  showSaveDialog(suggestedName) {
    return ipcRenderer.invoke('dialog:save', suggestedName);
  },

  /**
   * Show native Open dialog filtered to .beadgrid.
   * @returns {Promise<string|null>}  Chosen path, or null if cancelled.
   */
  showOpenDialog() {
    return ipcRenderer.invoke('dialog:open');
  },

  /**
   * Write UTF-8 text to an absolute file path.
   * @param {string} filePath
   * @param {string} content
   * @returns {Promise<void>}
   */
  writeFile(filePath, content) {
    return ipcRenderer.invoke('fs:write', filePath, content);
  },

  /**
   * Read an absolute file path as a UTF-8 string.
   * @param {string} filePath
   * @returns {Promise<string>}
   */
  readFile(filePath) {
    return ipcRenderer.invoke('fs:read', filePath);
  },

  /**
   * Register a callback that fires when the OS close button is clicked.
   * The renderer must call confirmClose() to actually close the window.
   * Returns a cleanup function.
   * @param {() => void} callback
   * @returns {() => void}
   */
  onRequestClose(callback) {
    const handler = () => callback();
    ipcRenderer.on('app:request-close', handler);
    return () => ipcRenderer.removeListener('app:request-close', handler);
  },

  /**
   * Tell the main process it is safe to destroy the window now.
   * Call this after the user has confirmed (or there is nothing to save).
   */
  confirmClose() {
    return ipcRenderer.invoke('app:confirm-close');
  },

  /** Manually trigger an update check */
  checkForUpdates() {
    return ipcRenderer.invoke('app:check-for-updates');
  },

  /** Fires when an update is available (download started automatically) */
  onUpdateAvailable(callback) {
    const handler = () => callback();
    ipcRenderer.on('app:update-available', handler);
    return () => ipcRenderer.removeListener('app:update-available', handler);
  },

  /** OS-level keyboard shortcuts forwarded from main process */
  onShortcut(name, callback) {
    const channel = `app:shortcut-${name}`;
    const handler = () => callback();
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
});
