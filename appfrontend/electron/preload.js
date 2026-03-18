const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Proctoring methods
  sendVideoFrame: (frameData) => ipcRenderer.invoke('send-video-frame', frameData),
  loadReferenceFace: (imageUrl, userId) => ipcRenderer.invoke('load-reference-face', { imageUrl, userId }),
  startProctoring: (sessionData) => ipcRenderer.invoke('start-proctoring', sessionData),
  stopProctoring: () => ipcRenderer.invoke('stop-proctoring'),
  getProctoringStatus: () => ipcRenderer.invoke('get-proctoring-status'),
  setWindowMode: (mode) => ipcRenderer.invoke('set-window-mode', mode),
  getWindowMode: () => ipcRenderer.invoke('get-window-mode'),

  // Navigation controls
  navigateBack: () => ipcRenderer.invoke('navigate-back'),
  canGoBack: () => ipcRenderer.invoke('can-go-back'),

  // Listen for analysis results
  onProctoringAnalysis: (callback) => {
    ipcRenderer.on('proctoring-analysis', (event, analysis) => callback(analysis));
  },

  // ── Debug log stream from main process → DevTools console ──
  onDebugLog: (callback) => {
    ipcRenderer.on('debug-log', (event, msg) => callback(msg));
  },

  // Signal renderer is ready to receive logs
  rendererReady: () => ipcRenderer.invoke('renderer-ready'),

  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // Check if running in Electron
  isElectron: true,

  // Platform info
  platform: process.platform
});

// Expose a global flag for React components
contextBridge.exposeInMainWorld('isElectron', true);