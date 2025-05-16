<script>
export default {
  data() {
    return {
      messages: [],
      inputMessage: ''
    }
  },
  methods: {
    closeWindow() {
      window.close();
    },
    sendMessage() {
      if (this.inputMessage.trim() === '') return;
      
      // Add user message
      this.messages.push({
        text: this.inputMessage,
        isUser: true,
        // 당장은 시간은 필요 X
        // timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      
      // Clear input
      const userMessage = this.inputMessage;
      this.inputMessage = '';
      
      // Simulate response (would be replaced with actual API call)
      setTimeout(() => {
        this.messages.push({
          text: `응답: "${userMessage}"에 대한 답변입니다.`,
          isUser: false,
          // 당장은 시간은 필요 X
          // timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        
        this.$nextTick(() => {
          this.scrollToBottom();
        });
      }, 1000);
      
      this.$nextTick(() => {
        this.scrollToBottom();
      });
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