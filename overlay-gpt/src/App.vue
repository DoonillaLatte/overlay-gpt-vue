<script>
export default {
  methods: {
    closeWindow() {
      window.close();
    }
  }
}
</script>

<template>
  <div class="container">
    <div class="drag-region">
      <div class="left-section">
        <button class="window-button bold-text">...</button>
      </div>
      <div class="center-section">
        <h1 class="bold-text">Overlay Helper</h1>
      </div>
      <div class="right-section">
        <button class="window-button bold-text">−</button>
        <button class="window-button bold-text">□</button>
        <button class="window-button bold-text" @click="closeWindow">X</button>
      </div>
    </div>
    <div class="main-region">
      HELLO
    </div>
    <div class="prompt-region">
      <div class="prompt-container">
        <div class="upload-button-wrapper">
          <button type="button" class="upload-button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19M5 12H19" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          <div class="tooltip">사진 및 파일 추가</div>
        </div>
        <input type="text" class="prompt" placeholder="메시지 입력...">
        <button type="submit" class="submit-button">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5L12 19M12 5L5 12M12 5L19 12" stroke="#303030" stroke-width="5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style src="./App.css"></style>