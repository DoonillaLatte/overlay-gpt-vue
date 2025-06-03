// 1017
import { ref, onMounted, nextTick, watch, onUnmounted } from 'vue';
import { useChat } from '@/composables/useChat';
import { useSignalR } from '@/composables/useSignalR';
import { useTextarea } from '@/composables/useTextarea';
import { useWindowControls } from '@/composables/useWindowControls';
import MessageContent from '@/components/MessageContent.vue';
import ChatListModal from './components/ChatListModal.vue';
import ConnectAppsModal from './components/ConnectAppsModal.vue';
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
  },
  setup() {
    // Composables
    const signalR = useSignalR();
    const chat = useChat(signalR.connection);

    const textarea = useTextarea();
    const { isMaximized, minimizeWindow, maximizeWindow, closeWindow, maximizeRestoreWindow }
      = useWindowControls();

    // 반응형 상태
    const chatContainer = ref(null);
    const promptContainer = ref(null);
    const promptTextarea = ref(null);
    const showChatListModal = ref(false);
    const showConnectAppsModal = ref(false); // ConnectAppsModal 표시 여부
    const selectedTextFromContext = ref(''); // 다른 앱 연결하기 시 선택된 텍스트

    // 마크다운 렌더러 설정
    const md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      highlight: function (str, lang) {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(str, { language: lang }).value;
          } catch (__) { }
        }
        return ''; // use external default escaping
      }
    });

    // 메시지 내용이 HTML인지 확인 (마크다운 파싱 여부 결정)
    const isHtmlContent = (content) => {
      // 매우 간단한 HTML 태그 존재 여부 확인 (완벽하지 않음)
      return /<\/?[a-z][\s\S]*>/i.test(content);
    };

    // 마크다운을 HTML로 파싱
    const parseMarkdownToHtml = (markdown) => {
      if (!markdown) {
        return '';
      }
      return md.render(markdown);
    };

    // ChatListModal 열기
    const openChatListModal = () => {
      showChatListModal.value = true;
    };

    // ChatListModal에서 채팅 선택 또는 새 채팅 시작 시 호출
    const handleChatSelectedOrNewChat = () => {
      showChatListModal.value = false;
      // 채팅이 로드되거나 새로 시작될 때 필요한 추가 로직 (예: 메시지 목록 스크롤)
      nextTick(() => {
        if (chatContainer.value) {
          chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
        }
      });
    };

    // ChatListModal에서 채팅 삭제 시 호출
    const handleDeleteChatFromModal = (chatIdToDelete) => {
      chat.deleteChatSession(chatIdToDelete);
    };

    // 메시지 전송 처리
    const handleSendMessage = async () => {
      if (!chat.inputMessage.value.trim()) {
        return;
      }

      const userMessage = chat.inputMessage.value;
      chat.addUserMessage(userMessage); // 사용자 메시지 추가

      chat.setWaitingForResponse(true); // 응답 대기 상태 설정
      chat.startLoadingAnimation(); // 로딩 애니메이션 시작

      try {
        if (chat.chatId.value === null) {
          // 새 채팅의 경우, 먼저 chat_id를 생성하여 요청
          await chat.generateAndSendChatId();
          // generateAndSendChatId에서 chatId.value가 설정된 후 다시 sendMessage 호출
          // 이 경우, 메시지 전송 로직이 한 번 더 호출될 수 있으므로 주의 필요
          // SignalR 연결의 ReceiveGeneratedChatId 이벤트 핸들러에서 메시지 전송을 처리하도록 하는 것이 더 적절할 수 있음
          // 여기서는 간단히 chatId가 설정되면 다시 시도하도록 로직을 변경
          if (chat.chatId.value) {
            await signalR.sendUserPrompt(userMessage, chat.chatId.value, chat.lastReceivedProgramContext.value, chat.lastReceivedTargetProgram.value);
          }
        } else {
          await signalR.sendUserPrompt(userMessage, chat.chatId.value, chat.lastReceivedProgramContext.value, chat.lastReceivedTargetProgram.value);
        }
      } catch (error) {
        console.error('메시지 전송 실패:', error);
        chat.addAssistantMessage('메시지 전송에 실패했습니다. 연결을 확인해주세요.', 'error');
      } finally {
        chat.stopLoadingAnimation(); // 로딩 애니메이션 중지
        chat.setWaitingForResponse(false); // 응답 대기 상태 해제
        chat.clearInput(); // 입력창 비우기
        nextTick(() => {
          textarea.resetTextareaHeight(promptTextarea.value, promptContainer.value);
        });
      }
    };

    // 테스트 메시지 전송
    const handleSendTestMessage = async () => {
      if (chat.chatId.value === null) {
        console.warn('채팅 ID가 아직 생성되지 않았습니다.');
        return;
      }
      try {
        await signalR.sendTestMessage(chat.chatId.value);
      } catch (error) {
        console.error('테스트 메시지 전송 실패:', error);
      }
    };

    // 다른 앱 연결하기 모달 열기
    const handleConnectApps = () => {
      showConnectAppsModal.value = true;
      // console.log("ConnectAppsModal 열림, currentProgramContext:", chat.lastReceivedProgramContext.value);
    };

    // ConnectAppsModal에서 뒤로 가기
    const handleBackFromConnectApps = () => {
      showConnectAppsModal.value = false;
      selectedTextFromContext.value = ''; // 선택된 텍스트 초기화
    };

    // 앱 연결 완료 후 처리
    const handleAppConnected = (appType, appName) => {
      console.log(`${appName} (${appType}) 연결됨.`);
      // 여기에 연결 후 추가 로직 구현 (예: 메시지 전송 버튼 활성화 등)
      showConnectAppsModal.value = false; // 모달 닫기
    };

    // 응답 적용 (Enter 버튼)
    const handleApplyResponse = async () => {
      if (chat.chatId.value) {
        try {
          await signalR.applyResponse(chat.chatId.value);
          console.log('응답이 적용되었습니다.');
          chat.addAssistantMessage('명령이 실행되었습니다.', 'success');
        } catch (error) {
          console.error('응답 적용 실패:', error);
          chat.addAssistantMessage('응답 적용에 실패했습니다.', 'error');
        }
      }
    };

    // 응답 취소 (Cancel 버튼)
    const handleCancelResponse = async () => {
      if (chat.chatId.value) {
        try {
          await signalR.cancelResponse(chat.chatId.value);
          console.log('응답이 취소되었습니다.');
          chat.addAssistantMessage('명령 실행이 취소되었습니다.', 'info');
        } catch (error) {
          console.error('응답 취소 실패:', error);
          chat.addAssistantMessage('응답 취소에 실패했습니다.', 'error');
        }
      }
    };

    // 엔터 키 입력 시 메시지 전송, 쉬프트 + 엔터 시 줄 바꿈
    const handleKeyDown = (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault(); // 기본 Enter 동작(줄 바꿈) 방지
        handleSendMessage();
      }
    };

    // 입력 필드 변경 시 텍스트 영역 높이 조절
    const handleInput = () => {
      textarea.adjustTextareaHeight(promptTextarea.value, promptContainer.value);
    };

    // SignalR 이벤트 핸들러 정의
    const onMessageReceived = (messageJson) => {
      console.log('SignalR 메시지 수신:', messageJson);
      try {
        const messageData = messageJson; // messageJson은 이미 파싱된 객체입니다.

        if (messageData.command === 'program_context') {
          chat.setLastReceivedProgramContext(messageData.current_program);
          chat.setLastReceivedTargetProgram(messageData.target_program);
          // console.log("업데이트된 current_program:", chat.lastReceivedProgramContext.value);
          // console.log("업데이트된 target_program:", chat.lastReceivedTargetProgram.value);
        } else if (messageData.command === 'new_generated_response') {
          chat.stopLoadingAnimation();
          chat.setWaitingForResponse(false);
          chat.addAssistantMessage(messageData.content || '응답이 도착했습니다.', messageData.title);
          // 메시지가 수신되면 스크롤을 맨 아래로
          nextTick(() => {
            if (chatContainer.value) {
              chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
            }
          });
        }
        // 여기부터 display_text 처리 로직 추가
        else if (messageData.command === 'display_text' && messageData.chat_id === -1) {
          console.log('Chat ID가 -1인 display_text 명령 수신:', messageData);

          let extractedText = '';
          if (messageData.texts && messageData.texts.length > 0) {
            // content 속성에서 텍스트 추출 (HTML 태그 제거)
            const textContent = messageData.texts[0].content;
            const doc = new DOMParser().parseFromString(textContent, 'text/html');
            extractedText = doc.body.textContent || "";
          }

          if (extractedText) {
            selectedTextFromContext.value = extractedText;
            // showConnectAppsModal.value = true; // <-- 이 라인을 제거합니다.
            console.log('선택된 텍스트 업데이트됨. ConnectAppsModal은 표시되지 않음:', selectedTextFromContext.value);
          } else {
            console.warn('display_text 명령에 유효한 텍스트 내용이 없습니다.');
          }
        }
      } catch (error) {
        console.error('메시지 파싱 또는 처리 중 오류:', error);
        chat.addAssistantMessage('수신된 메시지 처리 중 오류가 발생했습니다.', 'error'); // 메시지 변경
      }
    };

    const onReceiveGeneratedChatId = (data) => {
      // console.log('ReceiveGeneratedChatId 수신:', data);
      chat.handleReceiveGeneratedChatId(data);
      // 채팅 ID를 받은 후 보류된 메시지가 있다면 전송 시도
      if (signalR.pendingMessage.value) {
        signalR.sendMessage(signalR.pendingMessage.value);
      }
    };

    const onReconnecting = (error) => {
      console.warn('SignalR 재연결 시도 중...');
      chat.setWaitingForResponse(true);
      chat.startLoadingAnimation('연결 재시도 중');
    };

    const onReconnected = (connectionId) => {
      console.log('SignalR 재연결 성공:', connectionId);
      chat.stopLoadingAnimation();
      chat.setWaitingForResponse(false);
      chat.addAssistantMessage('SignalR 연결이 재개되었습니다.', 'info');
      // 재연결 성공 후 보류된 메시지가 있다면 전송 시도
      if (signalR.pendingMessage.value) {
        signalR.sendMessage(signalR.pendingMessage.value);
      }
    };

    const onConnectionClosed = (error) => {
      console.error('SignalR 연결이 끊어졌습니다:', error);
      chat.addAssistantMessage('SignalR 연결이 끊어졌습니다. 재연결을 시도합니다.', 'error');
      chat.setWaitingForResponse(true);
      chat.startLoadingAnimation('연결 끊김');
      // 연결 종료 시 자동으로 재연결을 시도하도록 설정되어 있으므로 별도의 재연결 로직은 필요 없음
      // 다만, 사용자에게 상태를 알리는 것은 중요
    };

    const onConnectionError = (error) => {
      console.error('SignalR 연결 오류:', error);
      chat.addAssistantMessage('SignalR 연결에 실패했습니다. 애플리케이션을 다시 시작해주세요.', 'error');
      chat.stopLoadingAnimation();
      chat.setWaitingForResponse(false);
    };


    // 컴포넌트 마운트 시 초기화
    onMounted(async () => {
      // SignalR 연결 설정 (여기서 이벤트 핸들러 등록)
      try {
        await signalR.setupConnection(
          onMessageReceived,
          onReceiveGeneratedChatId,
          onReconnecting,
          onReconnected,
          onConnectionClosed,
          onConnectionError // onError 콜백 전달
        );
      } catch (error) {
        console.error('SignalR 초기 연결 설정 실패:', error);
        onConnectionError(error); // 초기 연결 실패 시 에러 핸들러 호출
      }

      // `generateAndSendChatId`는 `openChatListModal`이나 첫 메시지를 눌렀을 때만 시작
      // fetchChats(); // 이 함수는 useChat 내부에 있는 것이 더 적절할 수 있음

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
      chat, // useChat에서 반환된 chat 객체 자체를 포함
      ...chat, // useChat에서 반환된 모든 속성 포함 (기존 직접 접근 방식 유지)
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
      openChatListModal, // 추가: ChatListModal을 여는 함수 노출
      // allChats, // allChats는 useChat에서 관리되므로 chat.allChats로 접근
      loadChat: chat.loadChat,
      startNewChat: chat.startNewChat,
      handleChatSelectedOrNewChat,
      handleDeleteChatFromModal,

      showConnectAppsModal, // ConnectAppsModal 표시 여부
      handleConnectApps, // 다른 앱 연결하기 버튼 클릭 핸들러
      handleBackFromConnectApps, // ConnectAppsModal에서 뒤로가기 핸들러
      handleAppConnected, // 앱 연결 완료 후 처리
      selectedTextFromContext, // 선택된 텍스트

      handleApplyResponse, // 응답 적용 버튼 핸들러
      handleCancelResponse, // 응답 취소 버튼 핸들러
    };
  },
};