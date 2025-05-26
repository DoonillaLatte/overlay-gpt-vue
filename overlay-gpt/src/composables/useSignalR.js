// src/composables/useSignalR.js
import { ref, onBeforeUnmount } from 'vue';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

export function useSignalR() {
  const connection = ref(null);
  const isConnected = ref(false);
  const isReconnecting = ref(false);
  const reconnectAttempts = ref(0);
  const maxReconnectAttempts = ref(5);
  const pendingMessage = ref(null);
  const keepAliveInterval = ref(null);
  const connectionMonitorInterval = ref(null);

  // 테스트 데이터
  const testData = ref({
    command: "request_single_generated_response",
    chat_id: 1,
    prompt: "엑셀 파일의 A1 셀에 'Hello'를 입력하고 B1 셀에 'World'를 입력해주세요.",
    request_type: 1,
    description: "엑셀 파일에 텍스트 입력 요청",
    current_program: {
      id: 12345,
      type: "excel",
      context: "현재 열려있는 엑셀 파일의 내용"
    },
    target_program: {
      id: 12345,
      type: "excel",
      context: "수정할 엑셀 파일의 내용"
    }
  });

  // 연결 정리
  const cleanupConnection = async () => {
    if (keepAliveInterval.value) {
      clearInterval(keepAliveInterval.value);
      keepAliveInterval.value = null;
    }

    if (connection.value) {
      try {
        await connection.value.stop();
        console.log('SignalR 연결 중지됨.');
      } catch (error) {
        console.error('SignalR 연결 정리 중 오류:', error);
      }
      connection.value = null;
    }
    isConnected.value = false;
  };

  // 이벤트 핸들러 설정
  const setupEventHandlers = (onMessageReceived, onReconnecting, onReconnected, onConnectionClosed) => {
    if (!connection.value) return;

    // 메시지 수신 핸들러
    connection.value.on('ReceiveMessage', onMessageReceived);

    // 재연결 시도 핸들러
    connection.value.onreconnecting((error) => {
      console.log('재연결 시도 중:', error);
      isConnected.value = false;
      if (onReconnecting) {
        onReconnecting(error);
      }
    });

    // 재연결 성공 핸들러
    connection.value.onreconnected((connectionId) => {
      console.log('재연결 성공:', connectionId);
      isConnected.value = true;
      isReconnecting.value = false;
      if (onReconnected) {
        onReconnected(connectionId);
      }
    });

    // 연결 종료 핸들러
    connection.value.onclose((error) => {
      console.log('연결이 종료되었습니다:', error);
      if (onConnectionClosed) {
        onConnectionClosed(error);
      }
    });

    // Electron 환경 처리
    if (window.electron) {
      window.electron.ipcRenderer.on('prepare-to-close', async () => {
        console.log('Renderer process: Received prepare-to-close from main process. Cleaning up SignalR connection...');
        await cleanupConnection();
      });
    }
  };

  // 연결 시작
  const startConnection = async () => {
    if (!connection.value) {
      throw new Error('Connection not initialized');
    }

    await connection.value.start();
    isConnected.value = true;
    reconnectAttempts.value = 0;

    startKeepAlive();
  };

  // 연결 오류 처리
  const handleConnectionError = async (onError) => {
    isConnected.value = false;
    if (onError) {
      onError();
    }

    setTimeout(async () => {
      if (!isConnected.value && !isReconnecting.value) {
        await setupConnection();
      }
    }, 5000);
  };

  // SignalR 연결 설정
  const setupConnection = async (onMessageReceived, onReconnecting, onReconnected, onConnectionClosed, onError) => {
    if (isReconnecting.value) {
      return;
    }

    isReconnecting.value = true;

    try {
      await cleanupConnection();

      connection.value = new HubConnectionBuilder()
        .withUrl('http://127.0.0.1:8080/chatHub', {
          skipNegotiation: false,
          transport: 0,
          withCredentials: false
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            if (retryContext.previousRetryCount >= 5) {
              isReconnecting.value = false;
              return null;
            }
            const delays = [0, 2000, 5000, 10000, 20000, 30000];
            return delays[retryContext.previousRetryCount] || 30000;
          }
        })
        .configureLogging(LogLevel.Debug)
        .withKeepAliveInterval(60000)
        .build();

      setupEventHandlers(onMessageReceived, onReconnecting, onReconnected, onConnectionClosed);
      await startConnection();

    } catch (err) {
      console.error('SignalR 연결 설정 중 오류:', err);
      await handleConnectionError(onError);
    } finally {
      isReconnecting.value = false;
    }
  };

  // Keep Alive 시작
  const startKeepAlive = () => {
    if (keepAliveInterval.value) {
      clearInterval(keepAliveInterval.value);
    }

    keepAliveInterval.value = setInterval(async () => {
      if (isConnected.value && connection.value && connection.value.state === 'Connected') {
        try {
          await connection.value.invoke('Ping');
        } catch (error) {
          console.error('Ping 실패:', error);
          await handleConnectionError();
        }
      }
    }, 30000);
  };

  // 메시지 전송
  const sendMessage = async (messageData) => {
    if (!isConnected.value || (connection.value && connection.value.state !== 'Connected')) {
      throw new Error('연결이 끊어져 있습니다.');
    }

    try {
      await connection.value.invoke('SendMessage', messageData);
    } catch (error) {
      console.error('메시지 전송 중 오류:', error);
      throw error;
    }
  };

  // 사용자 프롬프트 전송
  const sendUserPrompt = async (prompt, chatId) => {
    const messageData = {
      command: 'send_user_prompt',
      chat_id: chatId,
      prompt: prompt,
      request_type: 1,
      description: '',
      current_program: null,
      target_program: null
    };

    return await sendMessage(messageData);
  };

  // 테스트 메시지 전송
  const sendTestMessage = async () => {
    return await sendMessage(testData.value);
  };

  // 응답 적용
  const applyResponse = async (chatId) => {
    const messageData = {
      command: 'apply_response',
      chat_id: chatId
    };

    return await sendMessage(messageData);
  };

  // 응답 취소
  const cancelResponse = async (chatId) => {
    const messageData = {
      command: 'cancel_response',
      chat_id: chatId
    };

    return await sendMessage(messageData);
  };

  // 정리 함수
  const cleanup = async () => {
    if (keepAliveInterval.value) {
      clearInterval(keepAliveInterval.value);
    }
    if (connectionMonitorInterval.value) {
      clearInterval(connectionMonitorInterval.value);
    }
    
    if (window.electron && connection.value && connection.value.state === 'Connected') {
      console.log('Renderer process: Notifying main process to prepare for SignalR disconnect.');
      window.electron.ipcRenderer.send('signalr-disconnect-ready');
      await new Promise(resolve => setTimeout(resolve, 200)); 
    }
    
    await cleanupConnection(); 
    console.log('Renderer process: SignalR connection cleaned up in beforeUnmount.');
  };

  // 컴포넌트 언마운트 시 정리
  onBeforeUnmount(async () => {
    await cleanup();
  });

  return {
    // 상태
    connection,
    isConnected,
    isReconnecting,
    reconnectAttempts,
    maxReconnectAttempts,
    pendingMessage,
    testData,

    // 메서드
    setupConnection,
    cleanupConnection,
    sendMessage,
    sendUserPrompt,
    sendTestMessage,
    applyResponse,
    cancelResponse,
    handleConnectionError,
    cleanup
  };
}