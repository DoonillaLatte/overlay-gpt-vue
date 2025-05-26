<script src="./App.js"></script>

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
        <button class="window-button bold-text" @click="minimizeWindow">−</button>
        <button class="window-button bold-text" @click="maximizeRestoreWindow">□</button>
        <button class="window-button bold-text" @click="closeWindow">X</button>
      </div>
    </div>
    
    <div class="main-region" ref="chatContainer">
      <div v-if="messages.length === 0 && !isWaitingForResponse" class="empty-chat">
        <div class="welcome-message">
          <h2>무엇을 도와드릴까요?</h2>
        </div>
      </div>
      <div v-else class="chat-messages">
        <div 
          v-for="(message, index) in messages" 
          :key="index" 
          :class="['message-container', message.isUser ? 'user-message' : 'assistant-message', { 'fade-in': message.isNew }]"
        >
          <div class="message-content">
            <div class="message-text">
              <span v-if="message.isLoading" style="color: white; font-size: 20px;">{{ loadingText }}</span>
              <span v-else>{{ message.text }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="test-section">
      <button @click="handleSendTestMessage" class="test-button">테스트 메시지 전송</button>
    </div>
    
    <div class="prompt-region">
      <div class="prompt-container" ref="promptContainer">
        <div class="upload-button-wrapper">
          <button type="button" class="upload-button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19M5 12H19" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          <div class="tooltip">사진 및 파일 추가</div>
        </div>
        <textarea 
          class="prompt" 
          placeholder="메시지 입력..." 
          v-model="inputMessage"
          @keydown="handleKeyDown"
          @input="handleInput"
          rows="1" 
          ref="promptTextarea"
        ></textarea>
        <button 
          type="button" 
          class="submit-button" 
          @click="handleSendMessage"
          :disabled="!inputMessage.trim() || isWaitingForResponse"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5L12 19M12 5L5 12M12 5L19 12" stroke="#303030" stroke-width="5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style src="./App.css"></style>

<style scoped>
.test-section {
  padding: 10px;
  text-align: center;
  border-bottom: 1px solid #ddd;
}

.test-button {
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.test-button:hover {
  background-color: #45a049;
}
</style>