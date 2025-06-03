<template>
  <div class="connect-apps-modal-full-screen">
    <div class="drag-region">
      <div class="left-section">
        <button class="window-button" @click="testBackButtonClick">
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
      <div class="logo-container">
        <img src="@/assets/ovhp-logo.png" alt="Overlay Helper Logo" class="app-logo" />
      </div>
      <div class="modal-header">
        <h2>어떤 앱과 연결할까요?</h2>
      </div>

      <div class="apps-grid">
        <button class="app-item" @click="connectApp('word')">
          <div class="app-icon-wrapper word-icon">
            <img src="@/assets/word.png" class="app-icon" />
          </div>
          <span class="app-name">Word</span>
        </button>

        <button class="app-item" @click="connectApp('excel')">
          <div class="app-icon-wrapper excel-icon">
            <div class="app-icon-wrapper">
              <img src="@/assets/excel.png" class="app-icon" />
            </div>
          </div>
          <span class="app-name">Excel</span>
        </button>

        <button class="app-item" @click="connectApp('powerpoint')">
          <div class="app-icon-wrapper ppt-icon">
            <div class="app-icon-wrapper">
              <img src="@/assets/ppt.png" class="app-icon" />
            </div>
            </div>
          <span class="app-name">PowerPoint</span>
        </button>

        <button class="app-item" @click="connectApp('powerpoint')">
          <div class="app-icon-wrapper hancom-icon">
            <div class="app-icon-wrapper">
              <img src="@/assets/hancom.png" class="app-icon" />
            </div>
            </div>
          <span class="app-name">한글과컴퓨터</span>
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
    },
    // App.js로부터 현재 프로그램 컨텍스트를 받기 위한 새로운 prop
    currentProgramContext: {
      type: Object,
      default: null
    },
    // App.js로부터 마지막으로 받은 target program을 받기 위한 새로운 prop
    lastReceivedTargetProgram: {
      type: Object,
      default: null
    }
  },
  emits: ['back', 'app-connected', 'minimize', 'maximizeRestore', 'close'],
  methods: {
    connectApp(appType) {
      console.log(`Connecting to ${appType}...`);
      // currentProgramContext와 lastReceivedTargetProgram 정보를 JSON 형식으로 콘솔에 출력
      console.log('Current Program Context (JSON):', JSON.stringify(this.currentProgramContext, null, 2));
      console.log('Last Received Target Program (JSON):', JSON.stringify(this.lastReceivedTargetProgram, null, 2));
      // 'app-connected' 이벤트를 발생시키면서 필요한 모든 정보를 함께 전달
      this.$emit('app-connected', appType, this.currentProgramContext, this.lastReceivedTargetProgram);
    },
    testBackButtonClick() {
      this.$emit('back');
    }
  }
}
</script>

<style src="./ConnectAppsModal.css">
</style>