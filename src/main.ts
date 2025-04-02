import { IpcMainEvent, OpenDialogReturnValue } from 'electron';

const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('fs');

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

const windows = new Set() as Set<typeof BrowserWindow>;

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

ipcMain.on('create-window', () => {
  createWindow();
});