import { ref, onMounted, nextTick, watch, onUnmounted } from 'vue';
import { useChat } from '@/composables/useChat';
import { useSignalR } from '@/composables/useSignalR';
import { useTextarea } from '@/composables/useTextarea';
import { useWindowControls } from '@/composables/useWindowControls';

import MessageContent from '@/components/MessageContent.vue';
import ChatListModal from './components/ChatListModal.vue';
import ConnectAppsModal from './components/ConnectAppsModal.vue';
import SelectWorkflowsModal from './components/SelectWorkflowsModal.vue';

import MarkdownIt from 'markdown-it'; 
import hljs from 'highlight.js/lib/core'; 
import javascript from 'highlight.js/lib/languages/javascript';
import xml from 'highlight.js/lib/languages/xml'; 
import css from 'highlight.js/lib/languages/css';
import 'highlight.js/styles/github-dark.css';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('html', xml); 
hljs.registerLanguage('css', css);

export default {
  name: 'ChatWindow',
  components: {
    MessageContent,
    ChatListModal,
    ConnectAppsModal,
    SelectWorkflowsModal,
  },
  setup() {
    // Composables
    const signalR = useSignalR();
    const chat = useChat(signalR.connection);

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

    // 선택된 텍스트를 저장하는 반응형 변수
    const selectedTextFromContext = ref('');
    const showConnectAppsModal = ref(false);
    const showSelectWorkflowsModal = ref(false);

    const targetProgram = ref(''); 
    const similarPrograms = ref([]);

    // markdownIt 인스턴스
    const md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      highlight: function (str, lang) {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(str, { language: lang}).value;;
          } catch (__) {}
        }
        return '<pre><code>' + md.utils.escapeHtml(str) + '</code></pre>';
      }
    });

    const handleConnectApps = () => {
      showConnectAppsModal.value = true;
    };

    // 뒤로 가기 버튼 클릭 시
    const handleBackFromConnectApps = () => {
      console.log('App.vue에서 back 이벤트를 수신했습니다. showConnectAppsModal을 false로 설정합니다.');
      showConnectAppsModal.value = false;
    };

    const handleBackFromSelectWorkflows = () => {
      console.log('SelectWorkflowsModal에서 뒤로가기 클릭');
      showSelectWorkflowsModal.value = false;
      showConnectAppsModal.value = true; 
    }

    // SelectWorkflowsModal 닫기
    const handleCloseSelectWorkflows = () => {
      showSelectWorkflowsModal.value = false;
    };

    const handleRequestTopWorkFlows = async (fileType) => { console.log(`★★★ App.js: handleRequestTopWorkFlows 함수 진입. fileType: ${fileType}`); // 이 줄 추가
      console.log(`App.js: 'request-top-workflows' 이벤트 수신. fileType: ${fileType}`);

      showConnectAppsModal.value = false; // ConnectAppsModal 숨기기
      targetProgram.value = fileType; // 선택된 앱 정보 저장
      showSelectWorkflowsModal.value = true; // SelectWorkflowsModal 보이기

      if (chat.chatId.value === null) {
        await chat.generateAndSendChatId();
        await nextTick();
      }
    
      try {
        const payload = {
          command: "request_top_workflows",
          chat_id: chat.chatId.value,
          file_type: fileType,
        };
        await signalR.connection.value.invoke("SendMessage", payload);
        console.log('request_top_workflows 전송 성공: ', payload);
      } catch (e) {
        console.error('request_top_workflows 전송 실패: ', e);
      }
    };

    // select-workflow 보내기 
    const handleSelectWorkFlow = async ({ fileType, targetFile}) => {
      console.log(`App.js: 'select-workflow' 이벤트 수신. fileType: ${fileType}`);

      // 현재 채팅 ID가 없으면 생성
      if (chat.chatId.value === null) {
          await chat.generateAndSendChatId();
          await nextTick();
      }

      try {
        const payload = {
          command: "select_workflow",
          chat_id: chat.chatId.value,
          file_type: fileType,
          target_program: targetFile,
        };
        await signalR.connection.value.invoke("SendMessage", payload);
        console.log('select_workflow 전송 성공: ', payload);

        showSelectWorkflowsModal.value = false;

        chat.addAssistantMessage(`워크플로우 ${fileType}을 선택하셨습니다.`);
        await nextTick();
        chat.scrollToBottom(chatContainer.value);
      } catch (e) {
        console.error('select_workflow 전송 실패 ', e);

        chat.addAssistantMessage(`워크플로우 '${fileType}' 선택 중 오류가 발생했습니다: ${e.message}`);
        await nextTick();
        chat.scrollToBottom(chatContainer.value);
      }
    }

    const handleApplyResponse = async () => {
      if (chat.chatId.value !== null) {
        try {
          await signalR.applyResponse(chat.chatId.value);
          chat.addAssistantMessage("응답이 성공적으로 적용되었습니다.");
        } catch (err) {
          console.error("apply_response 전송 중 오류:", err);
          chat.addAssistantMessage("응답 적용에 실패했습니다.");
        }
      }
    };

    // HTML 콘텐츠 여부를 확인하는 함수
    const isHtmlContent = (text) => {
      // 텍스트가 문자열인지 먼저 확인
      if (typeof text !== 'string') return false;
      return /<[a-z][^>]*>|<\/[a-z]+>/.test(text);
    };

    const parseMarkdownToHtml = (markdownText) => {
      if (!markdownText) return '';
        
      const htmlCodeBlockMatch = markdownText.match(/```html\s*([\s\S]*?)```/);
      if (htmlCodeBlockMatch) {
        return htmlCodeBlockMatch[1]; // 순수 HTML만 추출
      }
    
      return md.render(markdownText); // 일반 마크다운 처리
    };

    // 채팅 목록을 불러오는 함수
    const fetchChats = () => {
      allChats.value = [...chat.getAllChats()];
      //console.log('채팅 목록 업데이트됨:', allChats.value.length);
    };

    // 선택된 텍스트로 채팅을 시작하는 함수
    const startChatWithSelectedText = async (selectedText) => {
      console.log('선택된 텍스트로 채팅 시작:', selectedText);
      await chat.startNewChat();
      chat.inputMessage.value = `다음 텍스트에 대해 도움을 요청합니다:\n\n"${selectedText}"`;
      await nextTick();
      await handleSendMessage();

      console.log('선택된 텍스트로 채팅이 자동 시작되었습니다.');
    };

  // SignalR로부터 메시지를 수신했을 때의 처리 함수
  const handleMessageReceived = (data) => {
    try {
      let messageData;
      if (typeof data === 'string') {
        messageData = JSON.parse(data);
      } else {
        messageData = data;
      }

      if (messageData.command === 'response_top_workflows') {
        console.log("App.js: 'response_top_workflows' 명령 수신: ", messageData);
        chat.removeLoadingIndicator();
        chat.setWaitingForResponse(false);

        if (messageData.similar_programs && messageData.similar_programs.length > 0) {
          similarPrograms.value = messageData.similar_programs;
          console.log(`유사 프로그램 목록: ${messageData.similar_programs.map(p => p[0]).join(', ')}`);
        } else {
          similarPrograms.value = [];
          console.log('추천할 프로그램이나 워크플로우가 없습니다.');
        }
      } else if (messageData.command === 'display_text') { // else if 로 변경
        console.log("App.js: 'display_text' 명령 수신: ", messageData);
      
        if (messageData.chat_id === -1) {
          let selectedText = '';
        
          const selectedTextItem = messageData.texts?.find(item => item.type === 'text_plain' || item.type === 'text_block');
          if (selectedTextItem) {
            selectedText = selectedTextItem.content;
          } else if (messageData.current_program?.context) {
            selectedText = messageData.current_program.context;
          }
        
          console.log("chat_id가 -1입니다. 선택된 텍스트 영역에 출력하고 채팅을 초기화합니다.");
          selectedTextFromContext.value = selectedText.trim();
          
          chat.clearChatAndStartNew(messageData.generated_timestamp);
        
          chat.removeLoadingIndicator();
          chat.setWaitingForResponse(false);
        
          chat.lastReceivedProgramContext.value = messageData.current_program || null;
          chat.lastReceivedTargetProgram.value = messageData.target_program || null;
        } else if (messageData.chat_id >= 1) {
          console.log("chat_id가 1 이상입니다. 채팅 메시지에 추가합니다.");
          
          chat.processDisplayTextCommand(messageData, chatContainer.value);
        
          chat.removeLoadingIndicator();
          chat.setWaitingForResponse(false);
        
          nextTick(() => {
            chat.scrollToBottom(chatContainer.value);
          });
        } else {
          console.warn(`알 수 없는 chat_id 값 (${messageData.chat_id}). 텍스트를 처리하지 않습니다.`);
          chat.removeLoadingIndicator();
          chat.setWaitingForResponse(false);
        }
      } else {
        // 그 외 일반 메시지 (response_top_workflows 나 display_text가 아닌 경우만 여기로 옴)
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
      });
    }
  };  

  // 생성된 채팅 ID를 수신했을 때의 처리 함수
  const handleReceiveGeneratedChatId = (data) => {
    chat.processGeneratedChatId(data);
  };

  // SignalR 재연결 시도 시 호출될 함수
  const handleReconnecting = (error) => {
    chat.addAssistantMessage('서버와의 연결이 끊어졌습니다. 재연결을 시도합니다...');
    chat.removeLoadingIndicator();
  };

  // SignalR 재연결 성공 시 호출될 함수
  const handleReconnected = (connectionId) => {
    chat.addAssistantMessage('서버와의 연결이 복구되었습니다.');
    if (signalR.pendingMessage.value) {
      console.log('보류 중인 메시지를 재전송합니다.');
      const messageToSend = signalR.pendingMessage.value;
      signalR.pendingMessage.value = null;
      if (messageToSend && messageToSend.command === 'send_user_prompt') {
        chat.inputMessage.value = messageToSend.prompt; 
        handleSendMessage();
      } else {
        signalR.sendMessage(messageToSend)
          .catch(err => console.error('보류 메시지 재전송 실패:', err));
      }
    }
  };

  // SignalR 연결 종료 시 호출될 함수
  const handleConnectionClosed = (error) => {
    chat.removeLoadingIndicator();
    chat.addAssistantMessage('서버 연결이 완전히 종료되었습니다. 앱을 재시작해야 할 수 있습니다.');
    console.error('SignalR 연결 종료:', error);
  };

  // SignalR 연결 오류 발생 시 호출될 함수
  const handleConnectionError = (error) => {
    chat.removeLoadingIndicator();
    chat.addAssistantMessage(`서버 연결에 오류가 발생했습니다: ${error?.message || '알 수 없는 오류'}. 잠시 후 다시 시도해주세요.`);
    console.error('SignalR 연결 오류:', error);
  };

  // 메시지 전송 처리 함수
  const handleSendMessage = async () => {
    if (!chat.inputMessage.value.trim() || chat.isWaitingForResponse.value) return;
    // chat_id가 null인 경우에만 생성 요청 

    if (chat.chatId.value === null) {
      await chat.generateAndSendChatId();
      await nextTick();
    }
    chat.addUserMessage(chat.inputMessage.value);
    chat.addLoadingIndicator();
    chat.setWaitingForResponse(true);
    chat.scrollToBottom(chatContainer.value);

    try {
      if (signalR.connection.value) {
        const payload = {
          command: "send_user_prompt",
          chat_id: chat.chatId.value,
          prompt: chat.inputMessage.value,
          request_type: 1,
          current_program: chat.lastReceivedProgramContext.value, 
          target_program: chat.lastReceivedTargetProgram.value, 
          generated_timestamp: new Date().toISOString()
        };
        await signalR.connection.value.invoke("SendMessage", payload); 
        console.log('메시지 전송 성공:', payload); 
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

  // 테스트 메시지 전송 처리 함수 (디버깅용)
  const handleSendTestMessage = async () => {
    if (!signalR.isConnected.value) {
      console.error('연결이 없습니다. 테스트 메시지를 보낼 수 없습니다.');
      chat.addAssistantMessage('서버와의 연결이 끊어졌습니다. 페이지를 새로고침하거나 잠시 후 다시 시도하세요.');
      return;
    }

    try {
      // 테스트 메시지 전송 시에도 chat_id가 없으면 생성 요청 (새로운 동작)
      if (chat.chatId.value === null) {
          await chat.generateAndSendChatId();
          await nextTick();
      }
      chat.addUserMessage(signalR.testData.value.prompt);
      chat.setWaitingForResponse(true);
      chat.addLoadingIndicator();
      nextTick(() => {
        chat.scrollToBottom(chatContainer.value);
      });

      const payload = {
        command: "send_user_prompt",
        chat_id: chat.chatId.value,
        prompt: signalR.testData.value.prompt,
        request_type: 1,
        current_program: chat.lastReceivedProgramContext.value,
        target_program: chat.lastReceivedTargetProgram.value, 
        generated_timestamp: new Date().toISOString()
      };

      await signalR.connection.value.invoke("SendMessage", payload);
      console.log('테스트 메시지 Dotnet으로 전송 완료', payload);
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

  // 버튼 눌렀을 때 
  const handleAddContent = async () => {
    chat.inputMessage.value = "이 내용에 대해서 추가적인 설명을 덧붙여줘.";
    await handleSendMessage();
  };
  
  const handleChangeContent = async () => {
    chat.inputMessage.value = "이 내용을 요약하거나 설명해줘.";
    await handleSendMessage();
  };

  const handleSpellCheck = async () => {
    chat.inputMessage.value = "이 내용의 맞춤법을 검사해줘.";
    await handleSendMessage();
  };

  // 키 다운 이벤트 처리 (Enter 키로 메시지 전송)
  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      if (event.shiftKey || event.metaKey || event.ctrlKey) {
        return; // Shift+Enter, Cmd/Ctrl+Enter는 줄 바꿈 허용
      } else {
        event.preventDefault(); // Enter 키 기본 동작 방지
        handleSendMessage(); // 메시지 전송
      }
    }
  };

  // 입력 필드 높이 조절
  const handleInput = () => {
    textarea.handleInput(promptTextarea.value, promptContainer.value);
  };

  // 채팅 목록 모달 열기
  const openChatListModal = () => {
    fetchChats(); // 최신 채팅 목록 불러오기
    showChatListModal.value = true;
  };

  // 채팅 선택 또는 새 채팅 생성 후 처리
  const handleChatSelectedOrNewChat = () => {
    showChatListModal.value = false; // 모달 닫기
    fetchChats(); // 채팅 목록 업데이트
    nextTick(() => {
      chat.scrollToBottom(chatContainer.value); // 채팅 스크롤을 맨 아래로
    });
  };

    // 모달에서 채팅 삭제 처리
    const handleDeleteChatFromModal = (chatIdToDelete) => {
      chat.deleteChat(chatIdToDelete); // 채팅 삭제

      // allChats 배열에서도 해당 채팅 제거
      allChats.value = allChats.value.filter(c => c.id !== chatIdToDelete);

      // 현재 활성화된 채팅이 삭제된 경우 새 채팅 시작
      if(chat.chatId.value === chatIdToDelete) {
        // startNewChat()은 chat_id를 null로 설정하고 generateAndSendChatId를 호출
        chat.startNewChat(); 
      }
    };

    // 컴포넌트 마운트 시 실행되는 로직
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

      // 새 채팅은 display_text 명령(-1)을 받거나 사용자가 직접 '새 채팅' 버튼을 눌렀을 때만 시작
      fetchChats(); 

      // 다음 틱에서 텍스트 영역 높이 조절 및 스크롤 위치 조정
      nextTick(() => {
        textarea.resetTextareaHeight(promptTextarea.value, promptContainer.value);
      });
    });

    // inputMessage가 변경될 때마다 텍스트 영역 높이 조절
    watch(() => chat.inputMessage.value, () => {
      nextTick(() => {
        textarea.adjustTextareaHeight(promptTextarea.value, promptContainer.value);
      });
    });

    // 컴포넌트 언마운트 시 정리
    onUnmounted(async () => {
      chat.cleanup(); // chat 관련 정리
      await signalR.cleanup(); // SignalR 관련 정리
    });

    // 템플릿에서 사용할 수 있도록 반응형 변수와 함수 반환
    return {
      ...chat, // useChat에서 반환된 모든 속성 포함
      isMaximized,
      minimizeWindow,
      maximizeWindow,
      closeWindow,
      maximizeRestoreWindow,

      chatContainer,
      promptContainer,
      promptTextarea,
      isHtmlContent,
      parseMarkdownToHtml,

      handleSendMessage,
      handleSendTestMessage,
      handleKeyDown,
      handleInput,

      showChatListModal,
      allChats,
      loadChat: chat.loadChat,
      startNewChat: chat.startNewChat,
      openChatListModal,
      handleChatSelectedOrNewChat,
      handleDeleteChatFromModal,
      handleApplyResponse,

      selectedTextFromContext,
      handleAddContent,
      handleChangeContent,
      handleSpellCheck,

      showConnectAppsModal,
      handleConnectApps,
      handleBackFromConnectApps,
      handleRequestTopWorkFlows,

      showSelectWorkflowsModal,
      targetProgram,
      handleBackFromSelectWorkflows,
      handleCloseSelectWorkflows,
      similarPrograms,
      handleSelectWorkFlow
    };
  }
};