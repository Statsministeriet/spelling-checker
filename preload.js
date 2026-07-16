const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  onData: (callback) => ipcRenderer.on('data', (event, data) => callback(data)),
  accept: (text) => ipcRenderer.send('accept', text),
  close: () => ipcRenderer.send('close-popup'),
  hideTrayWindow: () => ipcRenderer.send('hide-tray-window'),
  correctText: (text, mode) => ipcRenderer.invoke('correct-text', { text, mode }),
  getSettingsData: () => ipcRenderer.invoke('get-settings-data'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  listModels: (providerId, apiKey) => ipcRenderer.invoke('list-models', { providerId, apiKey }),
  onRefreshActiveModel: (callback) => ipcRenderer.on('refresh-active-model', callback),
  openSettings: () => ipcRenderer.send('open-settings')
});
