// src/composables/useSignalR.js
import { ref, onBeforeUnmount } from 'vue';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

export function useSignalR() {
  const connection = ref(null);
  const isConnected = ref(false);
  const isReconnecting = ref(false);
  const reconnectAttempts = ref(0); 
  const maxReconnectAttempts = ref(5); 
  const pendingMessage = ref(null); // 연결 재시도 시 보류된 메시지
  const keepAliveInterval = ref(null);
  const connectionMonitorInterval = ref(null);

  // 테스트 데이터 
  const testData = ref({
    command: "request_single_generated_response",
    chat_id: null,
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

  // eventHandler 설정
  const setupEventHandlers = (onMessageReceived, onReceiveGeneratedChatId, onReconnecting, onReconnected, onConnectionClosed) => {
    if (!connection.value) return;

    // 일반 메시지 수신 Handler
    connection.value.on('ReceiveMessage', onMessageReceived);
    // generate_chat_id 명령에 대한 응답 수신 Handler
    connection.value.on('ReceiveGeneratedChatId', onReceiveGeneratedChatId);

    // 재연결 시도 Handler
    connection.value.onreconnecting((error) => {
      console.log('재연결 시도 중:', error);
      isConnected.value = false;
      isReconnecting.value = true;
      reconnectAttempts.value++;
      if (onReconnecting) {
        onReconnecting(error);
      }
    });

    // 재연결 성공 Handler
    connection.value.onreconnected((connectionId) => {
      console.log('재연결 성공:', connectionId);
      isConnected.value = true;
      isReconnecting.value = false;
      reconnectAttempts.value = 0; // 재연결 성공 시 시도 횟수 초기화
      if (onReconnected) {
        onReconnected(connectionId);
      }
    });

    // 연결 종료 Handler
    connection.value.onclose((error) => {
      console.log('연결이 종료되었습니다:', error);
      isConnected.value = false;
      isReconnecting.value = false;
      if (onConnectionClosed) {
        onConnectionClosed(error);
      }
    });

    // Electron 환경 처리 (창 닫기 전 SignalR 연결 정리)
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
    console.log('SignalR 연결 성공');
  };

  // 연결 오류 처리
  const handleConnectionError = async (onError) => {
    isConnected.value = false;
    isReconnecting.value = false; // 오류 발생 시 재연결 시도 중 상태 해제
    if (onError) {
      onError();
    }
  };

  // SignalR 연결 설정
  const setupConnection = async (onMessageReceived, onReceiveGeneratedChatId, onReconnecting, onReconnected, onConnectionClosed, onError) => {
    if (isReconnecting.value) {
      console.log('이미 재연결 시도 중입니다. 중복 호출 무시.');
      return;
    }
    if (connection.value && connection.value.state === 'Connected') {
      console.log('SignalR 이미 연결되어 있습니다.');
      isConnected.value = true;
      return;
    }

    isReconnecting.value = true; // 연결 시도 시작
    reconnectAttempts.value = 0; // 초기 연결 시도 횟수 초기화

    try {
      await cleanupConnection(); // 기존 연결 정리

      connection.value = new HubConnectionBuilder()
        .withUrl('http://127.0.0.1:8080/chatHub', {
          skipNegotiation: false,
          transport: 1, // ServerSentEvents로 변경
          withCredentials: true
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            console.log(`자동 재연결 시도 중... (${retryContext.previousRetryCount + 1}회차)`);
            if (retryContext.previousRetryCount >= maxReconnectAttempts.value) {
              console.warn('최대 재연결 시도 횟수를 초과했습니다.');
              isReconnecting.value = false; // 최대 시도 횟수 초과 시 재연결 중 상태 해제
              return null; // 재연결 중단
            }
            const delays = [0, 2000, 5000, 10000, 20000, 30000]; // 재연결 지연 시간
            return delays[retryContext.previousRetryCount] || 30000;
          }
        })
        .configureLogging(LogLevel.Debug)
        .withKeepAliveInterval(60000) // 60초마다 Keep-Alive 메시지 전송
        .build();

      // 이벤트 핸들러 설정
      setupEventHandlers(onMessageReceived, onReceiveGeneratedChatId, onReconnecting, onReconnected, onConnectionClosed);

      await startConnection(); // 연결 시작 시도
      console.log('SignalR 연결 설정 완료');

    } catch (err) {
      console.error('SignalR 연결 설정 중 치명적인 오류:', err);
      // 초기 연결 실패 시 에러 핸들러 호출
      if (onError) {
        onError(err);
      }
    } finally {
      isReconnecting.value = false; // 연결 설정이 완료되거나 오류 발생 시 상태 해제
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
          // console.log('Ping 전송 완료');
        } catch (error) {
          console.error('Ping 전송 실패:', error);
        }
      }
    }, 30000); // 30초마다 Ping 전송
  };

  const sendMessage = async (messageData) => {
    if (!isConnected.value || (connection.value && connection.value.state !== 'Connected')) {
      console.warn('SignalR 연결이 되지 않아 메시지를 보낼 수 없습니다. 재연결을 시도합니다.');
      // 메시지 보류 로직
      pendingMessage.value = messageData;
      throw new Error('연결이 끊어져 있습니다. 재연결 중...');
    }

    try {
      // console.log('SignalR로 메시지 전송:', messageData);
      await connection.value.invoke('SendMessage', messageData);
      // 메시지 전송 성공 후 pendingMessage 초기화
      pendingMessage.value = null;
    } catch (error) {
      console.error('메시지 전송 중 오류:', error);
      throw error; // 호출하는 쪽에서 오류를 처리할 수 있도록 throw
    }
  };

  // 사용자 프롬프트 전송
  const sendUserPrompt = async (prompt, chatId) => {
    const messageData = {
      command: 'send_user_prompt',
      chat_id: chatId, // useChat에서 받은 chatId 사용
      prompt: 'whats your name',
      request_type: 1,
      description: '',
      current_program: null,
      target_program: null,
      timestamp: new Date().toISOString()
    };

    return await sendMessage(messageData);
  };

  // 테스트 메시지 전송
  const sendTestMessage = async (chatId) => {
    // testData.value에 현재 chatId 할당
    const messageToSend = { ...testData.value, chat_id: chatId };
    return await sendMessage(messageToSend);
  };

  // 응답 적용 (Flask에 apply_response 명령 전송)
  const applyResponse = async (chatId) => {
    const messageData = {
      command: 'apply_response',
      chat_id: chatId,
      timestamp: new Date().toISOString()
    };

    return await sendMessage(messageData);
  };

  // 응답 취소 (Flask에 cancel_response 명령 전송)
  const cancelResponse = async (chatId) => {
    const messageData = {
      command: 'cancel_response',
      chat_id: chatId,
      timestamp: new Date().toISOString()
    };

    return await sendMessage(messageData);
  };

  // 정리 함수 (컴포넌트 언마운트 또는 수동 호출 시)
  const cleanup = async () => {
    // Keep-Alive 및 모니터링 인터벌 정리
    if (keepAliveInterval.value) {
      clearInterval(keepAliveInterval.value);
      keepAliveInterval.value = null;
    }
    if (connectionMonitorInterval.value) {
      clearInterval(connectionMonitorInterval.value);
      connectionMonitorInterval.value = null;
    }
    
    // Electron 환경에서 메인 프로세스에 연결 해제 준비 알림
    if (window.electron && connection.value && connection.value.state === 'Connected') {
      console.log('Renderer process: Notifying main process to prepare for SignalR disconnect.');
      window.electron.ipcRenderer.send('signalr-disconnect-ready');
      await new Promise(resolve => setTimeout(resolve, 200)); // 메인 프로세스 처리 시간을 위해 잠시 대기
    }
    
    await cleanupConnection(); // SignalR 연결 자체를 중지
    console.log('Renderer process: SignalR connection cleaned up in useSignalR.');
  };

  // 컴포넌트 언마운트 시 cleanup 함수 자동 호출
  onBeforeUnmount(async () => {
    await cleanup();
  });

  return {
    connection, 
    isConnected,
    isReconnecting,
    reconnectAttempts,
    maxReconnectAttempts,
    pendingMessage,
    testData,

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