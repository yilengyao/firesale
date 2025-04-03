import { IpcMainEvent, OpenDialogReturnValue, SaveDialogReturnValue } from 'electron';

const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('fs');

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

const windows = new Set() as Set<typeof BrowserWindow>;
const openFiles = new Map() as Map<typeof BrowserWindow, string>;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = exports.createWindow = () => {
  let x, y;

  const currentWindow = BrowserWindow.getFocusedWindow() as typeof BrowserWindow;

  let newWindow: typeof BrowserWindow | null;

  if (currentWindow) {
    const [ currentX, currentY ] = currentWindow.getPosition();
    x = currentX + 20;
    y = currentY + 20;
    newWindow = new BrowserWindow({
      x,
      y,
      show: false,
      webPreferences: {
        nodeIntegration: true,       // Enable this
        contextIsolation: false,     // Disable this
        preload: path.join(__dirname, 'preload.js'),
      },
    });
  } else {
    newWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: true,       // Enable this
        contextIsolation: false,     // Disable this
        preload: path.join(__dirname, 'preload.js'),
      },
    });
  }

  // and load the index.html of the app.
  newWindow?.loadFile(path.join(__dirname, 'index.html'));

  newWindow.once('ready-to-show', () => {
    newWindow.show();
  });

  newWindow.on('close', (event: Event) => {
    event.preventDefault();
    // console.log('Window closing');
    console.log("isDocumentEdited", newWindow?.isDocumentEdited());
    newWindow?.destroy();
  });

  newWindow.on('closed', () => {
    windows.delete(newWindow);
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
  const targetWindow = BrowserWindow.fromWebContents(event.sender) as typeof BrowserWindow;
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
      event.sender.send('file-opened', filePath, content);
    }
  }).catch((err: Error) => {
    console.log('Error opening file:', err);
  })
});

ipcMain.on('open-file', (event: IpcMainEvent, file: string) => {
  openFile(BrowserWindow.fromWebContents(event.sender), file);
});

const openFile = (targetWindow: typeof BrowserWindow, file: string): void => {
  const content: string = fs.readFileSync(file).toString();
  app.addRecentDocument(file);
  targetWindow.setRepresentedFilename(file);
  targetWindow.webContents.send('file-opened', file, content);
  startingWatchingFile(targetWindow, file);
}

ipcMain.on('save-markdown', (event: IpcMainEvent, file: string | null, content: string) => {
  if (!file) {
    const result = dialog.showSaveDialog(BrowserWindow.fromWebContents(event.sender), {
      title: "Save Markdown",
      defaultPath: app.getPath('documents'),
      filters: [
        { name: 'Markdown Files', extensions: ['md', 'markdown'] }
      ]
    });

    if (result.canceled || !result.filePath) return;
    file = result.filePath;
  }

  if (!file) return;

  fs.writeFileSync(file, content);
  openFile(BrowserWindow.fromWebContents(event.sender), file);
});

ipcMain.on('save-html', (event: IpcMainEvent, content: string) => {
  dialog.showSaveDialog(BrowserWindow.fromWebContents(event.sender), {
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
  const window = BrowserWindow.fromWebContents(event.sender) as typeof BrowserWindow;
  if (window) {
    window.setTitle(title);
  }
});

ipcMain.on('update-document', (event: IpcMainEvent, isEdited: boolean) => {
  const window = BrowserWindow.fromWebContents(event.sender) as typeof BrowserWindow;
  if (window) {
    window.setDocumentEdited(isEdited);
  }
});

ipcMain.on('show-dialog-message', 
  (event: IpcMainEvent, type: string, title: string, message: string, buttons: [string], defaultId: number, cancelId: number) => {
  const targetWindow = BrowserWindow.fromWebContents(event.sender) as typeof BrowserWindow;
  const result = dialog.showMessageBox(targetWindow, {
    type: 'question',
    title: title,
    message: message,
    buttons: buttons,
    defaultId: defaultId,
    cancelId: cancelId
  });

  // Return true if the user click on the first button (e.g., "Yes")
  return result.response === 0;
});


const startingWatchingFile = (targetWindow: typeof BrowserWindow, file: string): void => {
  stopWatchingFile(targetWindow);

  fs.watchFile(file, () => {
    const content: string = fs.readFileSync(file).toString();
    targetWindow.webContents.send('file-changed', file, content);
  })
  openFiles.set(targetWindow, file);
};

const stopWatchingFile = (targetWindow: typeof BrowserWindow): void => {
  if (openFiles.has(targetWindow)) {
    fs.unwatchFile(openFiles.get(targetWindow));
    openFiles.delete(targetWindow);
  }
}