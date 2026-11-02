const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

function createWindow() {
  Menu.setApplicationMenu(null);
  const win = new BrowserWindow({
    width: 470,
    height: 880,
    minWidth: 380,
    minHeight: 600,
    title: 'حاسبة الصيرفة',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  });
  win.loadFile(path.join(__dirname, '..', 'www', 'index.html'));
  // Any external link opens in the normal browser, never inside the app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
