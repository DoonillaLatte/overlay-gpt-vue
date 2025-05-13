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
      <div></div>
      <input type="text" class="prompt">
      </input>
      <div></div>
    </div>
  </div>
</template>

<style src="./App.css"></style>