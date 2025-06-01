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
        'websocket-closed',
        'websocket-message', 
        'prepare-to-close' // 필요하다면 이 채널도 추가
      ];
      if (validReceiveChannels.includes(channel)) {
        const subscription = (event, ...args) => func(...args);
        ipcRenderer.on(channel, subscription);
        return () => ipcRenderer.removeListener(channel, subscription);
      } else {
        console.warn(`Attempted to register listener on unauthorized channel: ${channel}`);
        return () => {};
      }
    },
    invoke: (channel, ...args) => {
      const validInvokeChannels = [
        'get-window-size',
        'is-maximized',
      ];
      if (validInvokeChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, ...args);
      } else {
        console.warn(`Attempted to invoke on unauthorized channel: ${channel}`);
        return Promise.reject(new Error(`Unauthorized invoke channel: ${channel}`));
      }
    },
    // removeAllListeners는 특정 채널의 모든 리스너를 제거합니다.
    removeAllListeners: (channel) => {
      // 보안: 허용된 채널만 모든 리스너 제거
      const validRemoveAllChannels = [
        'window-maximized',
        'window-unmaximized',
        'websocket-connected',
        'websocket-error',
        'websocket-closed',
        'websocket-message',
        'prepare-to-close' // 필요하다면 이 채널도 추가
      ];
      if (validRemoveAllChannels.includes(channel)) {
        ipcRenderer.removeAllListeners(channel);
      } else {
        console.warn(`Attempted to remove all listeners on unauthorized channel: ${channel}`);
      }
    }
  }
});