import { ref, onMounted, nextTick, watch, onUnmounted } from 'vue';
import { useChat } from '@/composables/useChat';
import { useSignalR } from '@/composables/useSignalR';
import { useSocket } from '@/composables/useSocket';
import { useTextarea } from '@/composables/useTextarea';
import { useWindowControls } from '@/composables/useWindowControls';
import MessageContent from '@/components/MessageContent.vue';
import ChatListModal from './components/ChatListModal.vue'; 

export default {
  name: 'ChatWindow',
  components: {
    MessageContent,
    ChatListModal,
  },
  setup() {
    // Composables
    const signalR = useSignalR();
    const chat = useChat(signalR.connection); // SignalR connection을 useChat에 전달
    
    const socket = useSocket();
    const textarea = useTextarea();
    const { isMaximized, minimizeWindow, maximizeWindow, closeWindow, maximizeRestoreWindow } 
     = useWindowControls();

    // Template refs
    const chatContainer = ref(null);
    const promptContainer = ref(null);
    const promptTextarea = ref(null);

    // 모달 관련 상태
    const showChatListModal = ref(false); 
    const allChats = ref([]);

    const selectedTextFromContext = ref('');
    
    // 단축키로 실행되었는지 추적하는 상태
    const isHotkeyLaunched = ref(false);
    const pendingSelectedText = ref('');

    const fetchChats = () => {
      allChats.value = [...chat.getAllChats()];
      console.log('채팅 목록 업데이트됨:', allChats.value.length);
    };

    // 선택된 텍스트로 자동 채팅 시작
    const startChatWithSelectedText = async (selectedText) => {
      console.log('선택된 텍스트로 채팅 시작:', selectedText);
      
      // 새로운 채팅 시작
      await chat.startNewChat();
      
      // 선택된 텍스트를 입력창에 설정하고 바로 전송
      chat.inputMessage.value = `다음 텍스트에 대해 도움을 요청합니다:\n\n"${selectedText}"`;
      
      // UI 업데이트를 위해 nextTick 사용
      await nextTick();
      
      // 메시지 자동 전송
      await handleSendMessage();
      
      console.log('선택된 텍스트로 채팅이 자동 시작되었습니다.');
    };

    // SignalR 이벤트 핸들러들
    const handleMessageReceived = (data) => {
      console.log('ReceivMessage 이벤트로부터 받은 메세지: ',data);

      try {
        let messageData;
        if(typeof data === 'string') {
          messageData = JSON.parse(data);
        } else {
          messageData = data;
        }
        
        if (messageData.command === 'display_text') {
          console.log("App.js: 'display_text' 명령 수신: ", messageData);

          let selectedText = '';
          
          // 1. texts 배열에서 텍스트 찾기
          const selectedTextItem = messageData.texts?.find(item => item.type === 'text_plain' || item.type === 'text_block');
          if (selectedTextItem) {
            selectedText = selectedTextItem.content;
            console.log('texts 배열에서 텍스트 찾음:', selectedText);
          }
          // 2. texts가 비어있거나 텍스트가 없으면 current_program.context에서 추출
          else if (messageData.current_program?.context) {
            // HTML 태그 제거하여 순수 텍스트만 추출
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = messageData.current_program.context;
            selectedText = tempDiv.textContent || tempDiv.innerText || '';
            console.log('current_program.context에서 텍스트 추출:', selectedText);
          }

          if (selectedText.trim()) {
            selectedTextFromContext.value = selectedText.trim();
            console.log('selectedTextFromContext updated:', selectedTextFromContext.value);
            
            // 단축키로 실행된 경우 자동으로 채팅 시작
            if (isHotkeyLaunched.value) {
              console.log('단축키 실행 감지 - 자동 채팅 시작');
              isHotkeyLaunched.value = false; // 플래그 리셋
              startChatWithSelectedText(selectedTextFromContext.value);
              return; // display_text 일반 처리는 건너뛰기
            }
          } else {
            selectedTextFromContext.value = '[텍스트 내용 없음]';
            console.log('selectedTextFromContext set to default:', selectedTextFromContext.value); 
          }

          chat.processDisplayTextCommand(messageData, chatContainer.value);
          console.log('Messages after processDisplayTextCommand:', chat.messages.value); 
          
          chat.setWaitingForResponse(false);
          chat.removeLoadingIndicator();
        } else {
          console.log('App.js: 일반 메시지 처리. useChat.processReceivedMessage 호출됨.');
          chat.processReceivedMessage(data, chatContainer.value);
        }
      } catch (error) {
        console.error('ReceiveMessage 처리 중 오류 (App.js):', error);
        chat.removeLoadingIndicator();
        chat.setWaitingForResponse(false);
        chat.addAssistantMessage(`메시지 처리 오류: ${error.message}`);
        nextTick(() => {
          chat.scrollToBottom(chatContainer.value);
        })
      }
    };

    const handleReceiveGeneratedChatId = (data) => {
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

        if (messageToSend && messageToSend.command === 'send_user_prompt') {
          chat.inputMessage.value = messageToSend.prompt;
          handleSendMessage(); // 재전송
        } else {
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
      if (!chat.inputMessage.value.trim() || chat.isWaitingForResponse.value) return;

      if (chat.chatId.value === null) {
        await chat.generateAndSendChatId();
        await nextTick(); // 채팅 ID가 설정될 때까지 기다림
      }

      chat.addUserMessage(chat.inputMessage.value);
      chat.addLoadingIndicator();
      chat.setWaitingForResponse(true);
      chat.scrollToBottom(chatContainer.value);

      const messagePayload = {
        chat_id: chat.chatId.value,
        command: "send_message",
        message: chat.inputMessage.value,
        generated_timestamp: new Date().toISOString(),
      };

      try {
        if (signalR.connection.value && signalR.connection.value.state === 'Connected') {
          await signalR.connection.value.invoke("SendMessage", messagePayload);
          console.log('메시지 전송 성공:', messagePayload);
        } else {
          console.warn('SignalR 연결이 되지 않아 메시지를 보낼 수 없습니다. 연결 상태:', signalR.connection.value?.state);
          chat.addAssistantMessage('서버에 연결할 수 없습니다. 다시 시도해주세요.');
          chat.removeLoadingIndicator();
          chat.setWaitingForResponse(false);
        }
      } catch (e) {
        console.error('메시지 전송 실패:', e);
        chat.addAssistantMessage(`메시지 전송 실패: ${e.message}`);
        chat.removeLoadingIndicator();
        chat.setWaitingForResponse(false);
      } finally {
        chat.clearInput();
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

    // ChatListModal 열기
    const openChatListModal = () => {
      fetchChats();
      showChatListModal.value = true;
    };

    // ChatListModal에서 채팅 선택/생성 후 닫기
    const handleChatSelectedOrNewChat = () => {
      showChatListModal.value = false;
      fetchChats();
      nextTick(() => {
        chat.scrollToBottom(chatContainer.value);
      });
    };

    // ChatListModal에서 대화를 삭제할 때
    const handleDeleteChatFromModal = (chatIdToDelete) => {
      chat.deleteChat(chatIdToDelete);

    allChats.value = allChats.value.filter(c => c.id !== chatIdToDelete);

      if(chat.chatId.value === chatIdToDelete) {
        chat.startNewChat();
      }
    };

    const closeDisplayMessageOverlay = () => {
      showDisplayMessageOverlay.value = false;
      displayedMessageData.value = null;
    }

    // 단축키 실행 감지 함수 (Electron 또는 다른 방법으로 호출)
    const handleHotkeyLaunch = () => {
      console.log('단축키 실행 감지됨');
      isHotkeyLaunched.value = true;
      
      // 이미 선택된 텍스트가 있다면 바로 채팅 시작
      if (selectedTextFromContext.value && selectedTextFromContext.value !== '[텍스트 내용 없음]') {
        startChatWithSelectedText(selectedTextFromContext.value);
      }
      // 없다면 display_text 명령을 기다림 (handleMessageReceived에서 처리)
    };

    // 컴포넌트 마운트 시 초기화
    onMounted(async () => {
      // URL 파라미터나 Electron IPC를 통해 단축키 실행 여부 확인
      const urlParams = new URLSearchParams(window.location.search);
      const isHotkey = urlParams.get('hotkey') === 'true';
      
      if (isHotkey) {
        console.log('URL 파라미터로 단축키 실행 감지됨');
        handleHotkeyLaunch();
      }

      // Electron 환경에서 단축키 실행 감지
      if (window.electron) {
        window.electron.ipcRenderer.on('hotkey-launched', () => {
          console.log('Electron IPC로 단축키 실행 감지됨');
          handleHotkeyLaunch();
        });
      }

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
        if (newValue && chat.chatId.value === null) {
          console.log('SignalR 연결 확인. 채팅 ID 생성 및 전송 시도.');
          await chat.generateAndSendChatId();
        }
      }, { immediate: true });

      // 단축키로 실행되지 않은 경우에만 기존 채팅 로드
      if (!isHotkeyLaunched.value) {
        // 앱 시작 시 로컬 저장소에서 마지막 채팅 불러오기 또는 새 채팅 시작
        fetchChats();

        if (allChats.value.length > 0) {
          chat.loadChat(allChats.value[0].id); // 가장 최근 채팅 불러오기
        } else {
          await chat.startNewChat(); // 새로운 채팅 시작 상태로 설정 (ID는 첫 메시지 전송 시 생성)
        }
      }

      nextTick(() => {
        textarea.resetTextareaHeight(promptTextarea.value, promptContainer.value);
        chat.scrollToBottom(chatContainer.value); // 초기 로딩 후 스크롤 하단으로
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
      isMaximized,
      minimizeWindow,
      maximizeWindow,
      closeWindow,
      maximizeRestoreWindow, 

      // template refs
      chatContainer,
      promptContainer,
      promptTextarea,

      // handlers
      handleSendMessage,
      handleSendTestMessage,
      handleKeyDown,
      handleInput,

      // 모달
      showChatListModal,
      allChats,
      loadChat: chat.loadChat,
      startNewChat: chat.startNewChat,
      openChatListModal,
      handleChatSelectedOrNewChat,
      handleDeleteChatFromModal, 

      selectedTextFromContext,
      
      // 단축키 관련
      handleHotkeyLaunch,
      isHotkeyLaunched,
    };
  }
};