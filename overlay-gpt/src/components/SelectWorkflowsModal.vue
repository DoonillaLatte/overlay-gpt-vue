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
          <button class="footer-button" @click="triggerFilePicker">
            <span>&#8226;&#8226;&#8226; 다른 파일 선택</span>
            <input type="file" 
              ref="fileInput" 
              style="display: none" 
              accept=".ppt, .xlsx, .word, .hwp"
              @change="handleFileSelected"
            />
          </button>
          <button class="footer-button new-file-button" @click="triggerFolderPicker">
            <span> 새 파일 만들기</span>
            <input
              ref="folderInput"
              type="file"
              style="display: none"
              webkitdirectory
              @change="handleFolderSelected"
            />
          </button>
          
          <div v-if="showFileNameModal" class="modal-overlay">
            <div class="modal-dialog">
              <h3>파일 이름 입력</h3>
              <p>선택한 폴더: <br>
                {{ selectedFolderPath }}</p>
              <input
                type="text"
                v-model="newFileName"
                placeholder="예: MyDocument.ppt"
                class="modal-input"
              />
              <div class="modal-actions">
                <button @click="confirmNewFile" class="modal-confirm">생성</button>
                <button @click="cancelNewFile" class="modal-cancel">취소</button>
              </div>
            </div>
          </div>
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
      connectedApp: '',
      selectedFolderPath: '', 
      newFileName: '',     
      showFileNameModal: false 
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
    triggerFilePicker() {
      this.$refs.fileInput.click();
    }, 
    triggerFolderPicker() {
      this.$refs.folderInput.click();
    },
    handleFileSelected(event) {
      const file = event.target.files[0];

      if (file) {
        const fileName = file.name;
        let filePath = file.path; // Electron 환경에서 유효
      
        if (!filePath) {
          console.warn('file.path가 없어 파일 경로를 얻을 수 없습니다. 파일명만 전송합니다.');
          filePath = fileName;
        }
      
        const targetFile = [fileName, filePath];
        console.log('handleFileSelected - 전송할 targetFile:', targetFile);
      
        this.$emit('select-workflow', {
          fileType: this.targetProgram,
          targetFile: targetFile
        });
      }
    },
    handleFolderSelected(event) {
      const files = event.target.files;
      
      if (files.length === 0) return;
        
      const relativePath = files[0].webkitRelativePath;
      const folderPath = relativePath.split('/')[0];

      this.selectedFolderPath = folderPath;

      console.log("선택된 폴더 경로:", this.selectedFolderPath);
      // 폴더 선택되면 모달 표시
      this.showFileNameModal = true;
    },
    confirmNewFile() {
      if (!this.newFileName.trim()) {
        alert('파일명을 입력하세요.');
        return;
      }

      const fullPath = `${this.selectedFolderPath}/${this.newFileName}`;
      console.log('생성될 전체 경로:', fullPath);
      const targetFile = [this.newFileName, fullPath];

      this.$emit('select-workflow', {
        fileType: this.targetProgram,
        targetFile: targetFile
      });
      
      console.log(`전송: ${this.newFileName}, ${fullPath}`);

      // 초기화
      this.newFileName = '';
      this.selectedFolderPath = '';
      this.showFileNameModal = false;
    },
      cancelNewFile() {
      this.newFileName = '';
      this.selectedFolderPath = '';
      this.showFileNameModal = false;
    }
  },
  mounted() {
    console.log(`두 번째 모달에 전달된 target program: ${this.targetProgram}`);
  },
}
</script>

<style src="./SelectWorkflowsModal.css"></style>