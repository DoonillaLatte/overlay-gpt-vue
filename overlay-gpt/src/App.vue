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
    <div class="header drag-region">
      <!-- 여기를 드래그하면 창이 이동합니다 -->
      <button class="close-btn" @click="closeWindow">X</button>
    </div>
    <div class="main">
      HELLO
    </div>
  </div>
</template>

<style src="./App.css"></style>