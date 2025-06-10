<template>
  <div class="message-content-wrapper">
    <!-- 일반 텍스트 -->
    <div v-if="message.contentType === 'text_plain'" class="text-plain">
      {{ message.text }}
    </div>

    <!-- HTML 텍스트 블록 -->
    <div v-else-if="message.contentType === 'text_block'" 
         class="text-block" 
         v-html="message.content">
    </div>

    <!-- 테이블 블록 -->
    <div v-else-if="message.contentType === 'table_block'" class="table-block">
      <table class="excel-table">
        <tr v-for="(row, rowIndex) in message.tableData" :key="rowIndex">
          <td v-for="(cell, cellIndex) in row" 
              :key="cellIndex" 
              v-html="cell">
          </td>
        </tr>
      </table>
    </div>

    <!-- 코드 블록 -->
    <div v-else-if="message.contentType === 'code_block'" class="code-block">
      <pre><code>{{ message.codeContent }}</code></pre>
    </div>

    <!-- XML 블록 -->
    <div v-else-if="message.contentType === 'xml_block'" class="xml-block">
      <pre><code>{{ message.xmlContent }}</code></pre>
    </div>

    <!-- 이미지 -->
    <div v-else-if="message.contentType === 'image'" class="image-block">
      <img :src="message.imageData" alt="Generated Image" class="generated-image" />
    </div>

    <!-- 기본 텍스트 (호환성) -->
    <div v-else class="default-text">
      {{ message.text }}
    </div>
  </div>
</template>

<script>
export default {
  name: 'MessageContent',
  props: {
    message: {
      type: Object,
      required: true,
      default: () => ({
        text: '',
        contentType: null,
        content: '',
        tableData: [],
        codeContent: '',
        xmlContent: '',
        imageData: ''
      })
    }
  }
};
</script>

<style src="@/typeStyle.css"></style>