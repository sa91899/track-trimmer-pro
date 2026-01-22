const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectFile: () => ipcRenderer.invoke('select-file'),
  saveFile: (defaultPath) => ipcRenderer.invoke('save-file', defaultPath),
  scanFolder: (folderPath) => ipcRenderer.invoke('scan-folder', folderPath),
  processAudio: (options) => ipcRenderer.invoke('process-audio', options),
  batchProcess: (options) => ipcRenderer.invoke('batch-process', options),
  openOutputFolder: (folderPath) => ipcRenderer.invoke('open-output-folder', folderPath),
  onBatchProgress: (callback) => {
    ipcRenderer.on('batch-progress', (event, progress) => callback(progress));
  },
  // Get the correct path to the icon for both dev and production
  getIconPath: () => ipcRenderer.invoke('get-icon-path')
});


