<<<<<<< HEAD
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

=======
>>>>>>> a7dfc848f99ea786752f250c90fb95b294679135
export default {
  data() {
    return {
      messages: [],
      inputMessage: '',
      chatId: 1, // 채팅 id (임의로 설정)
      isWaitingForResponse: false,
<<<<<<< HEAD
      connection: null,
      isConnected: false,
      isReconnecting: false, // 재연결 시도 중인지 여부를 추적하는 플래그 추가
      reconnectAttempts: 0,
      maxReconnectAttempts: 5,
      testMessage: '테스트 메시지입니다.',
      // 테스트용 예제 데이터 추가
      testData: {
        command: "request_single_generated_response",
        chat_id: 1,
        prompt: "엑셀 파일의 A1 셀에 'Hello'를 입력하고 B1 셀에 'World'를 입력해주세요.",
        request_type: 1,
        description: "엑셀 파일에 텍스트 입력 요청",
        current_program: {
          id: 12345,
          type: "excel",
          context: "현재 열려있는 엑셀 파일의 내용"
        },
        target_program: {
          id: 12345,
          type: "excel",
          context: "수정할 엑셀 파일의 내용"
        }
      },
      keepAliveInterval: null,
      connectionMonitorInterval: null,
      pendingMessage: null, // 대기 중인 메시지를 저장할 변수 추가
=======
      socket: null,
      isSocketConnected: false,
      reconnectAttempts: 0,
      maxReconnectAttempts: 5,
>>>>>>> a7dfc848f99ea786752f250c90fb95b294679135
    }
  },
  methods: {
    // 창 닫기
    closeWindow() {
      window.close();
    },

    // socket 연결 설정
<<<<<<< HEAD
    async setupConnection() {
      if (this.isReconnecting) {
        console.log('이미 재연결 시도 중입니다.');
        return;
      }

      this.isReconnecting = true;

      try {
        // 기존 연결 정리
        await this.cleanupConnection();

        // 새로운 연결 생성
        this.connection = new HubConnectionBuilder()
          .withUrl('http://127.0.0.1:8080/chatHub', {
            skipNegotiation: false,
            transport: 0,
            withCredentials: false
          })
          .withAutomaticReconnect({
            nextRetryDelayInMilliseconds: (retryContext) => {
              if (retryContext.previousRetryCount >= 5) {
                this.isReconnecting = false;
                return null;
              }
              const delays = [0, 2000, 5000, 10000, 20000, 30000];
              return delays[retryContext.previousRetryCount] || 30000;
            }
          })
          .configureLogging(LogLevel.Debug)
          .withKeepAliveInterval(60000)
          .build();

        // 이벤트 핸들러 등록
        this.setupEventHandlers();

        // Electron 환경에서 WebSocket 연결 설정
        if (window.electron) {
          await this.setupElectronConnection();
        } else {
          await this.startConnection();
        }

      } catch (err) {
        console.error('SignalR 연결 설정 중 오류:', err);
        this.handleConnectionError();
      }
    },

    // 연결 정리 메서드
    async cleanupConnection() {
      if (this.keepAliveInterval) {
        clearInterval(this.keepAliveInterval);
        this.keepAliveInterval = null;
      }

      if (this.connection) {
        try {
          await this.connection.stop();
        } catch (error) {
          console.error('기존 연결 정리 중 오류:', error);
        }
        this.connection = null;
      }
      this.isConnected = false;
    },

    // 이벤트 핸들러 설정
    setupEventHandlers() {
      if (!this.connection) return;

    this.connection.on('ReceiveMessage', (data) => {
      console.log('받은 메시지:', data);
      try {
        let messageData;
        if (typeof data === 'string') {
          messageData = JSON.parse(data);
        } else {
          messageData = data;
        }
      
        console.log('파싱된 메시지 데이터:', messageData);
      
        // Flask에서 오는 응답 처리
        if (messageData.command === 'response_single_generated_response') {
          if (messageData.status === 'success') {
            // pong 메시지는 출력하지 않음
            if (messageData.message === 'pong') {
              console.log('Pong received');
              return;
            }
            this.messages.push({
              text: messageData.message,
              isUser: false
            });
          } else {
            this.messages.push({
              text: `오류: ${messageData.message}`,
              isUser: false
            });
          }
        } 
        // 일반적인 메시지 처리 
        else if (messageData.message && messageData.message !== 'ping' && messageData.message !== 'pong') {
          this.messages.push({
            text: messageData.message,
            isUser: messageData.isUser || false
          });
        }
        // 기본적인 텍스트 메시지 처리 
        else if (typeof messageData === 'string' && messageData !== 'ping' && messageData !== 'pong') {
          this.messages.push({
            text: messageData,
            isUser: false
          });
        }
        else if (messageData.message !== 'ping' && messageData.message !== 'pong') {
          this.messages.push({
            text: JSON.stringify(messageData, null, 2),
            isUser: false
          });
        }
      
        this.isWaitingForResponse = false;
        this.$nextTick(() => {
          this.scrollToBottom();
        });
      } catch (error) {
        console.error('메시지 처리 중 오류:', error);
        this.messages.push({
          text: `메시지 처리 오류: ${error.message}`,
          isUser: false
        });
      }
    });

      this.connection.onreconnecting((error) => {
        console.log('재연결 시도 중:', error);
        this.isConnected = false;
        this.messages.push({
          text: `서버와의 연결이 끊어졌습니다. 재연결을 시도합니다...`,
          isUser: false
        });
      });

      this.connection.onreconnected((connectionId) => {
        console.log('재연결 성공:', connectionId);
        this.isConnected = true;
        this.isReconnecting = false;
        this.messages.push({
          text: '서버와의 연결이 복구되었습니다.',
          isUser: false
        });
      });

      this.connection.onclose((error) => {
        console.log('연결이 종료되었습니다:', error);
        this.handleConnectionError();
      });
    },

    // Electron 연결 설정
    async setupElectronConnection() {
      return new Promise((resolve, reject) => {
        const cleanup = () => {
          window.electron.ipcRenderer.removeListener('websocket-connected', onConnected);
          window.electron.ipcRenderer.removeListener('websocket-error', onError);
          window.electron.ipcRenderer.removeListener('websocket-closed', onClosed);
        };

        const onConnected = async () => {
          try {
            await this.startConnection();
            cleanup();
            resolve();
          } catch (error) {
            cleanup();
            reject(error);
          }
        };

        const onError = (error) => {
          console.error('WebSocket 오류:', error);
          cleanup();
          reject(error);
        };

        const onClosed = () => {
          console.log('WebSocket 연결 종료');
          cleanup();
          reject(new Error('WebSocket closed'));
        };

        window.electron.ipcRenderer.on('websocket-connected', onConnected);
        window.electron.ipcRenderer.on('websocket-error', onError);
        window.electron.ipcRenderer.on('websocket-closed', onClosed);

        window.electron.ipcRenderer.send('setup-websocket', {
          url: 'ws://127.0.0.1:8080/chatHub'
        });
      });
    },

    // 연결 시작
    async startConnection() {
      if (!this.connection) {
        throw new Error('Connection not initialized');
      }

      await this.connection.start();
      console.log('SignalR 연결 성공');
      this.isConnected = true;
      this.isReconnecting = false;
      this.reconnectAttempts = 0;

      this.messages.push({
        text: '서버와 연결되었습니다.',
        isUser: false
      });

      if (this.pendingMessage) {
        const messageToSend = this.pendingMessage;
        this.pendingMessage = null;
        this.inputMessage = messageToSend;
        await this.sendMessage();
      }

      this.startKeepAlive();
    },

    // 연결 오류 처리
    handleConnectionError() {
      this.isConnected = false;
      this.isReconnecting = false;
      this.messages.push({
        text: '서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.',
        isUser: false
      });

      // 5초 후 재연결 시도
      setTimeout(async () => {
        if (!this.isConnected && !this.isReconnecting) {
          await this.setupConnection();
        }
      }, 5000);
    },

    // 메시지 출력
    async sendMessage() {
      if (this.inputMessage.trim() === '' || this.isWaitingForResponse) return;
      
      this.messages.push({
        text: this.inputMessage,
        isUser: true
=======
    setupSocketConnection() {
      if(this.socket) {
        this.socket.close();
      }

      // web socket 연결 성정
      this.socket = new WebSocket('ws://localhost:5000');

      // socket 연결 성공 event
      this.socket.onopen = () => {
        console.log('소켓 연결 성공');
        this.isSocketConnected = true;
        this.reconnectAttempts = 0;
      };

      // socket 메시지 수신 이벤트
      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          // 명령어에 따른 처리
          if(message.command === 'display_text') {
            // 서버가 전송한 text 표시
            this.messages.push({
              text: message.text,
              isUser: false
            });
          }
          else if(message.command === 'response_success') {
            // 성공 응답 처리
            this.messages.push({
              text: message.response,
              isUser: false
            });
            this.isWaitingForResponse = false;
          }
          else if(message.command === 'response_failure') {
            // 실패 응답 처리
            this.messages.push({
              text: `오류: ${message.error}`,
              isUser: false
            });
            this.isWaitingForResponse = false;
          }

          this.$nextTick(() => {
            this.scrollToBottom();
          });
        } catch(error) {
          console.error('소켓 메시지 처리 중 오류:', error);
        }
      };

      // socket 오류 이벤트
      this.socket.onerror = (error) => {
        console.error('소켓 오류: ', error);
        this.isSocketConnected = false;
      };

      // socket 연결 종료 이벤트
      this.socket.onclose = () => {
        console.log('소켓 연결 종료');
        this.isSocketConnected = false;

        // 자동 재연결 시도
        if(this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`소켓 재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
          setTimeout(() => {
            this.setupSocketConnection();
          }, 3000);
        } else {
          console.error('최대 재연결 시도 횟수 초과');
        }
      }
    },

    // 메시지 출력
    sendMessage() {
      if (this.inputMessage.trim() === '' || this.isWaitingForResponse) return;
      
      // 사용자 메시지 UI에 추가
      this.messages.push({
        text: this.inputMessage,
        isUser: true,
        // 당장은 시간은 필요 X
        // timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
>>>>>>> a7dfc848f99ea786752f250c90fb95b294679135
      });

      const userMessage = this.inputMessage;
      this.inputMessage = '';

<<<<<<< HEAD
      if(!this.isConnected || (this.connection && this.connection.state !== 'Connected')) {
        console.log('연결이 끊어져 있습니다. 재연결을 시도합니다...');
        this.pendingMessage = userMessage; // 메시지 저장
        await this.setupConnection(); // 재연결 시도
        return;
      }

      try {
        this.isWaitingForResponse = true;

        const messageData = {
          command: 'send_user_prompt',
          chat_id: this.chatId,
          prompt: userMessage,
          request_type: 1,
          description: '',
          current_program: null,
          target_program: null
        };

        await this.connection.invoke('SendMessage', messageData);

        this.$nextTick(() => {
          this.scrollToBottom();
        });
      } catch(error) {
        console.error('메시지 전송 중 오류:', error);
        this.isWaitingForResponse = false;
        this.messages.push({
          text: '메시지 전송 중 오류가 발생했습니다. 다시 시도해주세요.',
          isUser: false
        });
        this.$nextTick(() => {
          this.scrollToBottom();
        });
      }
=======
    // 소켓이 연결되어 있는지 확인
    if(!this.isSocketConnected) {
      console.error('소켓 연결이 없습니다');
      this.messages.push({
        text:'서버와의 연결이 끊어졌습니다. 페이지를 새로고침하거나 잠시 후 다시 시도하세요.',
      });

      this.$nextTick(() => {
        this.scrollToBottom();
      });

      return;
    }

    // 소켓 통신을 통해 메시지 전송
    try {
      this.isWaitingForResponse = true;

      // send_user_prompt
      const messageData = {
        command : 'send_user_prompt',
        chat_id: this.chatId,
        prompt: userMessage,
        target_program: null
      };

      this.socket.send(JSON.stringify(messageData));

      this.$nextTick(() => {
        this.scrollToBottom();
      });
    } catch(error) {
      console.error('메시지 전송 중 오류:', error);
      this.isWaitingForResponse = false;

      // 오류 메시지 표시
      this.messages.push({
        text: '메시지 전송 중 오류가 발생했습니다. 다시 시도해주세요.',
        isUser: false
      });

      this.$nextTick(() => {
        this.scrollToBottom();
      });
    }
>>>>>>> a7dfc848f99ea786752f250c90fb95b294679135
    },

    scrollToBottom() {
      const chatContainer = this.$refs.chatContainer;
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    },
    handleKeyDown(event) {
      // shift + enter 눌렀을 때 한줄 아래로 내려가는 기능 구현 필요
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        this.sendMessage();
      }
    },

    // 응답 적용 요청
<<<<<<< HEAD
    async applyResponse() {
      if(!this.isConnected) {
        console.error('연결이 없습니다');
=======
    applyResponse() {
      if(!this.isSocketConnected) {
        console.error('소켓 연결이 없습니다');
>>>>>>> a7dfc848f99ea786752f250c90fb95b294679135
        return;
      }

      try {
<<<<<<< HEAD
=======
        // apply_response
>>>>>>> a7dfc848f99ea786752f250c90fb95b294679135
        const messageData = {
          command: 'apply_response',
          chat_id: this.chatId
        };

<<<<<<< HEAD
        await this.connection.invoke('SendMessage', messageData);
=======
        this.socket.send(JSON(stringify(messageData)));
>>>>>>> a7dfc848f99ea786752f250c90fb95b294679135
      } catch(error) {
        console.error('응답 적용 요청 중 오류:', error);
      }
    },

    // 응답 취소 요청
<<<<<<< HEAD
    async cancelResponse() {
      if(!this.isConnected) {
        console.error('연결이 없습니다');
=======
    cancleResponse() {
      if(!this.isSocketConnected) {
        console.error('소켓 연결이 없습니다');
>>>>>>> a7dfc848f99ea786752f250c90fb95b294679135
        return;
      }

      try {
<<<<<<< HEAD
        const messageData = {
          command: 'cancel_response',
          chat_id: this.chatId
        };

        await this.connection.invoke('SendMessage', messageData);
      } catch(error) {
        console.error('응답 취소 요청 중 오류:', error);
      }
    },

    // 테스트 메시지 전송
    async sendTestMessage() {
      if(!this.isConnected) {
        console.error('연결이 없습니다');
        this.messages.push({
          text: '서버와의 연결이 끊어졌습니다. 페이지를 새로고침하거나 잠시 후 다시 시도하세요.',
          isUser: false
        });
        return;
      }

      try {
        await this.connection.invoke('SendMessage', this.testData);
        this.messages.push({
          text: this.testData.prompt,
          isUser: true
        });
      } catch(error) {
        console.error('테스트 메시지 전송 중 오류:', error);
        this.messages.push({
          text: '테스트 메시지 전송 중 오류가 발생했습니다.',
          isUser: false
        });
      }
    },

    // Keep-alive 설정
    startKeepAlive() {
      if (this.keepAliveInterval) {
        clearInterval(this.keepAliveInterval);
      }

      this.keepAliveInterval = setInterval(async () => {
        if (this.isConnected && this.connection && this.connection.state === 'Connected') {
          try {
            await this.connection.invoke('Ping');
          } catch (error) {
            console.error('Ping 실패:', error);
            this.handleConnectionError();
          }
        }
      }, 30000);
    },
  },
  // component mount시 socket 연결 설정
  async mounted() {
    await this.setupConnection();
  },

  // unmounte 시 socket 연결  종료
  async beforeUnmount() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
    }
    if (this.connection) {
      await this.connection.stop();
=======
        // apply_response
        const messageData = {
          command: 'apply_response',
          chat_id: this.chatId
        };

        this.socket.send(JSON(stringify(messageData)));
      } catch(error) {
        console.error('응답 취소 요청 중 오류:', error);
      }
    }
  },
  // component mount시 socket 연결 설정
  mounted() {
    this.setupSocketConnection();
  },

  // unmounte 시 socket 연결  종료
  beforeUnmount() {
    if(this.socket && this.isSocketConnected) {
      this.socket.close();
>>>>>>> a7dfc848f99ea786752f250c90fb95b294679135
    }
  }
}