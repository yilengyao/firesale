import { app, MenuItem, BrowserWindow, dialog } from "electron";

const { Menu } = require('electron');
const mainProcess = require('./main');

const template: any = [
    {
        label: 'File',
        submenu: [
            {
                label: 'New File',
                accelerator: 'CommandOrcontrol+N',
                click() {
                    mainProcess.createWindow();
                }
            },
            {
                label: 'Open File',
                accelerator: 'CommandOrControl+O',
                click(item: MenuItem, focusWindow: BrowserWindow) {
                    if (focusWindow) {
                        return mainProcess.getFileFromUser(focusWindow);
                    }

                    const newWindow = mainProcess.createWindow();

                    newWindow.on('show', () => {
                        mainProcess.getFileFromUser(newWindow);
                    });
                }
            },
            {
                label: 'Save File',
                accelerator: 'CommandOrControl+S',
                click(item: MenuItem, focusWindow: BrowserWindow) {
                    if (!focusWindow) {
                        return dialog.showErrorBox(
                            'Cannot Save or Export',
                            'There is currently no active document to save or export.'
                        );
                    }
                    focusWindow.webContents.send('save-markdown');
                }
            },
            {
                label: 'Export HTML',
                accelerator: 'Shift+CommandOrControl+S',
                click(item: MenuItem, focusWindow: BrowserWindow) {
                    if (!focusWindow) {
                        return dialog.showErrorBox(
                            'Cannot Save or Export',
                            'There is currently no active document to save or export.'
                        );
                    }
                    focusWindow.webContents.send('save-html');
                }
            }
        ]
    },
    {
        label: 'Edit',
        submenu: [
            {
                label: 'Undo',
                accelerator: 'CommandOrControl+Z',
                role: 'undo'
            },
            {
                label: 'Redo',
                accelerator: 'Shift+CommandOrControl+Z',
                role: 'redo'
            },
            {
                label: 'Cut',
                accelerator: 'CommandOrControl+X',
                role: 'cut'
            },
            {
                label: 'Copy',
                accelerator: 'CommandOrControl+C',
                role: 'copy'
            },
            {
                label: 'Paste',
                accelerator: 'CommandOrControl+V',
                role: 'paste'
            },
            {
                label: 'Select All',
                accelerator: 'CommandOrControl+A',
                role: 'selectall'
            }
        ]
    },
    {
        label: 'Window',
        submenu: [
            {
                label: 'Minimize',
                accellerator: 'CommandOrControl+M',
                role: 'minimize'
            },
            {
                label: 'Close',
                accelerator: 'CommandOrControl+W',
                role: 'close'
            }
        ]
    },
    {
        label: 'Help',
        role: 'help',
        submenu: [
            {
                label: 'Visit Website',
                click() { /* To be implemented */ }
            },
            {
                label: 'Toggle Developer Tools',
                click(item: MenuItem, focusWindow: BrowserWindow) {
                    if (focusWindow) {
                        focusWindow.webContents.toggleDevTools();
                    }
                }
            }
        ]
    }
];

if (process.platform === 'darwin') {
    const name = 'Firesale';
    template.unshift({
        label: name,
        submenu: [
            {
                label: `About ${name}`,
                role: 'about'
            },
            {
                type: 'separator'
            },
            {
                label: 'Services',
                role: 'services',
                submenu: []
            },
            {
                type: 'separator'
            },
            {
                label: `Hide ${name}`,
                accelerator: 'Command+H',
                role: 'hide'
            },
            {
                label: 'Hide Others',
                accelerator: 'Command+Alt+H',
                role: 'hideothers'
            },
            {
                label: 'Show All',
                role: 'unhide'
            },
            {
                type: 'separator'
            },
            {
                label: `Quit ${name}`,
                accelerator: 'Command+Q',
                click() {
                    app.quit();
                }
            }
        ]
    });

    const windowMenu = template.find((item: MenuItem) => item.label === 'Window');
    windowMenu.role = 'window';
    windowMenu.submenu.push(
        {
            type: 'separator'
        },
        {
            label: 'Bring All to Front',
            role: 'front'
        }
    );
}


module.exports = Menu.buildFromTemplate(template);