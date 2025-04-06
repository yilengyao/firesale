// electron.d.ts
export interface ElectronAPI {
    send: (channel: string, ...args: any[]) => void;
    showItemInFolder: (filePath: string) => void;
    openPath: (filePath: string) => Promise<string>;
    beep: () => void;
    basename: (filePath: string) => string;
    markdownToHtml: (markdown: string) => string;
    on: (channel: string, callback: (...args: any[]) => void) => void;
  }
  
  declare global {
    interface Window {
      electronAPI: ElectronAPI;
    }
  }