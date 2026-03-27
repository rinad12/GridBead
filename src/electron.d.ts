interface ElectronAPI {
  onOpenFile(callback: (filePath: string) => void): () => void;
  onRequestClose(callback: () => void): () => void;
  confirmClose(): Promise<void>;
  showSaveDialog(suggestedName: string): Promise<string | null>;
  showOpenDialog(): Promise<string | null>;
  writeFile(filePath: string, content: string): Promise<void>;
  readFile(filePath: string): Promise<string>;
  checkForUpdates(): Promise<void>;
  onUpdateAvailable(callback: () => void): () => void;
}

interface Window {
  electronAPI?: ElectronAPI;
}
