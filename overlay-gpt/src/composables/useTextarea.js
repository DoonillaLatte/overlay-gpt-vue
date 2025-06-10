// src/composables/useTextarea.js
import { ref, nextTick } from 'vue';

export function useTextarea() {
  const minTextareaHeight = ref(24);
  const maxTextareaHeight = ref(120);

  // 텍스트 너비 계산
  const calculateTextWidth = (text, textarea) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    const computedStyle = window.getComputedStyle(textarea);
    context.font = `${computedStyle.fontSize} ${computedStyle.fontFamily}`;

    const metrics = context.measureText(text);
    return metrics.width;
  };

  // Textarea 높이 조정
  const adjustTextareaHeight = (textarea, container) => {
    if (!textarea || !container) return;

    if (!textarea.value || textarea.value.trim() === '') {
      textarea.style.height = `${minTextareaHeight.value}px`;
      textarea.style.overflowY = 'hidden';
      container.style.minHeight = `${minTextareaHeight.value + 32}px`;
      return;
    }

    const lineBreaks = (textarea.value.match(/\n/g) || []).length;

    if (lineBreaks > 0) {
      // 명시적 줄바꿈이 있는 경우
      textarea.style.height = 'auto';
      const newHeight = Math.max(
        minTextareaHeight.value, 
        Math.min(textarea.scrollHeight, maxTextareaHeight.value)
      );

      textarea.style.height = `${newHeight}px`;
      textarea.style.overflowY = newHeight >= maxTextareaHeight.value ? 'auto' : 'hidden';
      container.style.minHeight = `${newHeight + 32}px`;
    } else {
      // 한 줄 텍스트인 경우 정확한 너비 계산
      const textWidth = calculateTextWidth(textarea.value, textarea);
      const availableWidth = textarea.clientWidth - 24; // padding 제외

      if (textWidth > availableWidth) {
        // 텍스트가 한 줄을 넘어가는 경우에만 높이 증가
        textarea.style.height = 'auto';
        const newHeight = Math.max(
          minTextareaHeight.value, 
          Math.min(textarea.scrollHeight, maxTextareaHeight.value)
        );

        textarea.style.height = `${newHeight}px`;
        textarea.style.overflowY = newHeight >= maxTextareaHeight.value ? 'auto' : 'hidden';
        container.style.minHeight = `${newHeight + 32}px`;
      } else {
        // 텍스트가 한 줄에 맞는 경우
        textarea.style.height = `${minTextareaHeight.value}px`;
        textarea.style.overflowY = 'hidden';
        container.style.minHeight = `${minTextareaHeight.value + 32}px`;
      }
    }
  };

  // Textarea 높이 초기화
  const resetTextareaHeight = (textarea, container) => {
    if (!textarea || !container) return;
    
    textarea.style.height = `${minTextareaHeight.value}px`;
    textarea.style.overflowY = 'hidden';
    container.style.minHeight = `${minTextareaHeight.value + 32}px`;
  };

  // 입력 처리
  const handleInput = (textareaRef, containerRef) => {
    nextTick(() => {
      adjustTextareaHeight(textareaRef.value, containerRef.value);
    });
  };

  return {
    minTextareaHeight,
    maxTextareaHeight,
    calculateTextWidth,
    adjustTextareaHeight,
    resetTextareaHeight,
    handleInput
  };
}