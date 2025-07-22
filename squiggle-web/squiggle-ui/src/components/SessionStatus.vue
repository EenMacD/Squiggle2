<template>
  <div v-if="showWarning" class="session-warning">
    ⚠️ Session expires in {{ formatTime(remainingTime) }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSessionStore } from '../stores/sessionStore'

const sessionStore = useSessionStore()

const remainingTime = computed(() => sessionStore.remainingTime)
const showWarning = computed(() => remainingTime.value <= 120 && remainingTime.value > 0)

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.session-warning {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #ffc107;
  color: #000;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.875rem;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  font-weight: 500;
}
</style> 