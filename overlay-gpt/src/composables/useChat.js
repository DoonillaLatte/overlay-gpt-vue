import { ref, nextTick } from 'vue';

export function useChat(hubConnectionRef) {
  const messages = ref([]);
  const inputMessage = ref('');
  const isWaitingForResponse = ref(false);
  const loadingText = ref('');
  const loadingInterval = ref(null);
  const chatId = ref(null);
  const lastReceivedProgramContext = ref(null); 
  const lastReceivedTargetProgram = ref(null); 

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
  const generateAndSendChatId = async (receivedTimestamp = null) => {
    if (chatId.value !== null) {
      console.log(`채팅 ID 이미 존재: ${chatId.value}. 새로 생성하지 않습니다.`);
     
      if (messages.value.length === 0) { 
        console.log('Explicit new chat initiated, forcing new chat ID generation.');
        chatId.value = null; 
      } else {
        return; 
      }
    }

    let currentChatId = chatId.value;
    if (currentChatId === null) {
      currentChatId = getNextChatId();

      // Local에 새 chatting 저장
      const chatList = getChatList();
      const newChat = {
        id: currentChatId,
        title: `Chat ${currentChatId}`,
        messages: []
      };

      chatList.push(newChat);
      saveChatList(chatList);

      chatId.value = currentChatId;
    }
    
    const timestampToUse = receivedTimestamp || new Date().toISOString();

    const payload = {
      command: "generate_chat_id",
      chat_id: currentChatId,
      generated_timestamp: timestampToUse
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
      chatList[chatIndex].lastUpdated = message.timestamp;

      // 첫 번째 사용자 메시지로 chatting 제목 업데이트
      // if (message.isUser && chatList[chatIndex].messages.filter(m => m.isUser).length === 1) {
      //   chatList[chatIndex].title = message.text.substring(0, 30) + (message.text.length > 30 ? '...' : '');
      // }

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
  const addAssistantMessage = (text, isNew = true, title = null, applyContent = null) => {
    const message = {
      text: text,
      title: title,
      isUser: false,
      isNew: isNew,
      chatId: chatId.value,
      timestamp: new Date().toISOString(),
      applyContent: applyContent  // dotnet 적용용 원본 HTML
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

    lastReceivedProgramContext.value = current_program || null;
    lastReceivedTargetProgram.value = target_program || null;

    // 채팅 목록에서 현재 채팅을 찾아 제목 update
    const chatList = getChatList();
    const chatIndex = chatList.findIndex(chat => chat.id === chat_id);
    
    if (chatIndex !== -1) {
      if (title && chatList[chatIndex].title.startsWith('Chat ')) {
        chatList[chatIndex].title = title;
      }
      chatList[chatIndex].lastUpdated = generated_timestamp;
      saveChatList(chatList);
      console.log(`채팅 ID ${chat_id}의 제목이 ${title}로 업데이트되었고 lastUpdated가 ${generated_timestamp}로 설정되었습니다.`);
    }

    // texts 배열이 비어있고 current_program.context가 존재하는 경우 처리
    if(texts.length === 0 && current_program && current_program.context) {
      const contentToDisplay = current_program.context;

      const newMessage = {
        text: '',
        title: title || null, 
        isUser: false,
        isNew: true,
        timestamp: generated_timestamp,
        chatId: chat_id,
        currentProgram: current_program,
        targetProgram: target_program,
        contentType: 'text_html', // context가 HTML 테이블
        content: contentToDisplay,
        isHtml: true, // HTML 렌더링을 위한 플래그
        isMarkdown: false,
        rawData: messageData
      };

      messages.value = [...messages.value, newMessage];
      saveMessageToLocal(newMessage);
      console.log('useChat.js : current_program.context로부터 메시지 추가됨:', newMessage);
    } else {
        // texts 배열이 있는 경우 기존 로직 유지
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
          isHtml: false,
          isMarkdown: false,
          rawData: textItem
        };

        // 타입별 처리
        switch(textItem.type) {
          case 'text_plain':
            newMessage.text = textItem.content;
            break;
          case 'text_to_apply':
            newMessage.text = textItem.content; // HTML 내용일 수 있으므로 text로 할당
            newMessage.isHtml = true; // HTML 렌더링을 위한 플래그
            newMessage.isMarkdown = false;
            break;
          default:
            newMessage.text = `[알 수 없는 타입: ${textItem.type}]`;
            break;
        }

        if (newMessage.isHtml && !newMessage.content && newMessage.text) {
          newMessage.content = newMessage.text;
        }

        messages.value = [...messages.value, newMessage];
        saveMessageToLocal(newMessage);
      });
    }

      // console.log('useChat.js: messages 배열 길이:', messages.value.length);

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
      
      const lastMessage = messages.value[messages.value.length - 1];
      if (lastMessage && lastMessage.currentProgram) {
          lastReceivedProgramContext.value = lastMessage.currentProgram;
      } else {
          lastReceivedProgramContext.value = null;
      }
      if (lastMessage && lastMessage.targetProgram) {
          lastReceivedTargetProgram.value = lastMessage.targetProgram;
      } else {
          lastReceivedTargetProgram.value = null;
      }

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
      lastReceivedProgramContext.value = null;
      lastReceivedTargetProgram.value = null;
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
    lastReceivedProgramContext.value = null; 
    lastReceivedTargetProgram.value = null;
    console.log('새 채팅을 시작합니다.');
    await generateAndSendChatId();
  };

  // 모든 메시지 삭제 및 새 채팅 시작
  const clearChatAndStartNew = async (receivedTimestamp = null) => {
    chatId.value = null;
    messages.value = [];
    lastReceivedProgramContext.value = null;
    lastReceivedTargetProgram.value = null; 
    await generateAndSendChatId(receivedTimestamp); 
    console.log('채팅이 초기화되고 새로운 채팅이 시작되었습니다.');
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
    try {
      let messageData;
      if (typeof data === 'string') {
        messageData = JSON.parse(data);
      } else {
        messageData = data;
      }

      // display_text 명령은 이 함수에서 처리하지 않음. App.js에서 처리하도록 위임.
      if (messageData.command === 'display_text') {
        console.log('useChat.js: display_text 명령 수신. 이 함수에서는 처리하지 않고 반환합니다.');
        removeLoadingIndicator();
        setWaitingForResponse(false);
        return; 
      }

      removeLoadingIndicator();
      setWaitingForResponse(false); 

      // 'response_single_generated_response' 처리
      if (messageData.command === 'response_single_generated_response') {
        if (messageData.status === 'success') {
          if (messageData.message && messageData.message !== 'pong') {
            addAssistantMessage(
              messageData.message, 
              true, 
              messageData.title || null, 
              messageData.apply_message || null  // dotnet 적용용 원본 HTML
            );
          } else if (messageData.message === 'pong') {
            console.log('Pong received from ReceiveMessage.');
          }
        } else {
          addAssistantMessage(`오류: ${messageData.message}`);
        }
      }
      // pong 응답 처리 (keep-alive 확인)
      else if (messageData.command === 'pong') {
        console.log('Keep-alive pong received:', messageData.timestamp);
        // pong 메시지는 UI에 표시하지 않음
        return;
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
        //console.warn('알 수 없는 형식의 메시지:', messageData);
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
        chatId.value = messageData.chat_id;
        console.log('채팅 ID 설정됨:', chatId.value);
      }
    } catch (error) {
      console.error('ReceiveGeneratedChatId 처리 중 오류:', error);
    }
  };

  // 메시지 배열 초기화 함수
  const clearMessages = () => {
    messages.value = [];
    lastReceivedProgramContext.value = null;
    lastReceivedTargetProgram.value = null;
    console.log('채팅 메시지가 초기화되었습니다.');
  };

  const setWaitingForResponse = (value) => {
    isWaitingForResponse.value = value;
  };

  const clearInput = () => {
    inputMessage.value = '';
  };

  const cleanup = () => {
    stopLoadingAnimation();
  };

  return {
    messages,
    inputMessage,
    isWaitingForResponse,
    loadingText,
    chatId,
    lastReceivedProgramContext,
    lastReceivedTargetProgram,

    addUserMessage,
    addAssistantMessage,
    generateAndSendChatId,
    processDisplayTextCommand,
    loadChat,
    deleteChat,
    getAllChats,
    startNewChat,
    clearChatAndStartNew,
    addLoadingIndicator,
    removeLoadingIndicator,
    scrollToBottom,
    processReceivedMessage,
    processGeneratedChatId,
    setWaitingForResponse,
    clearInput,
    cleanup,
    clearMessages
  };
}