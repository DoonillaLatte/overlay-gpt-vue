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
      <ChatListModal
        v-if="showChatListModal"
        :chats="allChats"
        :load-chat="loadChat"
        :start-new-chat="startNewChat"
        @close="showChatListModal = false"
        @chat-selected="handleChatSelectedOrNewChat"
        @new-chat-started="handleChatSelectedOrNewChat"
        @delete-chat="handleDeleteChatFromModal"
      />
    </div>

    <div class="main-region" ref="chatContainer">
      <div v-if="messages.length === 0 && !selectedTextFromContext" class="initial-screen">
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
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                  <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                    <g id="SVGRepo_iconCarrier">
                    <g id="Edit / Edit_Pencil_02">
                    <path id="Vector" d="M4 16.0001V20.0001L8 20.0001L18.8686 9.13146L18.8695 9.13061C19.265 8.73516 19.4628 8.53736 19.5369 8.3092C19.6021 8.10835 19.6022 7.89201 19.5369 7.69117C19.4627 7.46284 19.2646 7.26474 18.8686 6.86872L17.1288 5.12892C16.7345 4.7346 16.5369 4.53704 16.3091 4.46301C16.1082 4.39775 15.8919 4.39775 15.691 4.46301C15.463 4.53709 15.2652 4.73488 14.8704 5.12976L14.8686 5.13146L4 16.0001Z" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
                  </g>
                </g>
              </svg>
            </div>
            <span>내용 변경</span>
          </button>
          <button class="action-item">
            <div class="icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="11" cy="11" r="8" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M17.5 17.5L22 22" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
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
            <div v-if="!message.isUser && message.title" class="message-title">
              {{ message.title }}
            </div>
            <div class="message-text">
              <span v-if="message.isLoading" style="color: white; font-size: 20px;">{{ loadingText }}</span>
              <span v-else-if="message.contentType === 'text_plain' || !message.contentType">{{ message.text }}</span>
              <span v-else-if="message.contentType">{{ message.content || message.text }}</span>
              <span v-else>{{ message.text }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="selectedTextFromContext" class="selected-text-region">
      <h3 class="selected-text-title">선택한 텍스트</h3>
      <div class="selected-text-content">
        <span v-if="isHtmlContent(selectedTextFromContext)" v-html="selectedTextFromContext"></span>
        <p v-else>{{ selectedTextFromContext }}</p>
      </div>
    </div>

    <div class="prompt-region">
      <div class="prompt-container" ref="promptContainer">
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
      :chats="allChats"
      :load-chat="loadChat"
      :start-new-chat="startNewChat"
      @close="showChatListModal = false"
      @chat-selected="handleChatSelectedOrNewChat"
      @new-chat-started="handleChatSelectedOrNewChat"
      @delete-chat="handleDeleteChatFromModal"
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