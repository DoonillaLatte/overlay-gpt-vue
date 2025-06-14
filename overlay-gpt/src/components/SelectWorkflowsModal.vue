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
              <div class="file-info">
                <div class="file-name">{{ getFileName(targetFile) }}</div>
                <div class="file-path" :title="getFullPath(targetFile)">{{ getFormattedPath(targetFile) }}</div>
              </div>
            </button> 
          </li>
        </ul>
        <div class="file-list-footer"> 
          <button class="footer-button" @click="triggerFilePicker">
            <span>&#8226;&#8226;&#8226; 다른 파일 선택</span>
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
    async triggerFilePicker() {
      const filePath = await window.electronAPI.openFile();

      if (filePath) {
        const fileName = filePath.split(/[/\\]/).pop(); 
        const targetFile = [fileName, filePath];
        console.log('triggerFilePicker - 전송할 targetFile:', targetFile);

        this.$emit('select-workflow', {
          fileType: this.targetProgram,
          targetFile: targetFile
        });
      }
    },
    async triggerFolderPicker() {
        const result = await window.electronAPI.openDirectory(); 

        if (result && result.filePaths && result.filePaths.length > 0) {
            this.selectedFolderPath = result.filePaths[0];
            console.log("선택된 폴더 경로:", this.selectedFolderPath);
            this.showFileNameModal = true;
        }
    },

    async confirmNewFile() {
      if (!this.newFileName.trim()) {
        alert('파일명을 입력하세요.');
        return;
      }

      // 파일 확장자 검증
      const allowedExtensions = {
        'ppt': '.pptx', 
        'xlsx': '.xlsx',
        'word': '.docx', 
        'hwp': '.hwp'
      };

      let fileNameWithExtension = this.newFileName;
      const expectedExtension = allowedExtensions[this.targetProgram.toLowerCase()];

      if (expectedExtension && !fileNameWithExtension.toLowerCase().endsWith(expectedExtension)) {
          fileNameWithExtension += expectedExtension;
      }

      try {
          const fullPath = await window.electronAPI.createFile(this.selectedFolderPath, fileNameWithExtension, this.targetProgram);
          if (fullPath) {
              const targetFile = [fileNameWithExtension, fullPath];
              this.$emit('select-workflow', {
                  fileType: this.targetProgram,
                  targetFile: targetFile
              });
              console.log(`전송: ${fileNameWithExtension}, ${fullPath}`);
          }
      } catch (error) {
          console.error('파일 생성 중 오류 발생:', error);
          alert('파일 생성에 실패했습니다.');
      } finally {
          this.newFileName = '';
          this.selectedFolderPath = '';
          this.showFileNameModal = false;
      }
    },
      cancelNewFile() {
      this.newFileName = '';
      this.selectedFolderPath = '';
      this.showFileNameModal = false;
    },
    getFileName(targetFile) {
      // targetFile이 배열인지 확인하고 안전하게 처리
      if (!Array.isArray(targetFile) || targetFile.length === 0) {
        return '알 수 없는 파일';
      }
      
      let fileName = targetFile[0] || '알 수 없는 파일';
      
      // 파일명 정리 (기본적인 정리만)
      fileName = this.cleanFileName(fileName);
      
      // 파일명에서 확장자 분리 (더 안전한 방식)
      const lastDotIndex = fileName.lastIndexOf('.');
      let nameWithoutExt = fileName;
      let extension = '';
      
      // 확장자가 있고, 마지막 점이 파일명 시작 부분이 아닌 경우
      if (lastDotIndex > 0 && lastDotIndex < fileName.length - 1) {
        nameWithoutExt = fileName.substring(0, lastDotIndex);
        extension = fileName.substring(lastDotIndex);
        
        // 확장자가 너무 길면 (5글자 이상) 확장자가 아닐 가능성이 높음
        if (extension.length > 5) {
          nameWithoutExt = fileName;
          extension = '';
        }
      }
      
      // 파일명이 너무 길면 줄임 (확장자 보존)
      if (nameWithoutExt.length > 25) {
        return nameWithoutExt.substring(0, 25) + '...' + extension;
      }
      
      return nameWithoutExt + extension;
    },
    
    getFullPath(targetFile) {
      if (!Array.isArray(targetFile) || targetFile.length < 2) {
        return '경로 없음';
      }
      return targetFile[1] || '경로 없음';
    },
    
    getFormattedPath(targetFile) {
      if (!Array.isArray(targetFile) || targetFile.length < 2) {
        return '경로 없음';
      }
      
      const fullPath = targetFile[1] || '';
      
      if (!fullPath || fullPath === '경로 없음') {
        return '경로 없음';
      }
      
      // Windows 경로 정규화
      const normalizedPath = fullPath.replace(/\\/g, '/');
      const pathParts = normalizedPath.split('/').filter(part => part.length > 0);
      
      if (pathParts.length === 0) {
        return '경로 없음';
      }
      
      // 드라이브 정보 추출 (C:, D: 등)
      let driveInfo = '';
      if (pathParts[0].includes(':')) {
        driveInfo = pathParts[0];
        pathParts.shift();
      }
      
      // 파일명 제거 (마지막 요소)
      if (pathParts.length > 0) {
        pathParts.pop();
      }
      
      if (pathParts.length === 0) {
        return driveInfo || '루트';
      }
      
      // 경로가 너무 길면 중간 부분을 줄임
      if (pathParts.length > 4) {
        const start = pathParts.slice(0, 2);
        const end = pathParts.slice(-2);
        const middlePath = start.join('/') + '/.../' + end.join('/');
        return driveInfo ? `${driveInfo}/${middlePath}` : middlePath;
      } else if (pathParts.length > 2) {
        const pathString = pathParts.join('/');
        if (pathString.length > 40) {
          const start = pathParts.slice(0, 1);
          const end = pathParts.slice(-1);
          const middlePath = start.join('/') + '/.../' + end.join('/');
          return driveInfo ? `${driveInfo}/${middlePath}` : middlePath;
        }
      }
      
      const finalPath = pathParts.join('/');
      return driveInfo ? `${driveInfo}/${finalPath}` : finalPath;
    },
    cleanFileName(fileName) {
      if (!fileName || typeof fileName !== 'string') {
        return '알 수 없는 파일';
      }
      
      // 기본적인 문자열 정리만 수행
      let cleaned = fileName;
      
      // 파일명에서 null 문자나 극단적인 제어 문자만 제거 (확장자 보존)
      cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      
      // 연속된 공백을 하나로 통합
      cleaned = cleaned.replace(/\s+/g, ' ');
      
      // 앞뒤 공백 제거
      cleaned = cleaned.trim();
      
      // 빈 문자열인 경우 기본값 반환
      if (!cleaned) {
        return '알 수 없는 파일';
      }
      
      return cleaned;
    }
  },
  mounted() {
    console.log(`두 번째 모달에 전달된 target program: ${this.targetProgram}`);
  },
}
</script>

<style src="./SelectWorkflowsModal.css"></style>