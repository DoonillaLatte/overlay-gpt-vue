// src/composables/useChat.js
import { ref, nextTick } from 'vue';

export function useChat() {
  // 상태 관리
  const messages = ref([]);
  const inputMessage = ref('');
  const isWaitingForResponse = ref(false);
  const loadingText = ref('');
  const loadingInterval = ref(null);
  const chatId = ref(1);

  // 로딩 애니메이션
  const startLoadingAnimation = () => {
    let dots = 0;
    loadingText.value = '';
    
    loadingInterval.value = setInterval(() => {
      dots = (dots + 1) % 4;
      loadingText.value = '.'.repeat(dots);
    }, 500);
  };

  const stopLoadingAnimation = () => {
    if (loadingInterval.value) {
      clearInterval(loadingInterval.value);
      loadingInterval.value = null;
      loadingText.value = '';
    }
  };

  const removeLoadingIndicator = () => {
    stopLoadingAnimation();
    const loadingIndex = messages.value.findIndex(msg => msg.id === 'loading-indicator');
    if (loadingIndex !== -1) {
      messages.value.splice(loadingIndex, 1);
    }
  };

  const addLoadingIndicator = () => {
    messages.value.push({
      text: '', 
      isUser: false,
      isLoading: true, 
      id: 'loading-indicator'
    });
    startLoadingAnimation();
  };

  const addUserMessage = (text) => {
    messages.value.push({
      text: text,
      isUser: true
    });
  };

  const addAssistantMessage = (text, isNew = true) => {
    const newMessage = {
      text: text,
      isUser: false,
      isNew: isNew
    };
    messages.value.push(newMessage);
    return newMessage;
  };

  // 스크롤을 맨 아래로
  const scrollToBottom = (chatContainer) => {
    if (chatContainer) {
      nextTick(() => {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      });
    }
  };

  // 메시지 처리 (SignalR에서 받은 데이터 처리)
  const processReceivedMessage = (data, chatContainer) => {
    console.log('받은 메시지:', data);
    
    try {
      let messageData;
      if (typeof data === 'string') {
        messageData = JSON.parse(data);
      } else {
        messageData = data;
      }
    
      console.log('파싱된 메시지 데이터:', messageData);

      removeLoadingIndicator();
    
      let newMessage = null;

      if (messageData.command === 'response_single_generated_response') {
        if (messageData.status === 'success') {
          if (messageData.message === 'pong') {
            console.log('Pong received');
            isWaitingForResponse.value = false;
            return;
          }
          newMessage = addAssistantMessage(messageData.message);
        } else {
          newMessage = addAssistantMessage(`오류: ${messageData.message}`);
        }
      } 
      else if (messageData.message && messageData.message !== 'ping' && messageData.message !== 'pong') {
        newMessage = addAssistantMessage(messageData.message, messageData.isUser || false);
      }
      else if (typeof messageData === 'string' && messageData !== 'ping' && messageData !== 'pong') {
        newMessage = addAssistantMessage(messageData);
      }
      else if (messageData.message !== 'ping' && messageData.message !== 'pong') {
        newMessage = addAssistantMessage(JSON.stringify(messageData, null, 2));
      }

      if (newMessage && chatContainer) {
        nextTick(() => {
          const chatMessagesContainer = chatContainer.querySelector('.chat-messages');
          if (chatMessagesContainer) {
            const messageElement = chatMessagesContainer.lastElementChild;

            if (messageElement) { 
              const onAnimationEnd = () => {
                const messageIndex = messages.value.indexOf(newMessage);
                if (messageIndex !== -1) {
                  messages.value[messageIndex].isNew = false; 
                }
                messageElement.removeEventListener('animationend', onAnimationEnd);
              };
            
              messageElement.addEventListener('animationend', onAnimationEnd);
            }
          }
          scrollToBottom(chatContainer); 
        });
      }
      
      isWaitingForResponse.value = false;

    } catch (error) {
      console.error('메시지 처리 중 오류:', error);
      isWaitingForResponse.value = false;
      removeLoadingIndicator();
      addAssistantMessage(`메시지 처리 오류: ${error.message}`);
      
      if (chatContainer) {
        nextTick(() => {
          scrollToBottom(chatContainer);
        });
      }
    }
  };

  // 입력 초기화
  const clearInput = () => {
    inputMessage.value = '';
  };

  // 대기 상태 설정
  const setWaitingForResponse = (waiting) => {
    isWaitingForResponse.value = waiting;
  };

  const cleanup = () => {
    stopLoadingAnimation();
  };

  return {
    // 상태
    messages,
    inputMessage,
    isWaitingForResponse,
    loadingText,
    chatId,
    
    // 메서드
    startLoadingAnimation,
    stopLoadingAnimation,
    removeLoadingIndicator,
    addLoadingIndicator,
    addUserMessage,
    addAssistantMessage,
    scrollToBottom,
    processReceivedMessage,
    clearInput,
    setWaitingForResponse,
    cleanup
  };
}