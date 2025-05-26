import { ref, onMounted, nextTick, watch } from 'vue';
import { useChat } from '@/composables/useChat';
import { useSignalR } from '@/composables/useSignalR';
import { useTextarea } from '@/composables/useTextarea';
import { useWindowControls } from '@/composables/useWindowControls';

export default {
  name: 'ChatWindow',
  setup() {
    // Composables 사용
    const chat = useChat();
    const signalR = useSignalR();
    const textarea = useTextarea();
    const windowControls = useWindowControls();

    // Template refs
    const chatContainer = ref(null);
    const promptContainer = ref(null);
    const promptTextarea = ref(null);

    // SignalR 이벤트 핸들러들
    const handleMessageReceived = (data) => {
      chat.processReceivedMessage(data, chatContainer.value);
    };

    const handleReconnecting = (error) => {
      chat.addAssistantMessage('서버와의 연결이 끊어졌습니다. 재연결을 시도합니다...');
      chat.removeLoadingIndicator();
    };

    const handleReconnected = (connectionId) => {
      chat.addAssistantMessage('서버와의 연결이 복구되었습니다.');
      if (signalR.pendingMessage.value) {
        const messageToSend = signalR.pendingMessage.value;
        signalR.pendingMessage.value = null;
        chat.inputMessage.value = messageToSend; 
        handleSendMessage();
      }
    };

    const handleConnectionClosed = (error) => {
      signalR.handleConnectionError(handleConnectionError);
    };

    const handleConnectionError = () => {
      chat.removeLoadingIndicator();
      chat.addAssistantMessage('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
    };

    // 메시지 전송 처리
    const handleSendMessage = async () => {
      if (chat.inputMessage.value.trim() === '' || chat.isWaitingForResponse.value) return;
      
      const userMessage = chat.inputMessage.value;
      chat.addUserMessage(userMessage);
      chat.clearInput();
      chat.setWaitingForResponse(true);
      chat.addLoadingIndicator();

      nextTick(() => {
        chat.scrollToBottom(chatContainer.value);
        textarea.resetTextareaHeight(promptTextarea.value, promptContainer.value);
      });

      if (!signalR.isConnected.value || (signalR.connection.value && signalR.connection.value.state !== 'Connected')) {
        console.log('연결이 끊어져 있습니다. 재연결을 시도합니다...');
        signalR.pendingMessage.value = userMessage;
        chat.removeLoadingIndicator();
        await signalR.setupConnection(handleMessageReceived, handleReconnecting, handleReconnected, handleConnectionClosed, handleConnectionError);
        return;
      }

      try {
        await signalR.sendUserPrompt(userMessage, chat.chatId.value);
      } catch (error) {
        console.error('메시지 전송 중 오류:', error);
        chat.setWaitingForResponse(false);
        chat.removeLoadingIndicator();
        chat.addAssistantMessage('메시지 전송 중 오류가 발생했습니다. 다시 시도해주세요.');
        nextTick(() => {
          chat.scrollToBottom(chatContainer.value);
        });
      }
    };

    // 테스트 메시지 전송 처리
    const handleSendTestMessage = async () => {
      if (!signalR.isConnected.value) {
        console.error('연결이 없습니다');
        chat.addAssistantMessage('서버와의 연결이 끊어졌습니다. 페이지를 새로고침하거나 잠시 후 다시 시도하세요.');
        return;
      }

      try {
        chat.addUserMessage(signalR.testData.value.prompt);
        chat.setWaitingForResponse(true);
        chat.addLoadingIndicator();

        nextTick(() => {
          chat.scrollToBottom(chatContainer.value);
        });

        await signalR.sendTestMessage();
        
      } catch (error) {
        console.error('테스트 메시지 전송 중 오류:', error);
        chat.setWaitingForResponse(false);
        chat.removeLoadingIndicator();
        chat.addAssistantMessage('테스트 메시지 전송 중 오류가 발생했습니다.');
        nextTick(() => {
          chat.scrollToBottom(chatContainer.value);
        });
      }
    };

    // 키보드 이벤트 처리
    const handleKeyDown = (event) => {
      if (event.key === 'Enter') {
        if (event.shiftKey || event.metaKey || event.ctrlKey) {
          return;
        } else {
          event.preventDefault();
          handleSendMessage();
        }
      }
    };

    // Textarea 입력 처리
    const handleInput = () => {
      textarea.handleInput(promptTextarea, promptContainer);
    };

    // 컴포넌트 마운트 시 초기화
    onMounted(async () => {
      await signalR.setupConnection(
        handleMessageReceived,
        handleReconnecting,
        handleReconnected,
        handleConnectionClosed,
        handleConnectionError
      );
      
      nextTick(() => {
        textarea.resetTextareaHeight(promptTextarea.value, promptContainer.value);
      });
    });

    // inputMessage 변경 시 textarea 높이 조정
    watch(() => chat.inputMessage.value, () => {
      nextTick(() => {
        textarea.adjustTextareaHeight(promptTextarea.value, promptContainer.value);
      });
    });

    return {
      // 템플릿에서 사용할 데이터와 메서드들
      ...chat,
      ...windowControls,
      
      // Template refs
      chatContainer,
      promptContainer,
      promptTextarea,
      
      // 이벤트 핸들러들
      handleSendMessage,
      handleSendTestMessage,
      handleKeyDown,
      handleInput
    };
  }
};