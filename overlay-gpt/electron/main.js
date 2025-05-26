const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const WebSocket = require('ws');

let mainWindow;
let wsConnection = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    // 브라우저 창 크기 설정
    width: 400,
    height: 580,
    
    // 최소 크기 설정
    minWidth: 400,
    minHeight: 580,
    
    // 최대 크기 설정
    // maxWidth: 800,
    // maxHeight: 1000,
    
    frame: false, // 제목 표시줄과 창 조절 버튼 제거
    transparent: true,
    resizable: true, 

    webPreferences: {
      nodeIntegration: false, // 보안상 false로 변경
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

  ipcMain.on('minimize-window', () => {
    if(mainWindow) {
      mainWindow.minimize();
    }
  });

  ipcMain.on('maximize-restore-window', () => {
    if(mainWindow) {
      if (mainWindow.isMaximized()) {
        console.log('Window was maximized, restoring...');
        mainWindow.restore();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('close-window', () => {
    if(mainWindow) {
      mainWindow.close();
    }
  });

  ipcMain.on('set-window-size', (event, { width, height }) => {
    if(mainWindow) {
      // 최소 크기보다 작으면 최소 크기로 설정
      const finalWidth = Math.max(width, 400);
      const finalHeight = Math.max(height, 580);
      
      mainWindow.setSize(finalWidth, finalHeight);
    }
  });

  ipcMain.handle('get-window-size', () => {
    if(mainWindow) {
      const [width, height] = mainWindow.getSize();
      return { width, height };
    }
    return { width: 400, height: 580 };
  });
}

// WebSocket 연결 설정
ipcMain.on('setup-websocket', (event, { url }) => {
  if (wsConnection) {
    wsConnection.close();
  }

  wsConnection = new WebSocket(url);

  wsConnection.on('open', () => {
    if(mainWindow) {
      mainWindow.webContents.send('websocket-connected');
    }
  });

  wsConnection.on('error', (error) => {
    if(mainWindow) {
      mainWindow.webContents.send('websocket-error', error.message);
    }
  });

  wsConnection.on('close', () => {
    if(mainWindow) {
      mainWindow.webContents.send('websocket-closed');
    }
  });
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (wsConnection) {
    wsConnection.close();
    wsConnection = null;
  }
});