// src/composables/useSocket.js
import { ref, onBeforeUnmount } from 'vue';

export function useSocket() {
  const socket = ref(null);
  const isSocketConnected = ref(false);
  const reconnectAttempts = ref(0);
  const maxReconnectAttempts = ref(5);

  // Socket 메시지 처리
  const handleSocketMessage = (event, onMessageReceived, scrollToBottom) => {
    try {
      const message = JSON.parse(event.data);
      
        // 명령어에 따른 처리
        if (message.command === 'display_text') {
          // 구조화된 데이터를 chat composable로 전달
          onMessageReceived(message, 'display_text'); // 타입 정보 추가
        }
        else if (message.command === 'response_success') {
        // 성공 응답 처리
        const newMessage = {
          text: message.response,
          isUser: false
        };
        onMessageReceived(newMessage);
        }
        else if (message.command === 'response_failure') {
        // 실패 응답 처리
        const newMessage = {
          text: `오류: ${message.error}`,
          isUser: false
        };
        onMessageReceived(newMessage);
        }

        // 스크롤을 맨 아래로
        if (scrollToBottom) {
          scrollToBottom();
        }
    } catch (error) {
      console.error('소켓 메시지 처리 중 오류:', error);
    }
  };

  // Socket 연결 설정
  const setupSocket = (socketUrl, onMessageReceived, scrollToBottom) => {
    try {
      socket.value = new WebSocket(socketUrl);
      
      socket.value.onopen = () => {
        console.log('Socket 연결 성공');
        isSocketConnected.value = true;
        reconnectAttempts.value = 0;
      };

      socket.value.onmessage = (event) => {
        handleSocketMessage(event, onMessageReceived, scrollToBottom);
      };

      socket.value.onclose = (event) => {
        console.log('Socket 연결 종료:', event);
        isSocketConnected.value = false;
        
        // 자동 재연결 시도
        if (reconnectAttempts.value < maxReconnectAttempts.value) {
          reconnectAttempts.value++;
          console.log(`Socket 재연결 시도 ${reconnectAttempts.value}/${maxReconnectAttempts.value}`);
          
          setTimeout(() => {
            setupSocket(socketUrl, onMessageReceived, scrollToBottom);
          }, 2000 * reconnectAttempts.value); // 재연결 간격을 점진적으로 증가
        } else {
          console.error('Socket 최대 재연결 시도 횟수 초과');
        }
      };

      socket.value.onerror = (error) => {
        console.error('Socket 연결 오류:', error);
        isSocketConnected.value = false;
      };

    } catch (error) {
      console.error('Socket 설정 중 오류:', error);
    }
  };

  // Socket 메시지 전송
  const sendSocketMessage = (message) => {
    if (socket.value && isSocketConnected.value && socket.value.readyState === WebSocket.OPEN) {
      try {
        const messageData = typeof message === 'string' ? message : JSON.stringify(message);
        socket.value.send(messageData);
        return true;
      } catch (error) {
        console.error('Socket 메시지 전송 오류:', error);
        return false;
      }
    } else {
      console.error('Socket이 연결되지 않았습니다');
      return false;
    }
  };

  // Socket 연결 종료
  const closeSocket = () => {
    if (socket.value) {
      socket.value.close();
      socket.value = null;
      isSocketConnected.value = false;
    }
  };

  // 정리 함수
  const cleanup = () => {
    closeSocket();
  };

  // 컴포넌트 언마운트 시 정리
  onBeforeUnmount(() => {
    cleanup();
  });

  return {
    // 상태
    socket,
    isSocketConnected,
    reconnectAttempts,
    maxReconnectAttempts,

    // 메서드
    setupSocket,
    sendSocketMessage,
    closeSocket,
    handleSocketMessage,
    cleanup
  };
}