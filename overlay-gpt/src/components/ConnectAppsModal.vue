<template>
  <div class="connect-apps-modal-full-screen">
    <div class="drag-region" v-if="!showSelectWorkflowsModal">
      <div class="left-section">
        <button class="back-button" @click="testBackButtonClick">
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

    <div class="modal-content-connect">
      <div class="logo-container">
        <img src="@/assets/ovhp-logo.png" alt="Overlay Helper Logo" class="app-logo" />
      </div>
      <div class="modal-header">
        <h2>어떤 앱과 연결할까요?</h2>
      </div>

      <div class="apps-grid">
        <button class="app-item" @click="connectApp('Word')">
          <div class="app-icon-wrapper">
            <img src="/images/Word.png" class="app-icon" />
          </div>
          <span class="app-name">Word</span>
        </button>

        <button class="app-item" @click="connectApp('Excel')">
          <div class="app-icon-wrapper">
            <img src="/images/Excel.png" class="app-icon" />
          </div>
          <span class="app-name">Excel</span>
        </button>

        <button class="app-item" @click="connectApp('PowerPoint')">
          <div class="app-icon-wrapper">
            <img src="/images/PowerPoint.png" class="app-icon" />
          </div>
          <span class="app-name">PowerPoint</span>
        </button>

        <button class="app-item" @click="connectApp('Hwp')">
          <div class="app-icon-wrapper">
            <img src="/images/Hwp.png" class="app-icon" />
          </div>
          <span class="app-name">HWP</span>
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
  emits: ['back', 'app-connected', 'minimize', 'maximizeRestore', 'close', 'request-top-workflows'],
  data() {
    return {
      connectedApp: ''
    };
  },
  methods: {
    connectApp(appType) {
      console.log(`${appType}에 연결 중...`);
      let appName;
      switch (appType) {
        case 'Word':
          appName = 'Word';
          break;
        case 'Excel':
          appName = 'Excel';
          break;
        case 'PowerPoint':
          appName = 'PowerPoint';
          break;
        case 'Hwp': 
          appName = 'Hwp';
          break;
        default:
          appName = ''; 
      }
      this.connectedApp = appName; 

      console.log(`target program을 ${this.connectedApp}로 지정`);

      // send_user_prompt를 보낼 준비
      this.$nextTick(() => {
        this.$emit('request-top-workflows', this.connectedApp);
      });
    },
    testBackButtonClick() {
      this.$emit('back');
    }
  }
}
</script>

<style src="./ConnectAppsModal.css">
</style>