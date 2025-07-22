<template>
  <input
    ref="fileInput"
    type="file"
    accept=".json"
    @change="handleFileSelect"
    style="display: none"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Emits {
  (e: 'file-selected', file: File): void
}

const emit = defineEmits<Emits>()
const fileInput = ref<HTMLInputElement | null>(null)

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (file) {
    emit('file-selected', file)
    // Reset the input so the same file can be selected again
    target.value = ''
  }
}

// Expose method to trigger file selection
const triggerFileSelect = () => {
  fileInput.value?.click()
}

defineExpose({
  triggerFileSelect
})
</script> 