// App.js
import { ref, onMounted, nextTick, watch, onUnmounted } from 'vue'; // onUnmounted import 추가
import { useChat } from '@/composables/useChat';
import { useSignalR } from '@/composables/useSignalR';
import { useSocket } from '@/composables/useSocket'; 
import { useTextarea } from '@/composables/useTextarea';
import { useWindowControls } from '@/composables/useWindowControls';
import MessageContent from '@/components/MessageContent.vue';

export default {
  name: 'ChatWindow',
  components: {
    MessageContent
  },
  setup() {
    // Composables
    const signalR = useSignalR();
    const chat = useChat(signalR.connection); 

    const socket = useSocket(); 
    const textarea = useTextarea();
    const windowControls = useWindowControls();

    // Template refs
    const chatContainer = ref(null);
    const promptContainer = ref(null);
    const promptTextarea = ref(null);

    // Socket.io 이벤트 핸들러
    // const handleSocketMessage = (messageData) => {
    //   chat.processSocketMessage(messageData, chatContainer.value);
    // };
    // const scrollToBottomHandler = () => {
    //   chat.scrollToBottom(chatContainer.value);
    // };

    // SignalR 이벤트 핸들러들
    const handleMessageReceived = (data) => {
      chat.processReceivedMessage(data, chatContainer.value);
    };

    const handleReceiveGeneratedChatId = (data) => {
      // chat_id 생성 응답 메시지 처리
      chat.processGeneratedChatId(data);
    };

    const handleReconnecting = (error) => {
      chat.addAssistantMessage('서버와의 연결이 끊어졌습니다. 재연결을 시도합니다...');
      chat.removeLoadingIndicator();
    };

    const handleReconnected = (connectionId) => {
      chat.addAssistantMessage('서버와의 연결이 복구되었습니다.');
      if (signalR.pendingMessage.value) {
        console.log('보류 중인 메시지를 재전송합니다.');
        const messageToSend = signalR.pendingMessage.value;
        signalR.pendingMessage.value = null; // 보류 메시지 초기화
        
        // 보류 메시지가 사용자 프롬프트였다면 inputMessage에 다시 설정하여 전송
        if (messageToSend && messageToSend.command === 'send_user_prompt') {
            chat.inputMessage.value = messageToSend.prompt;
            handleSendMessage(); // 재전송
        } else {
            // 다른 종류의 보류 메시지 처리
            signalR.sendMessage(messageToSend)
                .catch(err => console.error('보류 메시지 재전송 실패:', err));
        }
      }
      // 재연결 후 chatId가 없는 경우 다시 요청 (페이지 로드 후 처음 연결된 경우)
      if (chat.chatId.value === null) {
        chat.generateAndSendChatId();
      }
    };

    const handleConnectionClosed = (error) => {
      chat.removeLoadingIndicator();
      chat.addAssistantMessage('서버 연결이 완전히 종료되었습니다. 앱을 재시작해야 할 수 있습니다.');
      console.error('SignalR 연결 종료:', error);
    };

    const handleConnectionError = (error) => {
      chat.removeLoadingIndicator();
      chat.addAssistantMessage(`서버 연결에 오류가 발생했습니다: ${error?.message || '알 수 없는 오류'}. 잠시 후 다시 시도해주세요.`);
      console.error('SignalR 연결 오류:', error);
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

      try {
        // SignalR 훅의 sendUserPrompt 함수 호출 시 chatId.value 전달
        await signalR.sendUserPrompt(userMessage, chat.chatId.value);
        console.log('Vue에서 Dotnet으로 메시지 전송 성공:', {
          command: "send_user_prompt",
          chat_id: chat.chatId.value,
          prompt: userMessage,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('메시지 전송 중 오류:', error);
        chat.setWaitingForResponse(false);
        chat.removeLoadingIndicator();
        chat.addAssistantMessage(`메시지 전송 중 오류가 발생했습니다: ${error.message}. 다시 시도해주세요.`);
        nextTick(() => {
          chat.scrollToBottom(chatContainer.value);
        });
      }
    };

    // 테스트 메시지 전송 처리
    const handleSendTestMessage = async () => {
      if (!signalR.isConnected.value) {
        console.error('연결이 없습니다. 테스트 메시지를 보낼 수 없습니다.');
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

        // SignalR 훅의 sendTestMessage를 호출 시 현재 chat.chatId.value 전달
        await signalR.sendTestMessage(chat.chatId.value); 
        console.log('테스트 메시지 Dotnet으로 전송 완료');
      } catch (error) {
        console.error('테스트 메시지 전송 중 오류:', error);
        chat.setWaitingForResponse(false);
        chat.removeLoadingIndicator();
        chat.addAssistantMessage(`테스트 메시지 전송 중 오류가 발생했습니다: ${error.message}`);
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
      textarea.handleInput(promptTextarea.value, promptContainer.value); 
    };

    // 컴포넌트 마운트 시 초기화
    onMounted(async () => {
      // SignalR 연결 설정
      await signalR.setupConnection(
        handleMessageReceived,
        handleReceiveGeneratedChatId,
        handleReconnecting,
        handleReconnected,
        handleConnectionClosed,
        handleConnectionError
      );

      // SignalR 연결 성공 후 또는 연결 상태 변경 시 chatId 생성/전송
      watch(signalR.isConnected, async (newValue) => {
        // 연결되었지만, 아직 chatId가 할당되지 않은 경우
        if (newValue && chat.chatId.value === null) {
          console.log('SignalR 연결 확인. 채팅 ID 생성 및 전송 시도.');
          await chat.generateAndSendChatId();
        }
      }, { immediate: true }); // 컴포넌트 마운트 즉시 감지 시작

      // Socket.io 연결 설정
      // socket.setupSocket('ws://localhost:8081', handleSocketMessage, scrollToBottomHandler);
      
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

    // 컴포넌트 언마운트 시 정리
    onUnmounted(async () => {
      chat.cleanup();
      await signalR.cleanup(); // SignalR 연결 해제
      // socket.cleanup(); // Socket.io 연결 해제 (활성화 시)
    });

    return {
      ...chat,
      ...windowControls,
      
      chatContainer,
      promptContainer,
      promptTextarea,
      
      handleSendMessage,
      handleSendTestMessage,
      handleKeyDown,
      handleInput
    };
  }
};