const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Proctoring methods
  sendVideoFrame: (frameData) => ipcRenderer.invoke('send-video-frame', frameData),
  loadReferenceFace: (imageUrl, userId) => ipcRenderer.invoke('load-reference-face', { imageUrl, userId }),
  startProctoring: () => ipcRenderer.invoke('start-proctoring'),
  stopProctoring: () => ipcRenderer.invoke('stop-proctoring'),
  
  // Listen for analysis results
  onProctoringAnalysis: (callback) => {
    ipcRenderer.on('proctoring-analysis', (event, analysis) => callback(analysis));
  },
  
  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});