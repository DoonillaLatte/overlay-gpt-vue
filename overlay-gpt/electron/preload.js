const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel, data) => {
      // 보안: 허용된 채널만 전송
      const validSendChannels = [
        'close-window',
        'minimize-window',
        'maximize-restore-window',
        'set-window-size',
        'setup-websocket' // WebSocket 설정 채널
      ];
      if (validSendChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      } else {
        console.warn(`Attempted to send on unauthorized channel: ${channel}`);
      }
    },
    on: (channel, func) => {
      // 보안: 허용된 채널만 수신
      const validReceiveChannels = [
        'window-maximized',
        'window-unmaximized',
        'websocket-connected',
        'websocket-error',
        'websocket-closed'
      ];
      if (validReceiveChannels.includes(channel)) {
        // 기존 리스너 제거 방지 및 func 인자 올바르게 전달
        const subscription = (event, ...args) => func(...args);
        ipcRenderer.on(channel, subscription);
        // 리스너를 제거할 수 있는 함수를 반환합니다.
        return () => ipcRenderer.removeListener(channel, subscription);
      } else {
        console.warn(`Attempted to register listener on unauthorized channel: ${channel}`);
        return () => {}; // 아무것도 하지 않는 함수 반환
      }
    },
    // invoke는 요청/응답 패턴에 사용되며, channel을 직접 제한합니다.
    invoke: (channel, ...args) => {
      const validInvokeChannels = [
        'get-window-size',
        'is-maximized' // is-maximized 채널 추가
      ];
      if (validInvokeChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, ...args);
      } else {
        console.warn(`Attempted to invoke on unauthorized channel: ${channel}`);
        return Promise.reject(new Error(`Unauthorized invoke channel: ${channel}`));
      }
    },
    // removeAllListeners는 특정 채널의 모든 리스너를 제거합니다.
    // 사용 시 주의 필요 (필요한 리스너까지 제거할 수 있음)
    // 일반적으로 'on'에서 반환된 함수를 사용하여 개별 리스너를 제거하는 것이 좋습니다.
    removeAllListeners: (channel) => {
      // 보안: 허용된 채널만 모든 리스너 제거
      const validRemoveAllChannels = [
        'window-maximized',
        'window-unmaximized',
        'websocket-connected',
        'websocket-error',
        'websocket-closed'
      ];
      if (validRemoveAllChannels.includes(channel)) {
        ipcRenderer.removeAllListeners(channel);
      } else {
        console.warn(`Attempted to remove all listeners on unauthorized channel: ${channel}`);
      }
    }
  }
});