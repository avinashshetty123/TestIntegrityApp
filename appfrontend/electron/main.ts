// main.js (Electron)
const { app, BrowserWindow } = require("electron");

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    fullscreen: true,     // ✅ force fullscreen
    kiosk: true,          // ✅ disables ESC, ALT+F4, etc
    frame: false,         // ✅ hides window controls
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadURL("http://localhost:3000");
  win.webContents.setWindowOpenHandler(() => {
  return { action: "deny" };
  win.setAlwaysOnTop(true, "screen-saver");
win.on("blur", () => {

  console.log("User tried to switch window!");
});

}); // your Next.js app
}

app.whenReady().then(createWindow);
