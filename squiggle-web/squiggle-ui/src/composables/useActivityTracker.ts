import { onMounted, onUnmounted } from 'vue'
import { useSessionStore } from '../stores/sessionStore'

export function useActivityTracker() {
  const sessionStore = useSessionStore()

  const updateActivity = () => {
    sessionStore.updateActivity()
  }

  onMounted(() => {
    // Enhanced activity tracking for mobile
    const events = [
      'mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 
      'touchmove', 'touchend', 'click', 'focus', 'input'
    ]
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true })
    })
  })

  onUnmounted(() => {
    const events = [
      'mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 
      'touchmove', 'touchend', 'click', 'focus', 'input'
    ]
    events.forEach(event => {
      document.removeEventListener(event, updateActivity)
    })
  })
} 