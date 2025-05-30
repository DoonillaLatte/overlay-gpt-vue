const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const WebSocket = require('ws'); // 메인 프로세스에서 직접 WebSocket을 사용하는 경우

let mainWindow;
let wsConnection = null; // 메인 프로세스에서 관리하는 WebSocket 연결

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 580,
    minWidth: 400,
    minHeight: 580,
    frame: false,
    transparent: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // 개발용 
    }
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173/');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 창 닫힘 요청 시 처리
  mainWindow.on('close', (event) => {
    event.preventDefault();
    console.log('Main process: Window close requested, closing WebSocket...');

    // WebSocket 연결 종료 시도
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      wsConnection.close(1000, 'Application closing');
      // WebSocket이 완전히 닫힐 때까지 잠시 대기
      const closeTimeout = setTimeout(() => {
        console.log('Main process: Forcefully destroying window after WebSocket close timeout.');
        if (mainWindow) { 
          mainWindow.destroy();
          mainWindow = null;
        }
      }, 1000);

      wsConnection.on('close', () => {
        console.log('Main process: WebSocket connection closed gracefully.');
        clearTimeout(closeTimeout);
        if (mainWindow) {
          mainWindow.destroy();
          mainWindow = null;
        }
      });

    } else {
      console.log('Main process: WebSocket not open, destroying window immediately.');
      if (mainWindow) {
        mainWindow.destroy();
        mainWindow = null;
      }
    }
  });

  // --- 창 제어 IPC 핸들러 ---
  ipcMain.on('minimize-window', () => {
    if(mainWindow) {
      mainWindow.minimize();
    }
  });

  ipcMain.on('maximize-restore-window', () => {
    if(mainWindow) {
      if (mainWindow.isMaximized()) {
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
    if(mainWindow && !mainWindow.isDestroyed()) {
      const finalWidth = Math.max(width, 400);
      const finalHeight = Math.max(height, 580);
      mainWindow.setSize(finalWidth, finalHeight);
    }
  });

  ipcMain.handle('get-window-size', () => {
    if(mainWindow && !mainWindow.isDestroyed()) { 
      const [width, height] = mainWindow.getSize();
      return { width, height };
    }
    return { width: 400, height: 580 }; // 기본값 반환
  });

  // --- isMaximized 상태 알림 및 요청 핸들러  ---
  mainWindow.on('maximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-maximized');
    }
  });

  mainWindow.on('unmaximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-unmaximized');
    }
  });

  ipcMain.handle('is-maximized', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      return mainWindow.isMaximized();
    }
    return false; // 창이 없거나 파괴된 경우 false 반환
  });
}

// WebSocket 연결 설정
ipcMain.on('setup-websocket', (event, { url }) => {
  if (wsConnection) {
    wsConnection.close();
    wsConnection = null;
  }

  wsConnection = new WebSocket(url);

  wsConnection.on('open', () => {
    if(mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('websocket-connected');
    }
  });

  wsConnection.on('error', (error) => {
    console.error('Main process WebSocket error:', error);
    if(mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('websocket-error', error.message);
    }
  });

  wsConnection.on('close', () => {
    console.log('Main process WebSocket closed.');
    if(mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('websocket-closed');
    }
    wsConnection = null; // 연결이 닫히면 참조 해제
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

app.on('before-quit', (event) => {
  console.log('Main process: before-quit event triggered.');
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
    console.log('Main process: Closing WebSocket before quitting.');
    wsConnection.close(1000, 'Application quitting');
  }
});