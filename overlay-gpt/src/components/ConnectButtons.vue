<template>
  <div class="connect-apps-modal-full-screen">
    <div class="drag-region">
      <div class="left-section">
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

      <div class="modal-footer">
        <button class="back-button" @click="$emit('back')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M12 19L5 12L12 5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          이전
        </button>
      </div>
    </div>

    <div v-if="selectedText" class="selected-text-display">
      <h3 class="selected-text-title">선택한 텍스트</h3>
      <div class="selected-text-content">
        <p>{{ selectedText }}</p>
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
.connect-apps-modal-full-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: #212121; /* Full screen background */
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start; /* Align content to the top to accommodate drag-region */
  padding: 0; /* Remove padding here as content will be in modal-content */
  box-sizing: border-box;
  z-index: 9999; /* Ensure it's on top */
}

/* Replicated drag-region styles from App.css */
.drag-region {
  -webkit-app-region: drag;
  width: 100%;
  height: 50px; /* Fixed height for drag region */
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  background: transparent;
  z-index: 10000; /* Ensure drag-region is always on top within the modal */
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
  font-size: 8px; /* Adjust font size as needed */
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
  width: 28px;
  height: 28px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 6px;
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
  flex: 1; /* Allows modal content to take remaining space */
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

.modal-footer {
  position: absolute;
  bottom: 20px;
  left: 20px;
  z-index: 10001; /* Ensure footer is above other elements */
}

.back-button {
  background-color: #424242;
  border: none;
  border-radius: 20px;
  padding: 10px 16px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-family: 'Inter', sans-serif;
  font-weight: 400;
  transition: background-color 0.2s ease;
}

.back-button:hover {
  background-color: #525252;
}

.selected-text-display {
  position: absolute; /* Changed to absolute to be on top of the full screen */
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 40px);
  max-width: 500px;
  background-color: #D9D9D9;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
  max-height: 120px;
  overflow-y: auto;
  z-index: 10002; /* Higher z-index to bring it to the very front */
}

.selected-text-title {
  font-size: 14px;
  font-weight: bold;
  color: black;
  margin: 0 0 10px 0;
  font-family: 'Inter', sans-serif;
}

.selected-text-content {
  background-color: #D9D9D9;
  border-radius: 4px;
  color: black;
  font-size: 13px;
  line-height: 1.4;
  font-family: 'Inter', sans-serif;
}

.selected-text-content p {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.selected-text-display::-webkit-scrollbar {
  width: 6px;
}

.selected-text-display::-webkit-scrollbar-thumb {
  background-color: #424242;
  border-radius: 3px;
}

.selected-text-display::-webkit-scrollbar-track {
  background-color: transparent;
}
</style>