const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const WebSocket = require('ws');

let mainWindow;
let pythonProcess;
let wsServer;
let isProctoringActive = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: false,
    kiosk: false,
    frame: true,
    titleBarStyle: 'default',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  // Prevent window from being minimized during proctoring
  mainWindow.on('minimize', (event) => {
    if (isProctoringActive) {
      event.preventDefault();
      mainWindow.restore();
      mainWindow.focus();
      dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title: 'Proctoring Session Active',
        message: 'Window cannot be minimized during proctoring. Session is being monitored.',
        buttons: ['OK']
      });
    }
  });

  // Prevent window from losing focus during proctoring
  mainWindow.on('blur', () => {
    if (isProctoringActive) {
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.focus();
          mainWindow.show();
        }
      }, 100);
    }
  });

  // Block keyboard shortcuts during proctoring
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (isProctoringActive) {
      // Block Alt+Tab, Ctrl+Alt+Del, Windows key, etc.
      if (input.alt || input.meta || 
          (input.control && (input.key === 'Tab' || input.key === 'Escape')) ||
          input.key === 'F11' || input.key === 'F4' || input.key === 'F12') {
        event.preventDefault();
        console.log('🚫 Blocked shortcut during proctoring:', input.key);
      }
    }
  });

  // Prevent window from being closed during proctoring
  mainWindow.on('close', (event) => {
    if (isProctoringActive) {
      const choice = dialog.showMessageBoxSync(mainWindow, {
        type: 'question',
        title: 'End Proctoring Session',
        message: 'Are you sure you want to end the proctoring session?',
        buttons: ['Cancel', 'End Session'],
        defaultId: 0,
        cancelId: 0
      });
      
      if (choice === 0) {
        event.preventDefault();
      } else {
        isProctoringActive = false;
      }
    }
  });

  mainWindow.loadURL('http://localhost:3000');
  startPythonWorker();
  startWebSocketServer();
}

function startPythonWorker() {
  // Try advanced worker first, fallback to simple worker
  const advancedWorkerPath = path.join(__dirname, 'python-worker', 'proctoring_worker.py');
  const simpleWorkerPath = path.join(__dirname, 'python-worker', 'simple_proctoring_worker.py');
  
  let pythonScriptPath = advancedWorkerPath;
  
  // Check if advanced dependencies are available
  try {
    const testProcess = spawn('python', ['-c', 'import ultralytics, dlib'], { stdio: 'pipe' });
    testProcess.on('close', (code) => {
      if (code !== 0) {
        console.log('Advanced AI dependencies not available, using simple worker');
        pythonScriptPath = simpleWorkerPath;
      }
      startWorker(pythonScriptPath);
    });
  } catch (error) {
    console.log('Using simple worker due to dependency check error');
    startWorker(simpleWorkerPath);
  }
}

function startWorker(scriptPath) {
  pythonProcess = spawn('python', [scriptPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: path.join(__dirname, 'python-worker')
  });

  pythonProcess.stdout.on('data', (data) => {
    const output = data.toString().trim();
    console.log(`Python Worker Output: ${output}`);
    
    // Handle multiple JSON objects in output
    const lines = output.split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
      try {
        const analysis = JSON.parse(line);
        
        // Send to renderer process
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('proctoring-analysis', analysis);
        }
        
        // Send to WebSocket clients
        if (wsServer) {
          wsServer.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'PROCTORING_ANALYSIS',
                data: analysis
              }));
            }
          });
        }
      } catch (error) {
        console.error('Error parsing Python output:', error, 'Raw output:', line);
      }
    });
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`Python Worker Error: ${data}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python worker exited with code ${code}`);
    if (isProctoringActive) {
      console.log('Restarting Python worker in 3 seconds...');
      setTimeout(startPythonWorker, 3000);
    }
  });

  pythonProcess.on('error', (error) => {
    console.error('Python worker process error:', error);
  });
}

function startWebSocketServer() {
  wsServer = new WebSocket.Server({ port: 3002 });
  
  wsServer.on('connection', (ws) => {
    console.log('Client connected to proctoring WebSocket');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        
        if (data.type === 'VIDEO_FRAME' && pythonProcess && pythonProcess.stdin.writable) {
          const frameMessage = JSON.stringify(data) + '\n';
          pythonProcess.stdin.write(frameMessage);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('Client disconnected from proctoring WebSocket');
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
  
  wsServer.on('error', (error) => {
    console.error('WebSocket server error:', error);
  });
}

// IPC handlers
ipcMain.handle('send-video-frame', (event, frameData) => {
  if (pythonProcess && pythonProcess.stdin.writable) {
    try {
      const message = JSON.stringify({
        type: 'VIDEO_FRAME',
        data: frameData,
        timestamp: Date.now()
      }) + '\n';
      
      pythonProcess.stdin.write(message);
      return true;
    } catch (error) {
      console.error('Failed to send frame to Python worker:', error);
      return false;
    }
  }
  return false;
});

ipcMain.handle('load-reference-face', (event, { imageUrl, userId }) => {
  if (pythonProcess && pythonProcess.stdin.writable) {
    try {
      const message = JSON.stringify({
        type: 'LOAD_REFERENCE_FACE',
        imageUrl: imageUrl,
        userId: userId
      }) + '\n';
      
      pythonProcess.stdin.write(message);
      return true;
    } catch (error) {
      console.error('Failed to load reference face:', error);
      return false;
    }
  }
  return false;
});

ipcMain.handle('start-proctoring', (event, sessionData) => {
  isProctoringActive = true;
  
  // Enable secure lockdown mode
  mainWindow.setAlwaysOnTop(true);
  mainWindow.setMinimizable(false);
  mainWindow.setClosable(false);
  mainWindow.setMenuBarVisibility(false);
  
  // Prevent Alt+Tab and other shortcuts
  mainWindow.setSkipTaskbar(true);
  
  // Set focus and prevent losing it
  mainWindow.focus();
  mainWindow.show();
  
  console.log('🔒 Lockdown mode enabled - Window secured');
  
  if (pythonProcess && pythonProcess.stdin.writable) {
    try {
      const message = JSON.stringify({
        type: 'START_PROCESSING',
        sessionData: sessionData || {}
      }) + '\n';
      
      pythonProcess.stdin.write(message);
      return true;
    } catch (error) {
      console.error('Failed to start proctoring:', error);
      return false;
    }
  }
  return false;
});

ipcMain.handle('stop-proctoring', () => {
  isProctoringActive = false;
  
  // Restore normal window mode
  mainWindow.setAlwaysOnTop(false);
  mainWindow.setMinimizable(true);
  mainWindow.setClosable(true);
  mainWindow.setMenuBarVisibility(true);
  mainWindow.setSkipTaskbar(false);
  
  console.log('🔓 Lockdown mode disabled - Window restored');
  
  if (pythonProcess && pythonProcess.stdin.writable) {
    pythonProcess.stdin.write(JSON.stringify({
      type: 'STOP_PROCESSING'
    }) + '\n');
    return true;
  }
  return false;
});

ipcMain.handle('get-proctoring-status', () => {
  return isProctoringActive;
});

ipcMain.handle('set-window-mode', (event, mode) => {
  if (mode === 'proctoring') {
    isProctoringActive = true;
    mainWindow.setKiosk(true);
    mainWindow.setAlwaysOnTop(true);
    mainWindow.setFullScreen(true);
  } else if (mode === 'normal') {
    isProctoringActive = false;
    mainWindow.setKiosk(false);
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setFullScreen(false);
  }
  return true;
});

// Add navigation control
ipcMain.handle('navigate-back', () => {
  if (mainWindow && mainWindow.webContents.canGoBack()) {
    mainWindow.webContents.goBack();
    return true;
  }
  return false;
});

ipcMain.handle('can-go-back', () => {
  return mainWindow ? mainWindow.webContents.canGoBack() : false;
});

ipcMain.handle('get-window-mode', () => {
  return isProctoringActive ? 'proctoring' : 'normal';
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
  if (wsServer) {
    wsServer.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isProctoringActive = false;
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});