import { ref, nextTick } from 'vue';

export function useChat(hubConnectionRef) { 
  const messages = ref([]);
  const inputMessage = ref('');
  const isWaitingForResponse = ref(false);
  const loadingText = ref('');
  const loadingInterval = ref(null);
  const chatId = ref(null); 
  //const chatId = ref(null); // test용 chatId = 1

  // 새로운 채팅 시작 시 호출하여 채팅 ID를 생성하고 백엔드에 전송
  const generateAndSendChatId = async () => {
    if (chatId.value !== null) {
      console.log('이미 채팅 ID가 할당되어 있습니다:', chatId.value);
      return; // 이미 ID가 있으면 다시 생성하지 않음
    }

    // 임의의 채팅 ID 생성
    const newChatId = Math.floor(Math.random() * 1000000);

    const timestamp = new Date().toISOString();

    const payload = {
      command: "generate_chat_id",
      chat_id: newChatId, // 클라이언트가 제안하는 ID
      generated_timestamp: timestamp
    };

    console.log('채팅 ID 전송 페이로드:', payload); // Vue 콘솔에 전송될 페이로드 출력

    if (hubConnectionRef.value && hubConnectionRef.value.state === 'Connected') {
      try {
        // 'SendMessage' 허브 메서드를 호출하여 generate_chat_id 명령 전송
        await hubConnectionRef.value.invoke("SendMessage", payload); 
        console.log('채팅 ID 요청이 Dotnet으로 성공적으로 전송되었습니다.');
      } catch (e) {
        console.error('채팅 ID 전송 실패:', e);
      }
    } else {
      console.warn('SignalR 연결이 되지 않아 채팅 ID를 보낼 수 없습니다. 연결 상태:', hubConnectionRef.value?.state);
    }
  };

  // 'display_text' 명령 처리
  const processDisplayTextCommand = (messageData) => {
    const { 
      generated_timestamp, 
      chat_id, 
      current_program, 
      target_program, 
      texts 
    } = messageData;

    texts.forEach(textItem => {
      const newMessage = {
        text: '', 
        isUser: false,
        isNew: true,
        timestamp: generated_timestamp,
        chatId: chat_id, 
        currentProgram: current_program,
        targetProgram: target_program,
        contentType: textItem.type,
        content: textItem.content, 
        rawData: textItem  
      };

      // 타입별 처리
      switch(textItem.type) {
        case 'text_plain':
          newMessage.text = textItem.content;
          break;
        case 'text_block':
          newMessage.text = textItem.content; 
          newMessage.isHtml = true; // HTML 렌더링을 위한 플래그
          break;
        case 'table_block':
          newMessage.tableData = textItem.content; 
          newMessage.text = '[표 데이터]';
          break;
        case 'code_block':
          newMessage.codeContent = textItem.content;
          newMessage.text = '[코드 블록]';
          break;
        case 'xml_block':
          newMessage.xmlContent = textItem.content;
          newMessage.text = '[XML 데이터]';
          break;
        case 'image':
          newMessage.imageData = textItem.content; 
          newMessage.text = '[이미지]';
          break;
        default:
          newMessage.text = `[알 수 없는 타입: ${textItem.type}]`;
          break;
      }

      messages.value.push(newMessage);
    });
  };

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

  // 로딩 인디케이터 추가
  const addLoadingIndicator = () => {
    // 이미 로딩 인디케이터가 있으면 추가하지 않음
    if (!messages.value.some(msg => msg.id === 'loading-indicator')) {
      messages.value.push({
        text: '', 
        isUser: false,
        isLoading: true, 
        id: 'loading-indicator'
      });
      startLoadingAnimation();
    }
  };

  // 사용자 메시지 추가
  const addUserMessage = (text) => {
    messages.value.push({
      text: text,
      isUser: true,
      chatId: chatId.value // 사용자 메시지에도 현재 chatId 할당
    });
  };

  // 어시스턴트 메시지 추가
  const addAssistantMessage = (text, isNew = true) => {
    const newMessage = {
      text: text,
      isUser: false,
      isNew: isNew,
      chatId: chatId.value // 어시스턴트 메시지에도 현재 chatId 할당
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

  // SignalR에서 받은 일반 데이터 처리 (ReceiveMessage 이벤트)
  const processReceivedMessage = (data, chatContainer) => {
    console.log('ReceiveMessage 이벤트로부터 받은 메시지:', data);
    
    try {
      let messageData;
      if (typeof data === 'string') {
        messageData = JSON.parse(data);
      } else {
        messageData = data;
      }
    
      console.log('파싱된 메시지 데이터 (ReceiveMessage):', messageData);

      removeLoadingIndicator(); // 로딩 인디케이터 제거
      setWaitingForResponse(false); // 응답 대기 상태 해제

      // 'display_text' 명령 처리
      if (messageData.command === 'display_text') {
        processDisplayTextCommand(messageData);
      } 
      // 'response_single_generated_response' 처리
      else if (messageData.command === 'response_single_generated_response') {
        if (messageData.status === 'success') {
          if (messageData.message && messageData.message !== 'pong') {
            addAssistantMessage(messageData.message);
          } else if (messageData.message === 'pong') {
            console.log('Pong received from ReceiveMessage.');
          }
        } else {
          addAssistantMessage(`오류: ${messageData.message}`);
        }
      }
      // 기타 일반 메시지 (ping, pong 제외)
      else if (messageData.message && messageData.message !== 'ping' && messageData.message !== 'pong') {
        addAssistantMessage(messageData.message);
      }
      // 직접 문자열 메시지 (JSON 파싱 실패 또는 단순 텍스트)
      else if (typeof messageData === 'string' && messageData !== 'ping' && messageData !== 'pong') {
        addAssistantMessage(messageData);
      }
      // 알 수 없는 형식의 메시지
      else {
        console.warn('알 수 없는 형식의 메시지:', messageData);
        addAssistantMessage('알 수 없는 메시지 형식입니다.');
      }

      if (chatContainer) {
        nextTick(() => {
          scrollToBottom(chatContainer); 
        });
      }

    } catch (error) {
      console.error('ReceiveMessage 처리 중 오류:', error);
      removeLoadingIndicator();
      setWaitingForResponse(false);
      addAssistantMessage(`메시지 처리 오류: ${error.message}`);
      
      if (chatContainer) {
        nextTick(() => {
          scrollToBottom(chatContainer);
        });
      }
    }
  };

  // SignalR에서 받은 generate_chat_id 응답 처리
  const processGeneratedChatId = (data) => {
    console.log('ReceiveGeneratedChatId 이벤트로부터 받은 메시지:', data);
    try {
      let messageData;
      if (typeof data === 'string') {
        messageData = JSON.parse(data);
      } else {
        messageData = data;
      }

      if (messageData.command === 'generate_chat_id' && messageData.chat_id) {
          if (chatId.value === null || chatId.value !== messageData.chat_id) {
              chatId.value = messageData.chat_id;
              console.log('서버로부터 새로운 chat_id 할당/확인됨:', chatId.value);
          }
      }
    } catch (error) {
        console.error('generate_chat_id 응답 처리 중 오류:', error);
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

  // 정리 함수 (컴포넌트 언마운트 시)
  const cleanup = () => {
    stopLoadingAnimation();
  };

  return {
    messages,
    inputMessage,
    isWaitingForResponse,
    loadingText,
    chatId, 
    
    startLoadingAnimation,
    stopLoadingAnimation,
    removeLoadingIndicator,
    addLoadingIndicator,
    addUserMessage,
    addAssistantMessage,
    scrollToBottom,
    processReceivedMessage, 
    processGeneratedChatId, 
    clearInput,
    setWaitingForResponse,
    cleanup,
    generateAndSendChatId 
  };
}