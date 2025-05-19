<script>
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
        this.socket.close();
      }

      // web socket 연결 성정
      this.socket = new WebSocket('ws://localhost:5000');

      // socket 연결 성공 event
      this.socket.onopen = () => {
        console.log('소켓 연결 성공');
        this.isSocketConnected = true;
        this.reconnectAttempts = 0;
      };

      // socket 메시지 수신 이벤트
      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          // 명령어에 따른 처리
          if(message.command === 'display_text') {
            // 서버가 전송한 text 표시
            this.messages.push({
              text: message.text,
              isUser: false
            });
          }
          else if(message.command === 'response_success') {
            // 성공 응답 처리
            this.messages.push({
              text: message.response,
              isUser: false
            });
            this.isWaitingForResponse = false;
          }
          else if(message.command === 'response_failure') {
            // 실패 응답 처리
            this.messages.push({
              text: `오류: ${message.error}`,
              isUser: false
            });
            this.isWaitingForResponse = false;
          }

          this.$nextTick(() => {
            this.scrollToBottom();
          });
        } catch(error) {
          console.error('소켓 메시지 처리 중 오류:', error);
        }
      };

      // socket 오류 이벤트
      this.socket.onerror = (error) => {
        console.error('소켓 오류: ', error);
        this.isSocketConnected = false;
      };

      // socket 연결 종료 이벤트
      this.socket.onclose = () => {
        console.log('소켓 연결 종료');
        this.isSocketConnected = false;

        // 자동 재연결 시도
        if(this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`소켓 재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
          setTimeout(() => {
            this.setupSocketConnection();
          }, 3000);
        } else {
          console.error('최대 재연결 시도 횟수 초과');
        }
      }
    },

    // 메시지 출력
    sendMessage() {
      if (this.inputMessage.trim() === '' || this.isWaitingForResponse) return;
      
      // 사용자 메시지 UI에 추가
      this.messages.push({
        text: this.inputMessage,
        isUser: true,
        // 당장은 시간은 필요 X
        // timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });

      const userMessage = this.inputMessage;
      this.inputMessage = '';

    // 소켓이 연결되어 있는지 확인
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

    // 소켓 통신을 통해 메시지 전송
    try {
      this.isWaitingForResponse = true;

      // send_user_prompt
      const messageData = {
        command : 'send_user_prompt',
        chat_id: this.chatId,
        prompt: userMessage,
        target_program: null
      };

      this.socket.send(JSON.stringify(messageData));

      this.$nextTick(() => {
        this.scrollToBottom();
      });
    } catch(error) {
      console.error('메시지 전송 중 오류:', error);
      this.isWaitingForResponse = false;

      // 오류 메시지 표시
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

        this.socket.send(JSON(stringify(messageData)));
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

        this.socket.send(JSON(stringify(messageData)));
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
      this.socket.close();
    }
  }
}
</script>

<template>
  <div class="container">
    <div class="drag-region">
      <div class="left-section">
        <button class="window-button bold-text">...</button>
      </div>
      <div class="center-section">
        <h1 class="bold-text">Overlay Helper</h1>
      </div>
      <div class="right-section">
        <button class="window-button bold-text">−</button>
        <button class="window-button bold-text">□</button>
        <button class="window-button bold-text" @click="closeWindow">X</button>
      </div>
    </div>
    
    <div class="main-region" ref="chatContainer">
      <!-- 초기 화면 : message가 없을 때 -->
      <div v-if="messages.length === 0" class="empty-chat">
        <div class="welcome-message">
          <h2>무엇을 도와드릴까요?</h2>
        </div>
      </div>
      <!-- message 입력 후-->
      <div v-else class="chat-messages">
        <div 
          v-for="(message, index) in messages" 
          :key="index" 
          :class="['message-container', message.isUser ? 'user-message' : 'assistant-message']"
        >
          <div class="message-content">
            <div class="message-text">{{ message.text }}</div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="prompt-region">
      <div class="prompt-container">
        <div class="upload-button-wrapper">
          <button type="button" class="upload-button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19M5 12H19" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          <div class="tooltip">사진 및 파일 추가</div>
        </div>
        <input 
          type="text" 
          class="prompt" 
          placeholder="메시지 입력..." 
          v-model="inputMessage"
          @keydown="handleKeyDown"
        >
        <button type="button" class="submit-button" @click="sendMessage">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5L12 19M12 5L5 12M12 5L19 12" stroke="#303030" stroke-width="5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style src="./App.css"></style>