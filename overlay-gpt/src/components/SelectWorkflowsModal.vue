<template>
  <div class="connect-apps-modal-full-screen">
    <div class="drag-region">
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

    <div class="modal-content">
      <div class="logo-container">
        <img src="@/assets/ovhp-logo.png" alt="Overlay Helper Logo" class="app-logo" />
      </div>
      <div>
        <img :src="getImageUrl(targetProgram)" alt="targetProgram logo" class="target-program-logo">
      </div>
      <div class="modal-header">
        <h2>어떤 Excel 파일과 연결할까요?</h2>
      </div>

      <div v-if="similarPrograms.length > 0" class="similar-programs-section">
        <ul class="file-list"> <li v-for="(program, index) in similarPrograms" :key="index" class="file-list-item"> <button class="similar-programs-button">
              {{ program[0] }}
            </button> 
          </li>
        </ul>
        <div class="file-list-footer"> 
          <button class="footer-button">
            <span>&#8226;&#8226;&#8226; 다른 파일 선택</span>
          </button>
          <button class="footer-button new-file-button">
            <span> 새 파일 만들기</span>
          </button>
        </div>
      </div>
      <div v-else>
        <p>추천할 파일이 없습니다.</p>
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
    similarPrograms: {
      type: Array,
      default: () => []
    },
    targetProgram: {
      type: String,
      default: ''
    }
  },
  emits: ['back', 'app-connected', 'minimize', 'maximizeRestore', 'close', 'request-top-workflows'],
  data() {
    return {
      connectedApp: ''
    };
  },
  methods: {
    testBackButtonClick() {
      this.$emit('back');
    },
    getImageUrl(programName) {
      const fileName = programName;

      try {
        return require(`@/assets/${programName}.png`);
      } catch (e) {
        console.warn(`Could not find image for: ${programName}.png`, e);
      }
    }
  },
  mounted() {
    console.log(`두 번째 모달에 전달된 target program: ${this.targetProgram}`);
  },
}
</script>

<style src="./ConnectAppsModal.css"></style>

<style>
.modal-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-grow: 1; 
  padding: 20px; 
  width: 50%;
}

/* Container for the file list */
.similar-programs-section {
  width: 100%;
  max-width: 300px; 
  margin-top: 20px; 
}

.file-list {
  list-style-type: none; 
  padding: 0;
  margin: 0;
  background-color: #E0E0E0;
  border-radius: 15px;
  border-bottom-left-radius: 0%;
  border-bottom-right-radius: 0%;
  overflow: hidden; 
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.file-list-item {
  width: 100%;
  border-bottom: 1px solid #C0C0C0;
}

.file-list-item:last-child {
  border-bottom: none;
}

.similar-programs-button {
  width: 100%; 
  background-color: transparent; 
  border: none; 
  padding: 15px 20px;
  text-align: left; 
  font-size: 16px; 
  color: #333; 
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-weight: 500; 
}

.similar-programs-button:hover {
  background-color: #919191; 
}

.similar-programs-button:active {
  background-color: #939393; 
}

.file-list-footer {
  display: flex;
  width: 100%;
  max-width: 300px;
  background-color: #E0E0E0; 
  border-radius: 15px; 
  border-top-left-radius: 0%;
  border-top-right-radius: 0%;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.footer-button {
  flex: 1; 
  padding: 15px 10px;
  background-color: #6b63ff;
  border: none;
  font-size: 14px;
  font-weight: 400;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s ease;
  display: flex; 
  justify-content: center;
  align-items: center; 
}

.footer-button:hover {
  background-color: #514bc5;
}

.footer-button:active {
  background-color: #514bc5;
}

.footer-button:first-child {
  border-right: 1px solid #C0C0C0; 
}

.new-file-button span {
  display: flex;
  align-items: center;
  gap: 5px;
}

.new-file-button span::before {
  content: '+';
  font-size: 20px; 
  line-height: 1;
}

.target-program-logo {
  width: 60px; 
  height: 60px;
  object-fit: contain; 
}
</style>