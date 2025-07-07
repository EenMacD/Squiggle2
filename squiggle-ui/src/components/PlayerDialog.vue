<template>
  <!-- Dialog Backdrop -->
  <div v-if="showDialog" class="dialog-backdrop" @click="closeDialog"></div>

  <!-- Player Count Dialog -->
  <div v-if="showDialog" class="dialog">
    <div class="dialog-content">
      <h3 class="dialog-title">
        {{ dialogType === 'attacking' ? 'Add Attacking Players' : 'Add Defensive Players' }}
      </h3>
      <div class="number-input">
        <button class="number-btn" @click="decrementCount">-</button>
        <input 
          type="number" 
          :value="selectedCount"
          @input="validateCount"
          min="1" 
          max="16"
        >
        <button class="number-btn" @click="incrementCount">+</button>
      </div>
      <div class="dialog-actions">
        <button class="dialog-btn cancel" @click="closeDialog">Cancel</button>
        <button class="dialog-btn confirm" @click="confirmPlayerCount">
          Add Players
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  showAttackingCount: boolean
  showDefensiveCount: boolean
  selectedAttackingCount: number
  selectedDefensiveCount: number
}

interface Emits {
  (e: 'close-dialog'): void
  (e: 'confirm-player-count', type: 'attacking' | 'defensive', count: number): void
  (e: 'update:selectedAttackingCount', count: number): void
  (e: 'update:selectedDefensiveCount', count: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const showDialog = ref(false)
const dialogType = ref<'attacking' | 'defensive'>('attacking')
const selectedCount = ref(1)

// Watch for dialog state changes
watch(() => props.showAttackingCount, (newVal) => {
  if (newVal) {
    showDialog.value = true
    dialogType.value = 'attacking'
    selectedCount.value = props.selectedAttackingCount
  } else if (!props.showDefensiveCount) {
    showDialog.value = false
  }
})

watch(() => props.showDefensiveCount, (newVal) => {
  if (newVal) {
    showDialog.value = true
    dialogType.value = 'defensive'
    selectedCount.value = props.selectedDefensiveCount
  } else if (!props.showAttackingCount) {
    showDialog.value = false
  }
})

const incrementCount = () => {
  if (selectedCount.value < 16) {
    selectedCount.value++
    updateParentCount()
  }
}

const decrementCount = () => {
  if (selectedCount.value > 1) {
    selectedCount.value--
    updateParentCount()
  }
}

const validateCount = (event: Event) => {
  const input = event.target as HTMLInputElement
  let value = parseInt(input.value)
  
  if (isNaN(value)) value = 1
  if (value < 1) value = 1
  if (value > 16) value = 16
  
  selectedCount.value = value
  updateParentCount()
}

const updateParentCount = () => {
  if (dialogType.value === 'attacking') {
    emit('update:selectedAttackingCount', selectedCount.value)
  } else {
    emit('update:selectedDefensiveCount', selectedCount.value)
  }
}

const closeDialog = () => {
  emit('close-dialog')
}

const confirmPlayerCount = () => {
  emit('confirm-player-count', dialogType.value, selectedCount.value)
}
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
  padding: 1.5rem;
  min-width: 300px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.dialog-title {
  color: white;
  font-size: 1.2rem;
  font-weight: 500;
  margin: 0 0 1.5rem 0;
  text-align: center;
}

.number-input {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.number-btn {
  width: 40px;
  height: 40px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-radius: 10px;
  font-size: 1.4rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.number-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.2);
}

.number-input input {
  width: 80px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: white;
  text-align: center;
  font-size: 1.2rem;
  padding: 0;
}

.number-input input::-webkit-inner-spin-button,
.number-input input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.dialog-actions {
  display: flex;
  gap: 1rem;
}

.dialog-btn {
  flex: 1;
  padding: 0.75rem;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.dialog-btn.cancel {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.dialog-btn.confirm {
  background: linear-gradient(135deg, #FF8A8A, #FF4444);
  color: white;
  border: none;
}

.dialog-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.dialog-btn.cancel:hover {
  background: rgba(255, 255, 255, 0.15);
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