const { app, BrowserWindow, ipcMain } = require('electron');
const url = require('url');
const path = require('path');
const fs = require('fs');
const screenshot = require('screenshot-desktop');

let mainWindow;

const createWindow = () => {
    mainWindow = new BrowserWindow({
        title: 'Nav AI',
        width: 800,
        height: 800,
        icon: "assets/circlelogo.png",
        webPreferences: {
            webSecurity: false,
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    const startUrl = url.format({
        pathname: path.join(__dirname, './app/src/index.html'),
        protocol: 'file',
        slashes: true,
    });

    mainWindow.loadURL('http://localhost:3000'); // Change to startUrl if serving from build
}

// Minimize the app
ipcMain.handle('minimize-app', () => {
    if (mainWindow) {
        mainWindow.minimize();
    }
});

// Restore the app
ipcMain.handle('restore-app', () => {
    if (mainWindow) {
        mainWindow.restore();
    }
});

// Take a screenshot with a delay
ipcMain.handle('take-screenshot', async () => {
    return new Promise((resolve) => {
        setTimeout(async () => {
            const filePath = path.join(app.getPath('pictures'), `screenshot-${Date.now()}.png`);
            await screenshot({ filename: filePath });
            resolve(filePath);
        }, 500); // 2000 milliseconds delay (2 seconds)
    });
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
