const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const WebSocket = require('ws');

let mainWindow;
let pythonProcess;
let wsServer;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadURL('http://localhost:3000');
  startPythonWorker();
  startWebSocketServer();
}

function startPythonWorker() {
  const pythonScriptPath = path.join(__dirname, 'python-worker', 'proctoring_worker.py');
  
  pythonProcess = spawn('python', [pythonScriptPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  pythonProcess.stdout.on('data', (data) => {
    console.log(`Python Worker: ${data}`);
    
    try {
      const analysis = JSON.parse(data.toString());
      
      // Send to renderer process
      if (mainWindow) {
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
      console.error('Error parsing Python output:', error);
    }
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`Python Error: ${data}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python worker exited with code ${code}`);
    setTimeout(startPythonWorker, 5000);
  });
}

function startWebSocketServer() {
  wsServer = new WebSocket.Server({ port: 3002 });
  
  wsServer.on('connection', (ws) => {
    console.log('Client connected to proctoring WebSocket');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        
        if (data.type === 'VIDEO_FRAME' && pythonProcess) {
          pythonProcess.stdin.write(JSON.stringify(data) + '\n');
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('Client disconnected from proctoring WebSocket');
    });
  });
}

// IPC handlers
ipcMain.handle('send-video-frame', (event, frameData) => {
  if (pythonProcess && pythonProcess.stdin.writable) {
    pythonProcess.stdin.write(JSON.stringify({
      type: 'VIDEO_FRAME',
      data: frameData
    }) + '\n');
    return true;
  }
  return false;
});

ipcMain.handle('load-reference-face', (event, { imageUrl, userId }) => {
  if (pythonProcess && pythonProcess.stdin.writable) {
    pythonProcess.stdin.write(JSON.stringify({
      type: 'LOAD_REFERENCE_FACE',
      imageUrl: imageUrl,
      userId: userId
    }) + '\n');
    return true;
  }
  return false;
});

ipcMain.handle('start-proctoring', () => {
  if (pythonProcess && pythonProcess.stdin.writable) {
    pythonProcess.stdin.write(JSON.stringify({
      type: 'START_PROCESSING'
    }) + '\n');
    return true;
  }
  return false;
});

ipcMain.handle('stop-proctoring', () => {
  if (pythonProcess && pythonProcess.stdin.writable) {
    pythonProcess.stdin.write(JSON.stringify({
      type: 'STOP_PROCESSING'
    }) + '\n');
    return true;
  }
  return false;
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

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});