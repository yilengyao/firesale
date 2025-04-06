// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
// preload.ts
// Preload script for secure IPC communication
// preload.ts
import { contextBridge, ipcRenderer, shell } from 'electron';
import * as path from 'path';
import { marked } from 'marked';

// Expose safe APIs to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // IPC functions
  send: (channel: string, ...args: any[]) => {
    const validSendChannels = [
      'create-window', 'get-file-from-user', 'save-markdown', 
      'save-html', 'show-context-menu', 'update-title', 'update-document',
      'show-dialog-message'
    ];
    if (validSendChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    }
  },
  
  // File operations
  showItemInFolder: (filePath: string) => shell.showItemInFolder(filePath),
  openPath: (filePath: string) => shell.openPath(filePath),
  beep: () => shell.beep(),
  
  // Path utilities
  basename: (filePath: string) => path.basename(filePath),
  
  // Markdown rendering
  markdownToHtml: (markdown: string) => marked(markdown, { async: false }),
  
  // IPC listeners
  on: (channel: string, callback: (...args: any[]) => void) => {
    const validReceiveChannels = [
      'file-opened', 'file-changed', 'render-markdown-html',
      'save-markdown', 'save-html'
    ];
    if (validReceiveChannels.includes(channel)) {
      // Remove existing listeners to avoid duplicates
      ipcRenderer.removeAllListeners(channel);
      // Add the new listener
      ipcRenderer.on(channel, (_, ...args) => callback(...args));
    }
  }
});