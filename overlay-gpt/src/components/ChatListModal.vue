<template>
  <div class="modal-overlay" @click.self="closeModal">
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title bold-text">채팅 목록</h3>
        <button class="close-button" @click="closeModal">X</button>
      </div>
      <div class="chat-list-wrapper">
        <button class="new-chat-button bold-text" @click="handleNewChat">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5V19M5 12H19" stroke="white" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>새로운 채팅</span>
        </button>
        <ul class="chat-list">
          <li v-if="sortedChats.length === 0" class="no-chats-message normal-text">
            저장된 대화가 없습니다.
          </li>
          <li v-for="chat in sortedChats" :key="chat.id" class="chat-list-item">
            <button class="chat-item-button normal-text" @click="selectChat(chat.id)">
              <span class="chat-title">{{ chat.title }}</span>
              <span class="chat-date">{{ formatDate(chat.lastUpdated) }}</span>
            </button>
            <button class="delete-chat-button" @click.stop="deleteChat(chat.id)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, computed } from 'vue';

const props = defineProps({
  chats: {
    type: Array,
    required: true
  },
  loadChat: {
    type: Function,
    required: true
  },
  startNewChat: {
    type: Function,
    required: true
  }
});

const emit = defineEmits(['close', 'chat-selected', 'new-chat-started', 'delete-chat']);

const sortedChats = computed(() => {
  return [...props.chats].sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
});

const closeModal = () => {
  emit('close');
};

const selectChat = (chatId) => {
  props.loadChat(chatId);
  emit('chat-selected', chatId);
  closeModal();
};

const handleNewChat = () => {
  props.startNewChat();
  emit('new-chat-started');
  closeModal();
};

const deleteChat = (chatId) => {
  if(confirm('채팅을 삭제하시겠습니까?')) {
    emit('delete-chat', chatId);
  }
}

const formatDate = (isoString) => {
  const date = new Date(isoString);
  const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
  return date.toLocaleString('ko-KR', options);
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6); 
  border-radius: 15px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto;
  z-index: 1000;
}

.modal-content {
  background-color: #2a2a2a; 
  border-radius: 15px;
  padding-top: 0px;
  max-width: 370px;
  max-height: 80%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  padding: 10px 20px;
  border-bottom: 1px solid #3a3a3a;
  margin-bottom: 10px;
}

.modal-title {
  color: #ffffff;
  font-size: 18px;
  margin: 0;
  text-align: center;
  flex-grow: 1; 
}

.close-button {
  background: none;
  border: none;
  color: #ffffff;
  font-size: 20px;
  cursor: pointer;
  padding: 5px;
  border-radius: 5px;
  transition: background-color 0.2s ease;
  /* Removed margin-left: auto; as flex-grow on title handles positioning */
}

.close-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.chat-list-wrapper {
  flex-grow: 1;
  overflow-y: auto;
  padding: 15px 20px;
}

.chat-list-wrapper::-webkit-scrollbar {
  width: 8px;
}

.chat-list-wrapper::-webkit-scrollbar-thumb {
  background-color: #424242;
  border-radius: 4px;
}

.chat-list-wrapper::-webkit-scrollbar-track {
  background-color: #2a2a2a;
}

.chat-list-wrapper::-webkit-scrollbar-thumb:hover {
  background-color: #929292;
}

.new-chat-button {
  width: 50%;
  background-color: #2a2a2a;
  color: white;
  border: solid white 2px;
  padding: 12px 15px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 15px;
  margin-left: auto;
  margin-right: auto;
  transition: background-color 0.2s ease;
}

.new-chat-button:hover {
  background-color: #4c4c4c;
}

.new-chat-button svg {
  stroke: white;
}

.chat-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.chat-list li.chat-list-item:hover{
  background: #4c4c4c;
  transition: background-color 0.2s ease;
}

.no-chats-message {
  color: #888;
  text-align: center;
  padding: 20px;
}

.no-chats-message {
  color: #888;
  text-align: center;
  padding: 20px;
}

.chat-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #383838;
  border-radius: 10px;
  margin-bottom: 10px;
  overflow: hidden;
}

.chat-item-button {
  flex-grow: 1;
  background: none;
  border: none;
  color: #e0e0e0;
  text-align: left;
  padding: 12px 15px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  transition: background-color 0.2s ease;
  font-size: 14px;
}

.chat-title {
  font-weight: 500;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 250px;
}

.chat-date {
  font-size: 12px;
  color: #aaaaaa;
}

.delete-chat-button {
  background: none;
  border: none;
  color: #aaaaaa;
  cursor: pointer;
  padding: 10px;
  transition: color 0.2s ease;
}

.delete-chat-button:hover {
  color: #ff6666;
}
</style>