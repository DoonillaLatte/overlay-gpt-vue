// src/composables/useWindowControls.js
import { ref, onMounted, onUnmounted } from 'vue'; // ref, onMounted, onUnmounted 임포트

export function useWindowControls() {
  const isMaximized = ref(false); // isMaximized 반응형 상태 추가

  // Electron IPC 렌더러가 사용 가능한 경우에만 이벤트 리스너 등록
  if (window.electron && window.electron.ipcRenderer) {
    onMounted(() => {
      // 메인 프로세스에서 창 최대화/복원 상태 변경 이벤트를 수신
      window.electron.ipcRenderer.on('window-maximized', () => {
        isMaximized.value = true;
      });
      window.electron.ipcRenderer.on('window-unmaximized', () => {
        isMaximized.value = false;
      });

      // 컴포넌트 마운트 시 현재 창의 최대화 상태를 초기화
      // (메인 프로세스에서 'is-maximized' 채널을 통해 현재 상태를 반환하도록 구현되어 있어야 함)
      window.electron.ipcRenderer.invoke('is-maximized').then(maximized => {
        isMaximized.value = maximized;
      }).catch(err => {
        console.error("Failed to get initial window maximized state:", err);
      });
    });

    onUnmounted(() => {
      // 컴포넌트 언마운트 시 이벤트 리스너 정리 (메모리 누수 방지)
      window.electron.ipcRenderer.removeAllListeners('window-maximized');
      window.electron.ipcRenderer.removeAllListeners('window-unmaximized');
    });
  }


  // 창 닫기
  const closeWindow = () => {
    if (window.electron && window.electron.ipcRenderer) { // ipcRenderer 사용 가능 여부 명시
      window.electron.ipcRenderer.send('close-window');
    } else {
      window.close(); // 웹 환경용 폴백
    }
  };

  // 창 최소화
  const minimizeWindow = () => {
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.send('minimize-window');
    }
  };

  // 창 최대화/복원
  const maximizeRestoreWindow = () => {
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.send('maximize-restore-window');
    }
  };

  return {
    isMaximized, // isMaximized 상태를 반환하도록 추가
    closeWindow,
    minimizeWindow,
    maximizeRestoreWindow
  };
}