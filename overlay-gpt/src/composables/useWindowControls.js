// src/composables/useWindowControls.js

export function useWindowControls() {
  // 창 닫기
  const closeWindow = () => {
    if (window.electron) {
      // 메인 프로세스에 닫기 요청
      window.electron.ipcRenderer.send('close-window');
    } else {
      window.close();
    }
  };

  // 창 최소화
  const minimizeWindow = () => {
    if (window.electron) {
      window.electron.ipcRenderer.send('minimize-window');
    }
  };

  // 창 최대화/복원
  const maximizeRestoreWindow = () => {
    if (window.electron) {
      window.electron.ipcRenderer.send('maximize-restore-window');
    }
  };

  return {
    closeWindow,
    minimizeWindow,
    maximizeRestoreWindow
  };
}