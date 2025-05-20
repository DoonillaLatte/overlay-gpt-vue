import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

export default {
  data() {
    return {
      messages: [],
      inputMessage: '',
      chatId: 1, // 채팅 id (임의로 설정)
      isWaitingForResponse: false,
      connection: null,
      isConnected: false,
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
      connectionMonitorInterval: null
    }
  },
  methods: {
    // 창 닫기
    closeWindow() {
      window.close();
    },

    // socket 연결 설정
    async setupConnection() {
      if(this.connection) {
        await this.connection.stop();
      }

      this.connection = new HubConnectionBuilder()
        .withUrl('http://127.0.0.1:8080/chatHub', {
          skipNegotiation: false,
          transport: 0, // 0: Auto, 1: WebSockets, 2: ServerSentEvents, 3: LongPolling
          withCredentials: false
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 20000])
        .configureLogging(LogLevel.Debug)
        .withKeepAliveInterval(15000) // 15초마다 keep-alive 메시지 전송
        .withServerTimeout(30000) // 서버 응답 대기 시간 30초
        .build();

      try {
        // Electron 환경에서 WebSocket 연결을 위한 설정
        if (window.electron) {
          // Electron의 IPC를 통해 WebSocket 연결 설정
          window.electron.ipcRenderer.send('setup-websocket', {
            url: 'ws://127.0.0.1:8080/chatHub'
          });

          window.electron.ipcRenderer.on('websocket-connected', async () => {
            try {
              await this.connection.start();
              console.log('SignalR 연결 성공');
              this.isConnected = true;
              this.reconnectAttempts = 0;
              this.messages.push({
                text: '서버와 연결되었습니다.',
                isUser: false
              });

              // 연결 유지를 위한 주기적인 ping
              this.startKeepAlive();
            } catch (err) {
              console.error('SignalR 연결 오류:', err);
              this.isConnected = false;
              this.messages.push({
                text: '서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.',
                isUser: false
              });
            }
          });

          window.electron.ipcRenderer.on('websocket-error', (error) => {
            console.error('WebSocket 오류:', error);
            this.isConnected = false;
          });

          window.electron.ipcRenderer.on('websocket-closed', () => {
            console.log('WebSocket 연결 종료');
            this.isConnected = false;
          });
        } else {
          await this.connection.start();
          console.log('SignalR 연결 성공');
          this.isConnected = true;
          this.reconnectAttempts = 0;
        }

        // 메시지 수신 이벤트 핸들러 등록
        this.connection.on('ReceiveMessage', (message) => {
          console.log('받은 메시지:', message);
          try {
            if(message.status === 'success') {
              this.messages.push({
                text: message.message,
                isUser: false
              });
            } else {
              this.messages.push({
                text: `오류: ${message.message}`,
                isUser: false
              });
            }
            this.isWaitingForResponse = false;
            this.$nextTick(() => {
              this.scrollToBottom();
            });
          } catch(error) {
            console.error('메시지 처리 중 오류:', error);
          }
        });

      } catch (err) {
        console.error('SignalR 연결 오류:', err);
        this.isConnected = false;
      }

      this.connection.onreconnecting((error) => {
        console.log('재연결 시도 중:', error);
        this.isConnected = false;
        this.messages.push({
          text: '서버와의 연결이 끊어졌습니다. 재연결을 시도합니다...',
          isUser: false
        });
      });

      this.connection.onreconnected((connectionId) => {
        console.log('재연결 성공:', connectionId);
        this.isConnected = true;
        this.messages.push({
          text: '서버와 재연결되었습니다.',
          isUser: false
        });
      });

      this.connection.onclose((error) => {
        console.log('연결 종료:', error);
        this.isConnected = false;
        this.messages.push({
          text: '서버와의 연결이 끊어졌습니다. 재연결을 시도합니다...',
          isUser: false
        });
        
        // 연결이 끊어지면 3초 후 재연결 시도
        setTimeout(() => {
          if (!this.isConnected) {
            console.log('자동 재연결 시도...');
            this.setupConnection();
          }
        }, 3000);
      });

      // 연결 상태 모니터링
      this.startConnectionMonitor();
    },

    // 연결 상태 모니터링 메서드
    startConnectionMonitor() {
      this.connectionMonitorInterval = setInterval(() => {
        if (!this.isConnected) {
          console.log('연결 상태 모니터링: 연결 끊김 감지, 재연결 시도...');
          this.setupConnection();
        }
      }, 5000); // 5초마다 연결 상태 확인
    },

    // 메시지 출력
    async sendMessage() {
      if (this.inputMessage.trim() === '' || this.isWaitingForResponse) return;
      
      this.messages.push({
        text: this.inputMessage,
        isUser: true
      });

      const userMessage = this.inputMessage;
      this.inputMessage = '';

      if(!this.isConnected) {
        console.error('연결이 없습니다');
        this.messages.push({
          text:'서버와의 연결이 끊어졌습니다. 페이지를 새로고침하거나 잠시 후 다시 시도하세요.',
        });
        this.$nextTick(() => {
          this.scrollToBottom();
        });
        return;
      }

      try {
        this.isWaitingForResponse = true;

        const messageData = {
          command: 'send_user_prompt',
          content: {
            chat_id: this.chatId,
            prompt: userMessage,
            request_type: 1,
            description: '',
            current_program: null,
            target_program: null
          }
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
    async applyResponse() {
      if(!this.isConnected) {
        console.error('연결이 없습니다');
        return;
      }

      try {
        const messageData = {
          command: 'apply_response',
          chat_id: this.chatId
        };

        await this.connection.invoke('SendMessage', messageData);
      } catch(error) {
        console.error('응답 적용 요청 중 오류:', error);
      }
    },

    // 응답 취소 요청
    async cancelResponse() {
      if(!this.isConnected) {
        console.error('연결이 없습니다');
        return;
      }

      try {
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

    // 연결 유지를 위한 ping 메서드 추가
    startKeepAlive() {
      this.keepAliveInterval = setInterval(async () => {
        if (this.isConnected) {
          try {
            await this.connection.invoke('Ping');
          } catch (error) {
            console.error('Ping 실패:', error);
            this.isConnected = false;
            // 연결이 끊어진 경우 재연결 시도
            this.setupConnection();
          }
        }
      }, 30000); // 30초마다 ping
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
    }
  }
}