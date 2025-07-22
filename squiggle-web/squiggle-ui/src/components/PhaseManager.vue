<template>
  <div class="phase-tabs">
    <div class="phase-instructions">
      <span class="instructions-text">
        Phase management: Select, add, or remove phases to organize your rugby play
      </span>
    </div>
    
    <button 
      v-for="phase in phases" 
      :key="phase.id"
      @click="$emit('phase-select', phase.id)" 
      :class="{ active: currentPhase === phase.id }"
      class="phase-tab"
    >
      Phase {{ phase.id }}
    </button>
    
    <button @click="$emit('phase-add')" class="phase-tab add-phase">
      + Add Phase
    </button>
    
    <button
      v-if="phases.length > 1"
      @click="showRemoveConfirm = true"
      class="phase-tab remove-phase"
      title="Remove Current Phase"
    >
      - Remove Phase
    </button>
  </div>

  <!-- Confirm Remove Phase Dialog -->
  <ConfirmDialog
    :show="showRemoveConfirm"
    title="Remove Phase"
    :message="`Are you sure you want to remove ${currentPhaseName}? This action cannot be undone.`"
    confirm-text="Remove Phase"
    @confirm="handleRemovePhase"
    @cancel="showRemoveConfirm = false"
  />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Phase, PhaseEvents } from '../types/game'
import ConfirmDialog from './ConfirmDialog.vue'

interface Props {
  phases: Phase[]
  currentPhase: number
  isSequenceMode: boolean
}

interface Emits {
  (e: 'phase-select', phaseId: number): void
  (e: 'phase-add'): void
  (e: 'phase-remove', phaseId: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const showRemoveConfirm = ref(false)

const currentPhaseName = computed(() => {
  const currentPhaseData = props.phases.find(p => p.id === props.currentPhase)
  return currentPhaseData?.name || `Phase ${props.currentPhase}`
})

const handleRemovePhase = () => {
    emit('phase-remove', props.currentPhase)
  showRemoveConfirm.value = false
}
</script>

<style scoped>
.phase-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  flex-wrap: wrap;
  align-items: center;
}

.phase-instructions {
  flex: 1;
  min-width: 200px;
}

.instructions-text {
  font-size: 0.85rem;
  color: #666;
  font-style: italic;
}

.phase-tab {
  padding: 0.5rem 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  color: #666;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.phase-tab:hover {
  border-color: #4CAF50;
  color: #4CAF50;
}

.phase-tab.active {
  background: #4CAF50;
  border-color: #4CAF50;
  color: white;
}

.phase-tab.add-phase {
  border-color: #2196F3;
  color: #2196F3;
}

.phase-tab.add-phase:hover {
  background: #2196F3;
  color: white;
}

.phase-tab.remove-phase {
  border-color: #F44336;
  color: #F44336;
}

.phase-tab.remove-phase:hover {
  background: #F44336;
  color: white;
}
</style> 