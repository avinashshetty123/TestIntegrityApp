const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Proctoring methods
  sendVideoFrame: (frameData) => ipcRenderer.invoke('send-video-frame', frameData),
  loadReferenceFace: (imageUrl, userId) => ipcRenderer.invoke('load-reference-face', { imageUrl, userId }),
  startProctoring: (sessionData) => ipcRenderer.invoke('start-proctoring', sessionData),
  stopProctoring: () => ipcRenderer.invoke('stop-proctoring'),
  getProctoringStatus: () => ipcRenderer.invoke('get-proctoring-status'),
  setWindowMode: (mode) => ipcRenderer.invoke('set-window-mode', mode),
  
  // Listen for analysis results
  onProctoringAnalysis: (callback) => {
    ipcRenderer.on('proctoring-analysis', (event, analysis) => callback(analysis));
  },
  
  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
  
  // Check if running in Electron
  isElectron: true
});

// Expose a global flag for React components
contextBridge.exposeInMainWorld('isElectron', true);