// main.js
const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  globalShortcut,
  powerSaveBlocker,
} = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const WebSocket = require("ws");
const fetch = require("node-fetch"); // npm install node-fetch@2

let mainWindow;
let pythonProcess;
let pyReady = false;
let wsServer;
let isProctoringActive = false;
let blockerId = null;
let rendererReady = false;
const logBuffer = [];

function dbg(msg) {
  const line = `[PROCTOR] ${msg}`;
  console.log(line); // always in terminal
  if (mainWindow && !mainWindow.isDestroyed() && rendererReady) {
    mainWindow.webContents.send('debug-log', line);
  } else {
    logBuffer.push(line); // buffer until renderer ready
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    resizable: true,
    minimizable: true,
    maximizable: true,
    fullscreenable: true,
    alwaysOnTop: false,
    kiosk: false,
    frame: true,
    titleBarStyle: "default",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  // Prevent minimize during proctoring
  mainWindow.on("minimize", (event) => {
    if (isProctoringActive) {
      event.preventDefault();
      mainWindow.restore();
      mainWindow.focus();
      dialog.showMessageBox(mainWindow, {
        type: "warning",
        title: "Proctoring Session Active",
        message:
          "Window cannot be minimized during proctoring. Session is being monitored.",
        buttons: ["OK"],
      });
    }
  });

  let focusRestoreTimeout = null;

  // Prevent focus loss during proctoring
  mainWindow.on("blur", () => {
    if (isProctoringActive) {
      // Debounce — kiosk mode itself triggers blur, don't flood renderer
      if (focusRestoreTimeout) return;
      focusRestoreTimeout = setTimeout(() => {
        focusRestoreTimeout = null;
        if (!isProctoringActive) return;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("proctoring-analysis", {
            alerts: [{
              alertType: "WINDOW_FOCUS_LOST",
              description: "Application focus was lost – possible attempt to switch apps",
              severity: "HIGH",
              timestamp: Date.now(),
            }],
          });
          mainWindow.focus();
        }
      }, 300);
    }
  });

  // Block keyboard shortcuts during proctoring
  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (isProctoringActive) {
      const blockedKeys = [
        "Alt",
        "Meta",
        "Control",
        "Tab",
        "Escape",
        "F11",
        "F4",
        "F12",
      ];
      if (
        input.alt ||
        input.meta ||
        (input.control && (input.key === "Tab" || input.key === "Escape")) ||
        input.key === "F11" ||
        input.key === "F4" ||
        input.key === "F12"
      ) {
        event.preventDefault();
        console.log("🚫 Blocked shortcut during proctoring:", input.key);
      }
    }
  });

  // Prevent window close during proctoring (with confirmation)
  mainWindow.on("close", (event) => {
    if (isProctoringActive) {
      const choice = dialog.showMessageBoxSync(mainWindow, {
        type: "question",
        title: "End Proctoring Session",
        message: "Are you sure you want to end the proctoring session?",
        buttons: ["Cancel", "End Session"],
        defaultId: 0,
        cancelId: 0,
      });
      if (choice === 0) {
        event.preventDefault();
      } else {
        isProctoringActive = false;
      }
    }
  });

  mainWindow.loadURL("http://localhost:3000");
  startPythonWorker();
  startWebSocketServer();
}

// Resolve the correct python executable:
// 1. venv inside python-worker/proctoring_env (has cv2+numpy guaranteed)
// 2. fall back to system python
function getPythonExe() {
  // Must be absolute — spawn resolves relative exe against process.cwd(), not spawn cwd
  const venvPy = path.resolve(__dirname, "python-worker", "proctoring_env", "Scripts", "python.exe");
  const fs = require("fs");
  if (fs.existsSync(venvPy)) {
    console.log(`[PROCTOR] Using venv python: ${venvPy}`);
    return venvPy;
  }
  console.log("[PROCTOR] venv not found — falling back to system python");
  return "python";
}

function startPythonWorker() {
  // simple_proctoring_worker.py has YOLO support built-in now
  const workerPath = path.join(__dirname, "python-worker", "simple_proctoring_worker.py");
  startWorker(workerPath);
}

function startWorker(scriptPath) {
  const pythonExe = getPythonExe();
  // Absolute paths for both exe and script — no cwd ambiguity
  const absScript = path.resolve(scriptPath);
  const workerDir = path.resolve(__dirname, "python-worker");
  console.log(`[PROCTOR] Starting Python worker: ${pythonExe} ${absScript}`);

  pyReady = false;
  pythonProcess = spawn(pythonExe, [absScript], {
    stdio: ["pipe", "pipe", "pipe"],
    cwd: workerDir,
    env: {
      ...process.env,
      PYTHONPATH: "",
      PYTHONNOUSERSITE: "1",
    },
  });

  // Buffer for incomplete lines
  let stdoutBuf = "";

  pythonProcess.stdout.on("data", (data) => {
    stdoutBuf += data.toString();
    const lines = stdoutBuf.split("\n");
    // Keep last incomplete chunk in buffer
    stdoutBuf = lines.pop();

    lines.forEach((line) => {
      line = line.trim();
      if (!line) return;
      try {
        const msg = JSON.parse(line);
        if (msg.status && !msg.alerts) {
          dbg(`PY-STATUS: ${msg.status}`);
          if (msg.status === "READY") {
            pyReady = true;
            dbg("Python worker is READY — frames will now be processed");
          }
          return;
        }
        dbg(`PY-ANALYSIS: faces=${msg.faceCount} faceDetected=${msg.faceDetected} alerts=${msg.alerts?.length ?? 0}`);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("proctoring-analysis", msg);
        }
        if (wsServer) {
          wsServer.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: "PROCTORING_ANALYSIS", data: msg }));
            }
          });
        }
      } catch (_) {
        dbg(`PY-LOG: ${line}`);
      }
    });
  });

  pythonProcess.stderr.on("data", (data) => {
    dbg(`PY-STDERR: ${data.toString().trim()}`);
  });

  pythonProcess.on("close", (code) => {
    pyReady = false;
    dbg(`Python worker exited with code ${code}`);
    if (isProctoringActive && code !== 0) {
      dbg("Restarting Python worker in 3 seconds...");
      setTimeout(startPythonWorker, 3000);
    }
  });

  pythonProcess.on("error", (error) => {
    pyReady = false;
    dbg(`Python worker process error: ${error.message}`);
  });
}

function startWebSocketServer() {
  wsServer = new WebSocket.Server({ port: 3002 });
  wsServer.on("connection", (ws) => {
    console.log("Client connected to proctoring WebSocket");
    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message);
        if (
          data.type === "VIDEO_FRAME" &&
          pythonProcess &&
          pythonProcess.stdin.writable
        ) {
          pythonProcess.stdin.write(JSON.stringify(data) + "\n");
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    });
    ws.on("close", () => console.log("Client disconnected"));
    ws.on("error", console.error);
  });
  wsServer.on("error", console.error);
}

// IPC Handlers
ipcMain.handle("renderer-ready", () => {
  rendererReady = true;
  // flush buffered logs
  while (logBuffer.length > 0) {
    const msg = logBuffer.shift();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('debug-log', msg);
    }
  }
  return true;
});

ipcMain.handle("send-video-frame", (event, frameData) => {
  if (pyReady && pythonProcess && pythonProcess.stdin.writable) {
    try {
      pythonProcess.stdin.write(
        JSON.stringify({ type: "VIDEO_FRAME", data: frameData }) + "\n",
      );
      return true;
    } catch (error) {
      dbg(`Failed to send frame to Python: ${error.message}`);
    }
  } else {
    dbg(`send-video-frame: Python not ready (pyReady=${pyReady} writable=${pythonProcess?.stdin?.writable})`);
  }
  return false;
});

ipcMain.handle("load-reference-face", (event, { imageUrl, userId }) => {
  if (pythonProcess && pythonProcess.stdin.writable) {
    try {
      pythonProcess.stdin.write(
        JSON.stringify({ type: "LOAD_REFERENCE_FACE", imageUrl, userId }) + "\n"
      );
      return true;
    } catch (error) {
      console.error("Failed to load reference face:", error);
    }
  }
  return false;
});

ipcMain.handle("start-proctoring", async (event, sessionData) => {
  try {
    isProctoringActive = true;

    // Auto-restart Python worker if it died between sessions
    if (!pyReady || !pythonProcess) {
      dbg("Python worker not ready at start-proctoring — restarting...");
      startPythonWorker();
      // Wait up to 10s for it to become ready
      await new Promise((resolve) => {
        const t = setInterval(() => { if (pyReady) { clearInterval(t); resolve(); } }, 200);
        setTimeout(() => { clearInterval(t); resolve(); }, 10000);
      });
    }

    // Full screen + lock down
    try { mainWindow.setFullScreen(true); } catch {}
    try { mainWindow.setResizable(false); } catch {}
    try { mainWindow.setMinimizable(false); } catch {}
    try { mainWindow.setMaximizable(false); } catch {}
    try { mainWindow.setClosable(false); } catch {}
    try { mainWindow.setMenuBarVisibility(false); } catch {}
    try { mainWindow.setSkipTaskbar(false); } catch {}
    try { mainWindow.setAlwaysOnTop(true, "screen-saver"); } catch {}
    try { blockerId = powerSaveBlocker.start("prevent-display-sleep"); } catch {}
    try { mainWindow.setContentProtection(true); } catch {}
    try { globalShortcut.register("Alt+Tab", () => {}); } catch {}
    try { globalShortcut.register("CommandOrControl+Tab", () => {}); } catch {}

    // Start processing in Python worker
    if (pythonProcess && pythonProcess.stdin.writable) {
      pythonProcess.stdin.write(
        JSON.stringify({ type: "START_PROCESSING", sessionData: {
          meetingId: String(sessionData?.meetingId || ""),
          userId: String(sessionData?.userId || ""),
          participantId: String(sessionData?.participantId || ""),
          studentName: String(sessionData?.studentName || ""),
        }}) + "\n"
      );
    }

    dbg(`Proctoring started for ${sessionData?.userId}`);
    return true;
  } catch (err) {
    dbg(`start-proctoring error: ${err.message}`);
    return false;
  }
});

ipcMain.handle("stop-proctoring", () => {
  isProctoringActive = false;

  try { mainWindow.setFullScreen(false); } catch {}
  try { mainWindow.setResizable(true); } catch {}
  try { mainWindow.setMinimizable(true); } catch {}
  try { mainWindow.setMaximizable(true); } catch {}
  try { mainWindow.setClosable(true); } catch {}
  try { mainWindow.setMenuBarVisibility(true); } catch {}
  try { mainWindow.setAlwaysOnTop(false); } catch {}
  try { mainWindow.setContentProtection(false); } catch {}
  if (blockerId) { try { powerSaveBlocker.stop(blockerId); } catch {} blockerId = null; }
  try { globalShortcut.unregisterAll(); } catch {}

  // Kill Python worker and restart it so it's ready for next session
  pyReady = false;
  if (pythonProcess) {
    try { pythonProcess.kill(); } catch {}
    pythonProcess = null;
    dbg("Python worker killed on stop-proctoring — restarting for next session");
  }
  setTimeout(startPythonWorker, 1000);
  return true;
});

ipcMain.handle("get-proctoring-status", () => isProctoringActive);

ipcMain.handle("set-window-mode", (event, mode) => {
  if (mode === "proctoring") {
    isProctoringActive = true;
    mainWindow.setKiosk(true);
    mainWindow.setAlwaysOnTop(true);
    mainWindow.setFullScreen(true);
  } else {
    isProctoringActive = false;
    mainWindow.setKiosk(false);
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setFullScreen(false);
  }
  return true;
});

ipcMain.handle("navigate-back", () => {
  if (mainWindow && mainWindow.webContents.canGoBack()) {
    mainWindow.webContents.goBack();
    return true;
  }
  return false;
});

ipcMain.handle("can-go-back", () =>
  mainWindow ? mainWindow.webContents.canGoBack() : false,
);

ipcMain.handle("get-window-mode", () =>
  isProctoringActive ? "proctoring" : "normal",
);

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  pyReady = false;
  if (pythonProcess) { try { pythonProcess.kill(); } catch {} pythonProcess = null; }
  if (wsServer) { try { wsServer.close(); } catch {} wsServer = null; }
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  isProctoringActive = false;
  pyReady = false;
  if (pythonProcess) { try { pythonProcess.kill(); } catch {} pythonProcess = null; }
});



app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
