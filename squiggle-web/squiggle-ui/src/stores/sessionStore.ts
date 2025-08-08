import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useSessionStore = defineStore('session', () => {
  const lastActivity = ref<number>(Date.now())
  const SESSION_TIMEOUT = 10 * 60 * 1000 // 10 minutes

  // Simple activity update
  const updateActivity = () => {
    lastActivity.value = Date.now()
  }

  // Check if session is valid
  const isSessionValid = computed(() => {
    return Date.now() - lastActivity.value < SESSION_TIMEOUT
  })

  // Get remaining time
  const remainingTime = computed(() => {
    const remaining = SESSION_TIMEOUT - (Date.now() - lastActivity.value)
    return Math.max(0, Math.floor(remaining / 1000))
  })

  return {
    updateActivity,
    isSessionValid,
    remainingTime
  }
}) 