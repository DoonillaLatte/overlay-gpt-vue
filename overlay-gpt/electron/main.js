// main.js

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const WebSocket = require('ws'); // 메인 프로세스에서 직접 WebSocket을 사용하는 경우
const fs = require('node:fs');

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
      //nodeIntegration: true,
      //contextIsolation: false,
      contextIsolation: true,
      webSecurity: process.env.NODE_ENV === 'development' ? false : true // 개발 환경에서만 false 허용, 배포 시에는 반드시 true!
    }
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173/');
    // 개발자 도구 자동 열기 비활성화 (배포 준비)
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 창 닫힘 요청 시 처리
  mainWindow.on('close', (event) => {
    event.preventDefault();
    console.log('Main process: Window close requested, checking WebSocket...');

    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      console.log('Main process: Closing WebSocket connection gracefully.');
      wsConnection.close(1000, 'Application closing');

      const closeTimeout = setTimeout(() => {
        console.log('Main process: WebSocket close timed out. Forcefully destroying window.');
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.destroy();
          mainWindow = null;
        }
      }, 2000);

      wsConnection.on('close', () => {
        console.log('Main process: WebSocket connection closed successfully.');
        clearTimeout(closeTimeout);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.destroy();
          mainWindow = null;
        }
      });
    } else {
      console.log('Main process: WebSocket not open or already closed, destroying window immediately.');
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.destroy();
        mainWindow = null;
      }
    }
  });

  // --- isMaximized 상태 알림 --- (createWindow 함수 안에 그대로 둡니다)
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
} // <--- createWindow 함수 끝

// app.whenReady() 내에서 IPC 핸들러 등록
app.whenReady().then(() => {
  createWindow(); // 윈도우 생성

  // --- 창 제어 IPC 핸들러 ---
  ipcMain.on('minimize-window', () => {
    if(mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.minimize();
    }
  });

  ipcMain.on('maximize-restore-window', () => {
    if(mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMaximized()) {
        mainWindow.restore();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('close-window', () => {
    if(mainWindow && !mainWindow.isDestroyed()) {
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

  ipcMain.handle('get-window-size', async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const bounds = mainWindow.getBounds();
      return { width: bounds.width, height: bounds.height };
    }
    return { width: 0, height: 0 };
  });

  ipcMain.handle('is-maximized', async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      return mainWindow.isMaximized();
    }
    return false;
  });

  ipcMain.handle('dialog:openFile', async (event) => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Documents', extensions: ['ppt', 'xlsx', 'docx', 'hwp'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    if (!canceled) {
      return filePaths[0]; 
    }
    return null;
  });

  ipcMain.handle('dialog:openDirectory', async (event) => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    if (!canceled) {
      return { canceled, filePaths }; // 선택된 폴더의 전체 경로 반환
    }
    return { canceled, filePaths: [] };
  });

  ipcMain.handle('create:newFile', async (event, folderPath, fileName, fileType) => {
      try {
          const fullPath = path.join(folderPath, fileName);
          await fs.promises.writeFile(fullPath, '');
          return fullPath;
      } catch (error) {
          console.error('파일 생성 오류:', error);
          throw error;
      }
  });

  // WebSocket 연결 설정 핸들러
  ipcMain.on('setup-websocket', (event, url) => {
    if (wsConnection) {
      console.log('Main process: Existing WebSocket connection found, closing it.');
      wsConnection.close(1000, 'New connection requested');
      wsConnection = null;
    }

    try {
      wsConnection = new WebSocket(url);

      wsConnection.onopen = () => {
        console.log('Main process: WebSocket connection established.');
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('websocket-connected');
        }
      };

      wsConnection.onmessage = (message) => {
        // console.log('Main process: Received message from WebSocket:', message.data);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('websocket-message', message.data);
        }
      };

      wsConnection.onerror = (error) => {
        console.error('Main process: WebSocket error:', error);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('websocket-error', error.message);
        }
      };

      wsConnection.onclose = (event) => {
        console.log(`Main process: WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}`);
        if(mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('websocket-closed');
        }
        wsConnection = null;
      };
    } catch (error) {
      console.error('Main process: Failed to create WebSocket connection:', error.message);
      if(mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('websocket-error', `WebSocket 생성 실패: ${error.message}`);
      }
    }
  });

  // SignalR 연결 해제 준비 IPC 핸들러 (렌더러 프로세스에서 호출)
  ipcMain.on('signalr-disconnect-ready', () => {
    console.log('Main process: Received signalr-disconnect-ready. No specific action needed in main process for SignalR disconnect.');
    // 메인 프로세스에서 추가적인 로직이 필요하다면 여기에 구현
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// macOS에서 Dock 아이콘 클릭 시 윈도우 재활성화
app.on('activate', function () {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});