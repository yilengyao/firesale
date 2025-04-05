const { app, MenuItem, BrowserWindow, dialog, Menu } = require('electron');
const mainProcess = require('./main');

const createApplicationMenu = () => {
    const hasOneOrMoreWindows = !!BrowserWindow.getAllWindows().length;    
    const focusedWindow = BrowserWindow.getFocusedWindow();
    const hasFilePath = (item: typeof MenuItem, browserWindow: typeof BrowserWindow) => {
        if (!browserWindow) return false;
        return mainProcess.openFiles.has(browserWindow);
    };

    const template: any = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New File',
                    accelerator: 'CommandOrControl+N',
                    click() {
                        mainProcess.createWindow();
                    }
                },
                {
                    label: 'Open File',
                    accelerator: 'CommandOrControl+O',
                    click(item: typeof MenuItem, focusWindow: typeof BrowserWindow) {
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
                    enabled: hasOneOrMoreWindows,
                    click(item: typeof MenuItem, focusWindow: typeof BrowserWindow) {
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
                    enabled: hasOneOrMoreWindows,
                    click(item: typeof MenuItem, focusWindow: typeof BrowserWindow) {
                        if (!focusWindow) {
                            return dialog.showErrorBox(
                                'Cannot Save or Export',
                                'There is currently no active document to save or export.'
                            );
                        }
                        focusWindow.webContents.send('save-html');
                    }
                },
                {   type: 'separator' },
                {
                    label: 'Show File',
                    enabled: hasFilePath,
                    click(item: typeof MenuItem, focusWindow: typeof BrowserWindow) {
                        if (!focusWindow) {
                            return dialog.showErrorBox(
                                'Cannot Show File\'s Location',
                                'There is currently no active document to show.'
                            );
                        }
                        focusWindow.webContents.send('show-file');
                    }
                },
                {
                    label: 'Open in Default Application',
                    enabled: hasFilePath,
                    click(item: typeof MenuItem, focusWindow: typeof BrowserWindow) {
                        if (!focusWindow) {
                            return dialog.showErrorBox(
                                'Cannot Open File in Default Application',
                                'There is currently no active document to open.'
                            );
                        }
                        focusWindow.webContents.send('open-in-default-application');
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
                    click(item: typeof MenuItem, focusWindow: typeof BrowserWindow) {
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
                { type: 'separator' },
                {
                    label: 'Services',
                    role: 'services',
                    submenu: []
                },
                { type: 'separator' },
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
                { type: 'separator' },
                {
                    label: `Quit ${name}`,
                    accelerator: 'Command+Q',
                    click() {
                        app.quit();
                    }
                }
            ]
        });

        const windowMenu = template.find((item: typeof MenuItem) => item.label === 'Window');
        windowMenu.role = 'window';
        windowMenu.submenu.push(
            { type: 'separator' },
            {
                label: 'Bring All to Front',
                role: 'front'
            }
        );
    }
    return Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

module.exports = createApplicationMenu;