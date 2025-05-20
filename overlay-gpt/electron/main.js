const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const WebSocket = require('ws');

let mainWindow;
let wsConnection = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    // 브라우저 창 크기 고정
    width: 400,
    height: 580,
    frame: false, // 제목 표시줄과 창 조절 버튼 제거
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173/');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// WebSocket 연결 설정
ipcMain.on('setup-websocket', (event, { url }) => {
  if (wsConnection) {
    wsConnection.close();
  }

  wsConnection = new WebSocket(url);

  wsConnection.on('open', () => {
    mainWindow.webContents.send('websocket-connected');
  });

  wsConnection.on('error', (error) => {
    mainWindow.webContents.send('websocket-error', error.message);
  });

  wsConnection.on('close', () => {
    mainWindow.webContents.send('websocket-closed');
  });
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});