<script src="./App.js"></script>

<template>
  <div class="container">
    <div class="drag-region">
      <div class="left-section">
        <button class="window-button bold-text" @click="openChatListModal">...</button>
      </div>
      <div class="center-section">
        <h1 class="bold-text">Overlay Helper</h1>
      </div>
      <div class="right-section">
        <button class="window-button bold-text" @click="minimizeWindow">−</button>
        <button class="window-button bold-text" @click="maximizeRestoreWindow">{{ isMaximized ? '🗗' : '□' }}</button>
        <button class="window-button bold-text" @click="closeWindow">X</button>
      </div>
    </div>

    <div class="main-region" ref="chatContainer">
      <div v-if="messages.length === 0 && !isWaitingForResponse" class="initial-screen">
        <div class="logo-container">
          <img src="@/assets/ovhp-logo.png" alt="Overlay Helper Logo" class="app-logo" />
        </div>
        <div class="welcome-message">
          <h2>무엇을 도와드릴까요?</h2>
        </div>
        <div class="connect-button-wrapper">
          <button class="connect-button">다른 앱 연결하기</button>
        </div>
        <div class="action-buttons">
          <button class="action-item">
            <div class="icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M14 2V8H20" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 18V12" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M9 15H15" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <span>내용 추가</span>
          </button>
          <button class="action-item">
            <div class="icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 20H4C3.46957 20 2.96086 19.7893 2.58579 19.4142C2.21071 19.0391 2 18.5304 2 18V6C2 5.46957 2.21071 4.96086 2.58579 4.58579C2.96086 4.21071 3.46957 4 4 4H12L22 14L12 20Z" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M14 6L20 12" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M10 10L14 6" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M17 17L22 12" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M10 14L14 18" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <span>내용 변경</span>
          </button>
          <button class="action-item">
            <div class="icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M21 21L16.65 16.65" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M10 8L12 10" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 8L10 10" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M10 12L12 14" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 12L10 14" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <span>맞춤법 검사</span>
          </button>
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
              <MessageContent v-else-if="message.contentType" :message="message" />
              <span v-else>{{ message.text }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="selected-text-region">
      <h3 class="selected-text-title">선택한 텍스트</h3>
      <p class="selected-text-content">
        선택한 text 영역
      </p>
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
            <path d="M12 5L12 19M12 5L5 12M12 5L19 12" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>

    <ChatListModal
      v-if="showChatListModal"
      :chats="getAllChats()"
      :load-chat="loadChat"
      :delete-chat="deleteChat"
      :start-new-chat="startNewChat"
      @close="handleChatSelectedOrNewChat"
      @chat-selected="handleChatSelectedOrNewChat"
      @new-chat-started="handleChatSelectedOrNewChat"
    />
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