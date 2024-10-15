const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    takeScreenshot: () => ipcRenderer.invoke('take-screenshot'),
    minimizeApp: () => ipcRenderer.invoke('minimize-app'),
    restoreApp: () => ipcRenderer.invoke('restore-app'),
    saveAudio: (audioBuffer) => ipcRenderer.invoke('save-audio', audioBuffer),
    sendSS: (fPath, transcriptionText) => ipcRenderer.invoke('send-ss', fPath, transcriptionText)
});
