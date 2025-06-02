<template>
  <div class="connect-apps-modal-full-screen">
    <div class="drag-region">
      <div class="left-section">
        <button class="back-button" @click="$emit('back')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M12 19L5 12L12 5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          </button>
      </div>
      <div class="center-section">
        <h1 class="bold-text">Overlay Helper</h1>
      </div>
      <div class="right-section">
        <button class="window-button bold-text" @click="$emit('minimize')">−</button>
        <button class="window-button bold-text" @click="$emit('maximizeRestore')">{{ isMaximized ? '🗗' : '□' }}</button>
        <button class="window-button bold-text" @click="$emit('close')">X</button>
      </div>
    </div>

    <div class="modal-content">
      <div class="modal-header">
        <h2>어떤 앱과 연결할까요?</h2>
      </div>

      <div class="apps-grid">
        <button class="app-item" @click="connectApp('word')">
          <div class="app-icon word-icon">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="40" height="40" rx="8" fill="#2B579A"/>
              <path d="M8.5 10.5h23v19h-23z" fill="white"/>
              <path d="M13 16h14v2h-14zm0 4h14v2h-14zm0 4h10v2h-10z" fill="#2B579A"/>
            </svg>
          </div>
          <span class="app-name">Word</span>
        </button>

        <button class="app-item" @click="connectApp('excel')">
          <div class="app-icon excel-icon">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="40" height="40" rx="8" fill="#217346"/>
              <path d="M8.5 10.5h23v19h-23z" fill="white"/>
              <path d="M12 14h4v4h-4zm6 0h4v4h-4zm6 0h4v4h-4zm-12 6h4v4h-4zm6 0h4v4h-4zm6 0h4v4h-4z" fill="#217346"/>
            </svg>
          </div>
          <span class="app-name">Excel</span>
        </button>

        <button class="app-item" @click="connectApp('powerpoint')">
          <div class="app-icon powerpoint-icon">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="40" height="40" rx="8" fill="#D24726"/>
              <path d="M8.5 10.5h23v19h-23z" fill="white"/>
              <circle cx="20" cy="20" r="6" fill="#D24726"/>
              <path d="M17 17l6 3-6 3z" fill="white"/>
            </svg>
          </div>
          <span class="app-name">PowerPoint</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ConnectAppsModal',
  props: {
    selectedText: {
      type: String,
      default: ''
    },
    isMaximized: {
      type: Boolean,
      default: false
    }
  },
  emits: ['back', 'app-connected', 'minimize', 'maximizeRestore', 'close'],
  methods: {
    connectApp(appType) {
      console.log(`Connecting to ${appType}...`);
      this.$emit('app-connected', appType);
    }
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap');

.connect-apps-modal-full-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: #212121;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 0;
  box-sizing: border-box;
  z-index: 9999;
  border-radius: 25px;
  overflow: hidden;
}

.drag-region {
  -webkit-app-region: drag;
  width: 100%;
  height: 50px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  background: transparent;
  z-index: 10000;
}

.left-section {
  display: flex;
  align-items: center;
  padding-left: 15px;
  z-index: 2;
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
}

.center-section {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  color: white;
  z-index: 1;
  white-space: nowrap;
  font-family: 'Inter', sans-serif;
  font-weight: 900;
}

.right-section {
  display: flex;
  align-items: center;
  padding-right: 15px;
  z-index: 2;
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
}

.window-button {
  -webkit-app-region: no-drag;
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 14px;
  margin-left: 8px;
  width: 28px; /* 통일된 크기 */
  height: 28px; /* 통일된 크기 */
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 6px; /* 둥근 모서리 */
  transition: background-color 0.2s ease;
  font-weight: 400;
}

.window-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.window-button:active {
  background-color: rgba(255, 255, 255, 0.2);
}

.modal-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 20px;
  box-sizing: border-box;
}

.modal-header {
  text-align: center;
  margin-bottom: 40px;
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 500;
  margin: 0;
  font-family: 'Inter', sans-serif;
  color: white;
}

.apps-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 40px;
  max-width: 400px;
  width: 100%;
}

.app-item {
  background-color: #C4C4C4;
  border: none;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 120px;
  box-sizing: border-box;
}

.app-item:hover {
  background-color: #D4D4D4;
  transform: translateY(-2px);
}

.app-item:active {
  transform: translateY(0);
}

.app-icon {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  border-radius: 8px;
}

.app-name {
  font-size: 14px;
  font-weight: 500;
  color: black;
  font-family: 'Inter', sans-serif;
}

.back-button {
  -webkit-app-region: no-drag;
  background: transparent; /* 배경을 투명하게 */
  border: none; /* 테두리 제거 */
  color: white;
  cursor: pointer;
  font-size: 14px; /* window-button과 동일한 폰트 사이즈 */
  width: 28px; /* window-button과 동일한 너비 */
  height: 28px; /* window-button과 동일한 높이 */
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 6px; /* window-button과 동일한 둥근 모서리 */
  transition: background-color 0.2s ease; /* window-button과 동일한 애니메이션 */
  font-weight: 400; /* window-button과 동일한 폰트 굵기 */
  margin-left: 0; /* left-section의 padding-left로 충분히 간격이 확보됨 */
}

.back-button:hover {
  background-color: rgba(255, 255, 255, 0.1); /* window-button과 동일한 hover 효과 */
}

.back-button:active {
  background-color: rgba(255, 255, 255, 0.2); /* window-button과 동일한 active 효과 */
}
</style>