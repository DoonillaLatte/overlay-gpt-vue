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
      <div>
        <img :src="getImageUrl(targetProgram)" alt="targetProgram logo" class="target-program-logo">
      </div>
      <div class="modal-header">
        <h2>어떤 {{ targetProgram }} </h2>
        <h2>파일과 연결할까요?</h2>
      </div>

      <div v-if="similarPrograms.length > 0" class="similar-programs-section">
        <ul class="file-list"> 
          <li v-for="(targetFile, index) in similarPrograms" :key="index" class="file-list-item"> 
            <button class="similar-programs-button" @click="selectFile(targetFile)">
              {{ targetFile }}
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
  emits: ['back', 'app-connected', 'minimize', 'maximizeRestore', 'close', 
  'request-top-workflows', 'select-workflow'],
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
      if (!programName) {
        console.warn('Program name is empty or undefined');
        return '';
      }
      return `/images/${programName}.png`;
    },
    selectFile(targetFile) {
      this.$emit('select-workflow', {
        fileType: this.targetProgram,
        targetFile: targetFile
      });
    },
  },
  mounted() {
    console.log(`두 번째 모달에 전달된 target program: ${this.targetProgram}`);
  },
}
</script>

<style src="./SelectWorkflowsModal.css"></style>