export const SIGNALR_CONFIG = {
  HUB_URL: 'http://127.0.0.1:8080/chatHub',
  KEEP_ALIVE_INTERVAL: 30000,
  MAX_RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAYS: [0, 2000, 5000, 10000, 20000, 30000]
};

export const TEXTAREA_CONFIG = {
  MIN_HEIGHT: 24,
  MAX_HEIGHT: 120,
  CONTAINER_PADDING: 32
};

export const TEST_DATA = {
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
};