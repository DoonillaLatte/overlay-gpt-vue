import { ref, nextTick } from 'vue';

export function useChat(hubConnectionRef) { 
  const messages = ref([]);
  const inputMessage = ref('');
  const isWaitingForResponse = ref(false);
  const loadingText = ref('');
  const loadingInterval = ref(null);
  const chatId = ref(null); 

  // local storage에서 Chatting 목록 가져오기
  const getChatList = () => {
    const stored = localStorage.getItem('chatSession');
    return stored ? JSON.parse(stored) : [];
  };

  // local storage에 chatting 목록 저장
  const saveChatList = (chatList) => {
    localStorage.setItem('chatSession', JSON.stringify(chatList));
  };

  // 다음 chatting ID 가져오기 (1부터 증가)
  const getNextChatId = () => {
    const chatList = getChatList();
    if(chatList.length === 0) {
      return 1;
    }

    const maxId = Math.max(...chatList.map(chat => chat.id));
    return maxId + 1;
  };

  // 새로운 채팅 생성
  const generateAndSendChatId = async () => {
    if (chatId.value !== null) {
      console.log(`채팅 ID 이미 존재: ${chatId.value}. 새로 생성하지 않습니다.`);
    }
    
    // 채팅 ID가 없는 경우에만 새로 생성
    let currentChatId = chatId.value;
    if (currentChatId === null) {
      currentChatId = getNextChatId();
      const timestamp = new Date().toISOString();
    
      // Local에 새 chatting 저장
      const chatList = getChatList();
      const newChat = {
        id: currentChatId,
        title: `Chat ${currentChatId}`,
        createdAt: timestamp,
        lastUpdated: timestamp,
        messages: []
      };
    
      chatList.push(newChat);
      saveChatList(chatList);
    
      chatId.value = currentChatId;
      console.log(`새로운 채팅 생성됨 - ID: ${currentChatId}`);
    }
  
    const payload = {
      command: "generate_chat_id",
      chat_id: currentChatId,
      generated_timestamp: new Date().toISOString()
    };
  
    console.log('채팅 ID 전송 페이로드:', payload);
  
    if (hubConnectionRef.value && hubConnectionRef.value.state === 'Connected') {
      try {
        await hubConnectionRef.value.invoke("SendMessage", payload); 
        console.log('채팅 ID 요청이 Dotnet으로 성공적으로 전송되었습니다.');
      } catch (e) {
        console.error('채팅 ID 전송 실패:', e);
      }
    } else {
      console.warn('SignalR 연결이 되지 않아 채팅 ID를 보낼 수 없습니다. 연결 상태:', hubConnectionRef.value?.state);
    }
  };

  // message를 local에 저장하는 함수
  const saveMessageToLocal = (message) => {
    const chatList = getChatList();
    const chatIndex = chatList.findIndex(chat => chat.id === chatId.value);
    
    if(chatIndex !== -1) {
      chatList[chatIndex].messages.push(message);
      chatList[chatIndex].lastUpdated = new Date().toISOString();

      // 첫 번째 사용자 메시지로 chatting 제목 업데이트
      if (message.isUser && chatList[chatIndex].messages.filter(m => m.isUser).length === 1) {
        chatList[chatIndex].title = message.text.substring(0, 30) + (message.text.length > 30 ? '...' : '');
      }

      saveChatList(chatList);
    }
  };

  // 사용자 메시지 추가
  const addUserMessage = (text) => {
    const message = {
      text: text,
      isUser: true,
      chatId: chatId.value,
      timestamp: new Date().toISOString()
    };

    messages.value.push(message);
    saveMessageToLocal(message);
  };

  // 어시스턴트 메시지 추가
  const addAssistantMessage = (text, isNew = true, title = null) => {
    const message = {
      text: text,
      title: title,
      isUser: false,
      isNew: isNew,
      chatId: chatId.value,
      timestamp: new Date().toISOString()
    };

    messages.value.push(message);
    saveMessageToLocal(message);
  };

  // 'display_text' 명령 처리
  const processDisplayTextCommand = (messageData, chatContainer) => {
    const { 
      generated_timestamp, 
      chat_id, 
      current_program, 
      target_program, 
      texts,
      title
    } = messageData;

    if(texts.length === 0 && current_program && current_program.context) {
      const contentToDisplay = current_program.context;
      const contentType = 'text-block';

      const newMessage = {
        text: '', 
        title: title || null,
        isUser: false,
        isNew: true,
        timestamp: generated_timestamp,
        chatId: chat_id, 
        currentProgram: current_program,
        targetProgram: target_program,
        contentType: contentType,
        content: contentToDisplay, 
        rawData: messageData  
      };

      messages.value = [...messages.value, newMessage];
      saveMessageToLocal(newMessage);
      console.log('useChat.js : current_program.context로부터 메세지 추가됨:', newMessage);
    } else {
        texts.forEach(textItem => {
        const newMessage = {
          text: '', 
          title: title || null,
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
      
        messages.value = [...messages.value, newMessage]; 
        saveMessageToLocal(newMessage);
      });
    }

     console.log('useChat.js: messages 배열 길이:', messages.value.length);

     if (chatContainer) {
      nextTick(() => {
      scrollToBottom(chatContainer);
    });
  }
  };

  // 특정 chatting 불러오기
  const loadChat = (chatIdToLoad) => {
    const chatList = getChatList();
    const chat = chatList.find(c => c.id === chatIdToLoad);

    if(chat) {
      chatId.value = chat.id;
      messages.value = [...chat.messages];
      console.log(`채팅 ${chatIdToLoad} 불러오기 완료`);
      return true;
    } else {
      console.error(`채팅 ID ${chatIdToLoad}를 찾을 수 없습니다.`);
      return false;
    }
  };

  // chatting 삭제
  const deleteChat = (chatIdToDelete) => {
    const chatList = getChatList();
    const filteredList = chatList.filter(chat => chat.id !== chatIdToDelete);
    saveChatList(filteredList);

    // 현재 보고 있는 채팅이 삭제된 경우 초기화
    if(chatId.value === chatIdToDelete) {
      chatId.value = null;
      messages.value = [];
    }
  };

  // 모든 chatting 목록 가져오기 (최신순 정렬)
  const getAllChats = () => {
    return getChatList().sort((a,b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
  };

  // 새 chatting 시작 
  const startNewChat = async () => {
    chatId.value = null;
    messages.value = [];
    console.log('새 채팅을 시작합니다.');
    await generateAndSendChatId();
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

  // 스크롤을 맨 아래로
  const scrollToBottom = (chatContainer) => {
    if (chatContainer) {
      nextTick(() => {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      });
    }
  };

  // SignalR에서 받은 일반 데이터 처리
  const processReceivedMessage = (data, chatContainer) => {
    console.log('ReceiveMessage 이벤트로부터 받은 메시지:', data);
    
    try {
      let messageData;
      if (typeof data === 'string') {
        messageData = JSON.parse(data);
      } else {
        messageData = data;
      }
    
      removeLoadingIndicator(); // 로딩 인디케이터 제거
      setWaitingForResponse(false); // 응답 대기 상태 해제

      // 'display_text' 명령 처리
      /*
      if (messageData.command === 'display_text') {
        processDisplayTextCommand(messageData);
      } 
      */

      // 'response_single_generated_response' 처리
      if (messageData.command === 'response_single_generated_response') {
        if (messageData.status === 'success') {
          if (messageData.message && messageData.message !== 'pong') {
            addAssistantMessage(messageData.message, true, messageData.title || null);
          } else if (messageData.message === 'pong') {
            console.log('Pong received from ReceiveMessage.');
          }
        } else {
          addAssistantMessage(`오류: ${messageData.message}`);
        }
      }
      // 기타 일반 메시지 (ping, pong 제외)
      else if (messageData.message && messageData.message !== 'ping' && messageData.message !== 'pong') {
        addAssistantMessage(messageData.message, true, messageData.title || null);
      }
      // 직접 문자열 메시지 (JSON 파싱 실패 또는 단순 텍스트)
      else if (typeof messageData === 'string' && messageData !== 'ping' && messageData !== 'pong') {
        addAssistantMessage(messageData);
      }
      // 알 수 없는 형식의 메시지
      else {
        console.warn('알 수 없는 형식의 메시지:', messageData);
        //addAssistantMessage('알 수 없는 메시지 형식입니다.');
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
    generateAndSendChatId,

    loadChat,
    deleteChat,
    getAllChats,
    saveMessageToLocal,
    startNewChat,
    getNextChatId,

    processDisplayTextCommand,
  };
}