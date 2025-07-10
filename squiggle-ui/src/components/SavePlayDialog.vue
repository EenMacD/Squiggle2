<template>
  <!-- Dialog Backdrop -->
  <div v-if="show" class="dialog-backdrop" @click="closeDialog"></div>

  <!-- Save Play Dialog -->
  <div v-if="show" class="dialog">
    <div class="dialog-content">
      <h3 class="dialog-title">
        Save Recorded Play
      </h3>
      
      <p class="dialog-description">
        Your play has been recorded successfully! Give it a name to save it to your collection.
      </p>
      
      <!-- Play Name Input -->
      <div class="input-section">
        <label class="input-label">Play Name</label>
        <input 
          ref="playNameInput"
          v-model="playName"
          type="text"
          placeholder="Enter a name for this play..."
          class="play-name-input"
          @keyup.enter="handleSave"
          @keyup.escape="closeDialog"
          maxlength="50"
        />
        <div class="input-hint">
          {{ playName.length }}/50 characters
        </div>
      </div>
      
      <!-- Dialog Actions -->
      <div class="dialog-actions">
        <button class="dialog-btn cancel" @click="closeDialog">
          Cancel
        </button>
        <button 
          class="dialog-btn save" 
          @click="handleSave"
          :disabled="!canSave"
        >
          <span class="icon">💾</span>
          Save Play
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

interface Emits {
  (e: 'save', playName: string): void
  (e: 'cancel'): void
}

interface Props {
  show: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const playName = ref('')
const playNameInput = ref<HTMLInputElement | null>(null)

const canSave = computed(() => {
  return playName.value.trim().length > 0
})

const handleSave = () => {
  if (!canSave.value) return
  
  emit('save', playName.value.trim())
  closeDialog()
}

const closeDialog = () => {
  playName.value = ''
  emit('cancel')
}

// Focus input when dialog opens
watch(() => props.show, (newShow) => {
  if (newShow) {
    nextTick(() => {
      playNameInput.value?.focus()
    })
  }
})
</script>

<style scoped>
.dialog-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 1000;
  animation: fadeIn 0.2s ease-out;
}

.dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1001;
  animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.dialog-content {
  background: rgba(0, 0, 0, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 2rem;
  min-width: 400px;
  max-width: 500px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.dialog-title {
  color: white;
  font-size: 1.4rem;
  font-weight: 600;
  margin: 0 0 0.75rem 0;
  text-align: center;
}

.dialog-description {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.95rem;
  line-height: 1.4;
  margin: 0 0 1.5rem 0;
  text-align: center;
}

.input-section {
  margin-bottom: 2rem;
}

.input-label {
  display: block;
  color: white;
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.play-name-input {
  width: 100%;
  padding: 0.875rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  color: white;
  font-size: 1rem;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.play-name-input:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.15);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
}

.play-name-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.input-hint {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.8rem;
  margin-top: 0.5rem;
  text-align: right;
}

.dialog-actions {
  display: flex;
  gap: 1rem;
}

.dialog-btn {
  flex: 1;
  padding: 0.875rem 1.5rem;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.dialog-btn.cancel {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.dialog-btn.save {
  background: linear-gradient(135deg, #4CAF50, #2E7D32);
  color: white;
  border: none;
}

.dialog-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.dialog-btn.cancel:hover {
  background: rgba(255, 255, 255, 0.15);
}

.dialog-btn.save:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.dialog-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.icon {
  font-size: 1.1rem;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translate(-50%, -48%);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
}
</style> 