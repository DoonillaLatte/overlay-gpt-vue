import { io } from 'socket.io-client';

export default {
  data() {
    return {
      messages: [],
      inputMessage: '',
      chatId: 1, // 채팅 id (임의로 설정)
      isWaitingForResponse: false,
      socket: null,
      isSocketConnected: false,
      reconnectAttempts: 0,
      maxReconnectAttempts: 5,
    }
  },
  methods: {
    // 창 닫기
    closeWindow() {
      window.close();
    },

    // socket 연결 설정
    setupSocketConnection() {
      if(this.socket) {
        this.socket.disconnect();
      }

      // Socket.IO 연결 설정
      this.socket = io('http://127.0.0.1:5000', {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 3000
      });

      // 연결 성공 이벤트
      this.socket.on('connect', () => {
        console.log('소켓 연결 성공');
        this.isSocketConnected = true;
        this.reconnectAttempts = 0;
      });

      // 메시지 수신 이벤트
      this.socket.on('message_response', (message) => {
        try {
          if(message.status === 'success') {
            this.messages.push({
              text: message.message,
              isUser: false
            });
          } else {
            this.messages.push({
              text: `오류: ${message.message}`,
              isUser: false
            });
          }
          this.isWaitingForResponse = false;
          this.$nextTick(() => {
            this.scrollToBottom();
          });
        } catch(error) {
          console.error('소켓 메시지 처리 중 오류:', error);
        }
      });

      // 연결 오류 이벤트
      this.socket.on('connect_error', (error) => {
        console.error('소켓 연결 오류: ', error);
        this.isSocketConnected = false;
      });

      // 연결 종료 이벤트
      this.socket.on('disconnect', () => {
        console.log('소켓 연결 종료');
        this.isSocketConnected = false;
      });
    },

    // 메시지 출력
    sendMessage() {
      if (this.inputMessage.trim() === '' || this.isWaitingForResponse) return;
      
      this.messages.push({
        text: this.inputMessage,
        isUser: true
      });

      const userMessage = this.inputMessage;
      this.inputMessage = '';

      if(!this.isSocketConnected) {
        console.error('소켓 연결이 없습니다');
        this.messages.push({
          text:'서버와의 연결이 끊어졌습니다. 페이지를 새로고침하거나 잠시 후 다시 시도하세요.',
        });
        this.$nextTick(() => {
          this.scrollToBottom();
        });
        return;
      }

      try {
        this.isWaitingForResponse = true;

        const messageData = {
          command: 'send_user_prompt',
          content: {
            chat_id: this.chatId,
            prompt: userMessage,
            request_type: 1,
            description: '',
            current_program: null,
            target_program: null
          }
        };

        this.socket.emit('message', messageData);

        this.$nextTick(() => {
          this.scrollToBottom();
        });
      } catch(error) {
        console.error('메시지 전송 중 오류:', error);
        this.isWaitingForResponse = false;
        this.messages.push({
          text: '메시지 전송 중 오류가 발생했습니다. 다시 시도해주세요.',
          isUser: false
        });
        this.$nextTick(() => {
          this.scrollToBottom();
        });
      }
    },

    scrollToBottom() {
      const chatContainer = this.$refs.chatContainer;
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    },
    handleKeyDown(event) {
      // shift + enter 눌렀을 때 한줄 아래로 내려가는 기능 구현 필요
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        this.sendMessage();
      }
    },

    // 응답 적용 요청
    applyResponse() {
      if(!this.isSocketConnected) {
        console.error('소켓 연결이 없습니다');
        return;
      }

      try {
        // apply_response
        const messageData = {
          command: 'apply_response',
          chat_id: this.chatId
        };

        this.socket.emit('message', messageData);
      } catch(error) {
        console.error('응답 적용 요청 중 오류:', error);
      }
    },

    // 응답 취소 요청
    cancleResponse() {
      if(!this.isSocketConnected) {
        console.error('소켓 연결이 없습니다');
        return;
      }

      try {
        // apply_response
        const messageData = {
          command: 'apply_response',
          chat_id: this.chatId
        };

        this.socket.emit('message', messageData);
      } catch(error) {
        console.error('응답 취소 요청 중 오류:', error);
      }
    }
  },
  // component mount시 socket 연결 설정
  mounted() {
    this.setupSocketConnection();
  },

  // unmounte 시 socket 연결  종료
  beforeUnmount() {
    if(this.socket && this.isSocketConnected) {
      this.socket.disconnect();
    }
  }
}