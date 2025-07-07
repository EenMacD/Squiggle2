<template>
  <div class="sequence-management-container">
    <!-- Sequence Management Tabs -->
    <div class="sequence-tabs">
      <div class="sequence-instructions">
        <span class="instructions-text">
          {{ availableSequences.length > 0 ? 
            (playersWithPaths.length > 0 ? 
              'Click any player to include/exclude them from the sequence' : 
              'Triple-click players to draw paths first, then click to include in sequence') : 
            'Create a sequence to start building coordinated player movements' }}
        </span>
      </div>
      <button 
        v-for="sequence in availableSequences" 
        :key="sequence.id"
        @click="selectSequence(sequence.id)" 
        :class="{ active: currentSequence === sequence.id }"
        class="sequence-tab"
      >
        Sequence {{ sequence.id }}
      </button>
      <button @click="addSequence" class="sequence-tab add-sequence">+ Add Sequence</button>
      <button
        v-if="availableSequences.length > 0"
        @click="removeSequence"
        class="sequence-tab remove-sequence"
        title="Remove Current Sequence"
      >
        - Remove Sequence
      </button>
    </div>

    <!-- Sequence Control Actions -->
    <div class="sequence-controls-new" v-if="availableSequences.length > 0">
      <button 
        @click="runCurrentSequence" 
        class="control-btn sequence-run"
        :disabled="!currentSequenceData || currentSequenceData.activePlayerIds.length === 0"
      >
        <span class="icon">▶</span>
        Run Sequence
      </button>
      
      <button 
        @click="runAllSequences" 
        class="control-btn sequence-run-all"
        :disabled="availableSequences.length === 0"
      >
        <span class="icon">▶▶</span>
        Run All Sequences
      </button>
      
      <button 
        @click="resetCurrentSequence" 
        class="control-btn sequence-reset"
      >
        <span class="icon">⏹</span>
        Reset Sequence
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Sequence } from '../types/game'

interface Props {
  currentSequence: number
  availableSequences: Sequence[]
  playersWithPaths: any[]
  currentSequenceData: Sequence | null
}

interface Emits {
  (e: 'select-sequence', sequenceId: number): void
  (e: 'add-sequence'): void
  (e: 'remove-sequence', sequenceId: number): void
  (e: 'run-current-sequence', sequenceId: number): void
  (e: 'run-all-sequences'): void
  (e: 'reset-current-sequence'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const selectSequence = (sequenceId: number) => {
  emit('select-sequence', sequenceId)
}

const addSequence = () => {
  emit('add-sequence')
}

const removeSequence = () => {
  if (props.currentSequence) {
    emit('remove-sequence', props.currentSequence)
  }
}

const runCurrentSequence = () => {
  if (props.currentSequence) {
    emit('run-current-sequence', props.currentSequence)
  }
}

const runAllSequences = () => {
  emit('run-all-sequences')
}

const resetCurrentSequence = () => {
  emit('reset-current-sequence')
}
</script>

<style scoped>
.sequence-management-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1rem;
}

.sequence-tabs {
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  flex-wrap: wrap;
  align-items: center;
  border-left: 4px solid #FF9800;
}

.sequence-instructions {
  flex: 1;
  min-width: 200px;
}

.instructions-text {
  font-size: 0.85rem;
  color: #666;
  font-style: italic;
}

.sequence-tab {
  padding: 0.4rem 0.8rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  color: #666;
  font-weight: 500;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sequence-tab:hover {
  border-color: #FF9800;
  color: #FF9800;
}

.sequence-tab.active {
  background: #FF9800;
  border-color: #FF9800;
  color: white;
}

.sequence-tab.add-sequence {
  border-color: #4CAF50;
  color: #4CAF50;
}

.sequence-tab.add-sequence:hover {
  background: #4CAF50;
  color: white;
}

.sequence-tab.remove-sequence {
  border-color: #F44336;
  color: #F44336;
}

.sequence-tab.remove-sequence:hover {
  background: #F44336;
  color: white;
}

.sequence-controls-new {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.control-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.85rem;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.control-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.control-btn.sequence-run {
  background: linear-gradient(135deg, #4CAF50, #2E7D32);
  color: white;
}

.control-btn.sequence-run:disabled {
  background: linear-gradient(135deg, #BDBDBD, #9E9E9E);
  color: #757575;
}

.control-btn.sequence-run-all {
  background: linear-gradient(135deg, #FF9800, #F57C00);
  color: white;
}

.control-btn.sequence-run-all:disabled {
  background: linear-gradient(135deg, #BDBDBD, #9E9E9E);
  color: #757575;
}

.control-btn.sequence-reset {
  background: linear-gradient(135deg, #9E9E9E, #757575);
  color: white;
}

.control-btn .icon {
  font-size: 1.1rem;
  line-height: 1;
}
</style> 