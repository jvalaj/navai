const { app, BrowserWindow } = require('electron/main')
const url = require('url');
const path = require('path');
const fs = require('fs');


const createWindow = () => {
    const mainWindow = new BrowserWindow({
        title: 'Nav AI',
        width: 800,
        height: 800
    })

    const startUrl = url.format({
        pathname: path.join(__dirname, './app/src/index.html'), //change this directory to  ./app/build/index.html
        protocol: 'file',
    })

    mainWindow.loadURL('http://localhost:3000'); //change this to startUrl
}

app.whenReady().then(createWindow);