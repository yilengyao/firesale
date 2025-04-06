import { IpcMainEvent, 
  OpenDialogReturnValue, 
  SaveDialogReturnValue,
  app,
  BrowserWindow,
  dialog,
  Menu,
  MenuItemConstructorOptions,
  ipcMain,
  Event} from 'electron';

import createApplicationMenu from './application-menu.js';
import path from 'node:path';
import fs from 'fs';

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

const windows = new Set() as Set<BrowserWindow>;
const openFiles = new Map() as Map<BrowserWindow, string>;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = exports.createWindow = () => {
  let x, y;

  const currentWindow = BrowserWindow.getFocusedWindow() as BrowserWindow;

  let newWindow: BrowserWindow | null;

  if (currentWindow) {
    const [ currentX, currentY ] = currentWindow.getPosition();
    x = currentX + 20;
    y = currentY + 20;
    newWindow = new BrowserWindow({
      x,
      y,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        sandbox: false
      },
    });
  } else {
    newWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        sandbox: false
      },
    });
  }

  // and load the index.html of the app.
  newWindow?.loadFile(path.join(__dirname, 'index.html'));

  newWindow.once('ready-to-show', () => {
    newWindow?.show();
  });

  newWindow.on('focus', createApplicationMenu);

  newWindow.on('close', (event: Event) => {
    event.preventDefault();
    newWindow?.destroy();
  });

  newWindow.on('closed', () => {
    if (newWindow) {
        windows.delete(newWindow);
    };
    createApplicationMenu();
    newWindow = null;
  });

  // Open the DevTools.
  newWindow?.webContents.openDevTools();

  windows.add(newWindow);
  return newWindow;
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createApplicationMenu();
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
ipcMain.on('get-file-from-user', (event: IpcMainEvent) => {
  getFileFromUser(event);
});

const getFileFromUser = exports.getFileFromUser = (event: IpcMainEvent | BrowserWindow): void => {
  let targetWindow: BrowserWindow;
  
  if (event instanceof BrowserWindow) {
    targetWindow = event as BrowserWindow;
  } else {
    event = event as IpcMainEvent;
    targetWindow = BrowserWindow.fromWebContents(event.sender) as BrowserWindow;
  }

    dialog.showOpenDialog(targetWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'Markdown Files', extensions: ['md', 'markdown'] }
    ]
  }).then((result: OpenDialogReturnValue) => {
    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // If event is IpcMainEvent
      if ('sender' in event) {
        event.sender.send('file-opened', filePath, content);
      } else {
        // For keyboard Event
        targetWindow.webContents.send('file-opened', filePath, content);
      }
      createApplicationMenu();
    }
  }).catch((err: Error) => {
    console.log('Error opening file:', err);
  })
}

ipcMain.on('open-file', (event: IpcMainEvent, file: string) => {
  openFile(BrowserWindow.fromWebContents(event.sender) as BrowserWindow, file);
});

const openFile = (targetWindow: BrowserWindow, file: string): void => {
  const content: string = fs.readFileSync(file).toString();
  app.addRecentDocument(file);
  targetWindow.setRepresentedFilename(file);
  targetWindow.webContents.send('file-opened', file, content);
  createApplicationMenu();
}

ipcMain.on('save-markdown', (event: IpcMainEvent, file: string | null, content: string) => {
  if (!file) {
    // No file path yet - show save dialog
    dialog.showSaveDialog(BrowserWindow.fromWebContents(event.sender) as BrowserWindow, {
      title: "Save Markdown",
      defaultPath: app.getPath('documents'),
      filters: [
        { name: 'Markdown Files', extensions: ['md', 'markdown'] }
      ]
    }).then((result: SaveDialogReturnValue) => {
      if (result.canceled || !result.filePath) return;
      file = result.filePath;
      if (!file) return;

      fs.writeFileSync(file, content);
      openFile(BrowserWindow.fromWebContents(event.sender) as BrowserWindow, file);
      createApplicationMenu();
    }).catch((err: Error) => {
      console.log('Error saving file:', err);
    });
  } else {
    // Already have a file path - save directly
    fs.writeFileSync(file, content);
    // No need to re-open the file since we're just saving
  }
});

ipcMain.on('save-html', (event: IpcMainEvent, content: string) => {
  dialog.showSaveDialog(BrowserWindow.fromWebContents(event.sender) as BrowserWindow, {
    title: "Save HTML",
    defaultPath: app.getPath('documents'),
    filters: [
      { name: 'HTML Files', extensions: ['html'] }
    ]
  }).then((result: SaveDialogReturnValue) => {
    if (result.canceled || !result.filePath) return;
    const file = result.filePath;
    fs.writeFileSync(file, content);
  }).catch((err: Error) => {
    console.log('Error saving file:', err);
  });
});

ipcMain.on('create-window', () => {
  createWindow();
});

ipcMain.on('update-title', (event: IpcMainEvent, title: string) => {
  const window = BrowserWindow.fromWebContents(event.sender) as BrowserWindow;
  if (window) {
    window.setTitle(title);
  }
});

ipcMain.on('update-document', (event: IpcMainEvent, isEdited: boolean) => {
  const window = BrowserWindow.fromWebContents(event.sender) as BrowserWindow;
  if (window) {
    window.setDocumentEdited(isEdited);
  }
});

ipcMain.on('show-dialog-message', 
  (event: IpcMainEvent, type: string, title: string, message: string, buttons: [string], defaultId: number, cancelId: number) => {
  const targetWindow = BrowserWindow.fromWebContents(event.sender) as BrowserWindow;
  const result = dialog.showMessageBox(targetWindow, {
    type: 'question',
    title: title,
    message: message,
    buttons: buttons,
    defaultId: defaultId,
    cancelId: cancelId
  }).then((result: { response: number }) => {
    return result.response === 0;
  }).catch((err: Error) => {
    console.error('Error showing dialog:', err);
  });
});

const markdownContextMenu = (targetWindow: BrowserWindow): MenuItemConstructorOptions[] => [
  {
    label: 'Open File',
    click() {
      getFileFromUser(targetWindow);
    }
  },
  {
    type: 'separator'
  },
  {
    label: 'Cut',
    click() {
      targetWindow.webContents.cut();
      targetWindow.webContents.send('render-markdown-html');
    }
  },
  {
    label: 'Copy',
    role: 'copy'
  },
  {
    label:'Paste',
    async click() {
      try {
        await targetWindow.webContents.paste();
        targetWindow.webContents.send('render-markdown-html');
      } catch (error) {
        console.error('Error pasting:', error);
      }
    }
  },
  {
    label: 'Select All',
    role: 'selectAll'
  }
];

ipcMain.on('show-context-menu', (event: IpcMainEvent) => {
  const targetWindow = BrowserWindow.fromWebContents(event.sender) as BrowserWindow;
  const menu = Menu.buildFromTemplate(markdownContextMenu(targetWindow));
  menu.popup({
    window: targetWindow
  });
});

const stopWatchingFile = (targetWindow: BrowserWindow): void => {
  if (openFiles.has(targetWindow)) {
    fs.unwatchFile(openFiles.get(targetWindow) as string);
    openFiles.delete(targetWindow);
  }
}

// Export state and funcitons to other modeules
export {
  windows,
  openFiles,
  createWindow,
  getFileFromUser,
  openFile,
  stopWatchingFile
}