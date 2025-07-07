<template>
  <div class="canvas-controls">
    <button @click="$emit('add-players', 'attacking')" class="control-btn attacking">
      <span class="icon">+</span>
      Add Attack
    </button>

    <button @click="$emit('add-players', 'defensive')" class="control-btn defensive">
      <span class="icon">+</span>
      Add Defense
    </button>

    <!-- Save/Load Controls -->
    <button @click="$emit('save-play')" class="control-btn save-play">
      <span class="icon">💾</span>
      Save Play
    </button>

    <button @click="$emit('load-play')" class="control-btn load-play">
      <span class="icon">📁</span>
      Load Play
    </button>
    
    <button @click="$emit('toggle-recording')" class="control-btn record" :class="{ 'recording': isRecording }">
      <span class="icon">●</span>
      {{ isRecording ? 'Stop Recording' : 'Record Play' }}
    </button>

    <button 
      @click="$emit('toggle-sequence-mode')" 
      class="control-btn sequence-mode" 
      :class="{ 'active': isSequenceMode }" 
      title="Toggle sequence management - click players to include in sequences"
    >
      <span class="icon">🎬</span>
      {{ isSequenceMode ? 'Exit Sequence Mode' : 'Sequence Mode' }}
    </button>

    <button 
      v-if="isSequenceMode"
      @click="$emit('run-current-phase')" 
      class="control-btn run-phase" 
      :disabled="!hasAnySequencesInCurrentPhase || isRunningCurrentPhase"
      :class="{ 'running': isRunningCurrentPhase, 'recording': isRecording && hasAnySequencesInCurrentPhase }"
    >
      <span class="icon">▶</span>
      {{ isRunningCurrentPhase ? 'Running Phase...' : isRecording && hasAnySequencesInCurrentPhase ? 'Run & Record Phase' : 'Run Current Phase' }}
    </button>

    <button 
      v-if="isSequenceMode && hasMultiplePhases"
      @click="$emit('run-full-play')" 
      class="control-btn run-full-play" 
      :disabled="isRunningCurrentPhase || isRunningFullPlay"
      :class="{ 'running': isRunningFullPlay }"
    >
      <span class="icon">▶▶</span>
      {{ isRunningFullPlay ? 'Running Full Play...' : 'Run Full Play' }}
    </button>

    <button 
      v-if="isSequenceMode" 
      @click="$emit('clear-paths')" 
      class="control-btn clear-paths" 
      :disabled="!hasAnyPaths"
    >
      <span class="icon">🗑</span>
      Clear Paths
    </button>
  </div>
</template>

<script setup lang="ts">
import type { ControlPanelEvents } from '../types/game'

interface Props {
  isRecording: boolean
  isSequenceMode: boolean
  isRunningCurrentPhase: boolean
  isRunningFullPlay: boolean
  hasAnySequencesInCurrentPhase: boolean
  hasMultiplePhases: boolean
  hasAnyPaths: boolean
}

interface Emits {
  (e: 'toggle-recording'): void
  (e: 'toggle-sequence-mode'): void
  (e: 'add-players', type: 'attacking' | 'defensive'): void
  (e: 'clear-paths'): void
  (e: 'run-current-phase'): void
  (e: 'run-full-play'): void
  (e: 'save-play'): void
  (e: 'load-play'): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>

<style scoped>
.canvas-controls {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;
  flex-wrap: wrap;
  position: relative;
  z-index: 10;
}

.control-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.95rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  letter-spacing: 0.3px;
}

.control-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.control-btn:active {
  transform: translateY(0);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
}

.control-btn .icon {
  font-size: 1.3rem;
  line-height: 1;
}

.control-btn.attacking {
  background: linear-gradient(135deg, #FF8A8A, #FF4444);
  color: white;
}

.control-btn.defensive {
  background: linear-gradient(135deg, #6D9BFF, #4444FF);
  color: white;
}

.control-btn.record {
  background: linear-gradient(135deg, #9d9d9d, #717171);
  color: white;
}

.control-btn.record.recording {
  background: linear-gradient(135deg, #ff5252, #ff1744);
  color: white;
}

.control-btn.record .icon {
  color: white;
  font-size: 1rem;
}

.control-btn.record.recording .icon {
  animation: pulse 1.5s infinite;
}

.control-btn.sequence-mode {
  background: linear-gradient(135deg, #9C27B0, #673AB7);
  color: white;
}

.control-btn.sequence-mode.active {
  background: linear-gradient(135deg, #E91E63, #9C27B0);
  box-shadow: 0 6px 20px rgba(233, 30, 99, 0.3);
}

.control-btn.run-phase {
  background: linear-gradient(135deg, #4CAF50, #2E7D32);
  color: white;
}

.control-btn.run-phase.running {
  background: linear-gradient(135deg, #FF9800, #F57C00);
  animation: pulse 1.5s infinite;
}

.control-btn.run-phase.recording {
  background: linear-gradient(135deg, #E91E63, #9C27B0);
  box-shadow: 0 6px 20px rgba(233, 30, 99, 0.3);
}

.control-btn.run-phase:disabled {
  background: linear-gradient(135deg, #BDBDBD, #9E9E9E);
  color: #757575;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.control-btn.run-full-play {
  background: linear-gradient(135deg, #FF9800, #F57C00);
  color: white;
}

.control-btn.run-full-play.running {
  background: linear-gradient(135deg, #E91E63, #9C27B0);
  animation: pulse 1.5s infinite;
}

.control-btn.run-full-play:disabled {
  background: linear-gradient(135deg, #BDBDBD, #9E9E9E);
  color: #757575;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.control-btn.clear-paths {
  background: linear-gradient(135deg, #FF7043, #D84315);
  color: white;
}

.control-btn.clear-paths:disabled {
  background: linear-gradient(135deg, #BDBDBD, #9E9E9E);
  color: #757575;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.control-btn.save-play {
  background: linear-gradient(135deg, #4CAF50, #2E7D32);
  color: white;
}

.control-btn.load-play {
  background: linear-gradient(135deg, #FF9800, #F57C00);
  color: white;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .canvas-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .control-btn {
    width: 100%;
    justify-content: center;
  }
}
</style> 