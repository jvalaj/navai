const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    minimizeApp: () => ipcRenderer.invoke('minimize-app'),
    restoreApp: () => ipcRenderer.invoke('restore-app'),
    takeScreenshot: () => ipcRenderer.invoke('take-screenshot'),
});
