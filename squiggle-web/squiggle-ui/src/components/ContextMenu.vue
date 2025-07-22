<template>
  <!-- Context Menu -->
  <div v-if="showContextMenu && contextMenuPlayer" class="context-menu" :style="contextMenuStyle">
    <div class="context-menu-content">
      <h4 class="context-menu-title">Player {{ contextMenuPlayer.id }} Options</h4>
      
      <button @click="setPlayerMode('drag')" class="context-menu-btn" :class="{ 'active': contextMenuPlayer.mode === 'drag' }">
        <span class="icon">↔</span>
        Drag Player
      </button>
      
      <button @click="setPlayerMode('path')" class="context-menu-btn" :class="{ 'active': contextMenuPlayer.mode === 'path' }">
        <span class="icon">⟿</span>
        Draw Path
      </button>
      
      <button @click="togglePathVisibility" class="context-menu-btn" :class="{ 'active': contextMenuPlayer.pathVisible !== false }">
        <span class="icon">👁</span>
        {{ contextMenuPlayer.pathVisible !== false ? 'Hide Path' : 'Show Path' }}
      </button>
      
      <div class="speed-control">
        <label>Speed: {{ contextMenuPlayer.speed }}%</label>
        <input 
          type="range" 
          min="25" 
          max="200" 
          step="25" 
          :value="contextMenuPlayer.speed"
          @input="updatePlayerSpeed"
          class="speed-slider"
        >
        <div class="speed-marks">
          <span>25%</span>
          <span>100%</span>
          <span>200%</span>
        </div>
      </div>
      
      <div class="delay-control">
        <label>Delay {{ contextMenuPlayer.sequenceDelay || 0 }}ms</label>
        <div class="delay-buttons">
          <button @click="adjustPlayerDelay(10)" class="delay-btn">+10ms</button>
          <button @click="adjustPlayerDelay(50)" class="delay-btn">+50ms</button>
          <button @click="adjustPlayerDelay(100)" class="delay-btn">+100ms</button>
          <button @click="resetPlayerDelay" class="delay-btn reset">0ms</button>
        </div>
      </div>
      
      <button @click="clearPlayerPath" class="context-menu-btn danger" :disabled="!contextMenuPlayer.path || contextMenuPlayer.path.length === 0">
        <span class="icon">🗑</span>
        Clear Path
      </button>
      
      <button @click="closeContextMenu" class="context-menu-btn cancel">
        <span class="icon">✕</span>
        Close
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Player } from '../types/game'

interface Props {
  showContextMenu: boolean
  contextMenuPlayer: Player | null
  contextMenuPosition: { x: number, y: number }
}

interface Emits {
  (e: 'set-player-mode', mode: 'drag' | 'path'): void
  (e: 'toggle-path-visibility'): void
  (e: 'update-player-speed', speed: number): void
  (e: 'adjust-player-delay', amount: number): void
  (e: 'reset-player-delay'): void
  (e: 'clear-player-path'): void
  (e: 'close-context-menu'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const contextMenuStyle = computed(() => ({
  left: `${props.contextMenuPosition.x}px`,
  top: `${props.contextMenuPosition.y}px`
}))

const setPlayerMode = (mode: 'drag' | 'path') => {
  emit('set-player-mode', mode)
}

const togglePathVisibility = () => {
  emit('toggle-path-visibility')
}

const updatePlayerSpeed = (event: Event) => {
  const target = event.target as HTMLInputElement
  const speed = parseInt(target.value)
  emit('update-player-speed', speed)
}

const adjustPlayerDelay = (amount: number) => {
  emit('adjust-player-delay', amount)
}

const resetPlayerDelay = () => {
  emit('reset-player-delay')
}

const clearPlayerPath = () => {
  emit('clear-player-path')
}

const closeContextMenu = () => {
  emit('close-context-menu')
}
</script>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 1001;
  animation: contextMenuSlideIn 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: auto;
}

.context-menu-content {
  background: rgba(0, 0, 0, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1rem;
  min-width: 220px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(12px);
}

.context-menu-title {
  color: white;
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  text-align: center;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.context-menu-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: white;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.context-menu-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.context-menu-btn.active {
  background: linear-gradient(135deg, #E91E63, #9C27B0);
  border-color: rgba(233, 30, 99, 0.5);
}

.context-menu-btn.danger {
  border-color: rgba(255, 82, 82, 0.3);
  background: rgba(255, 82, 82, 0.1);
}

.context-menu-btn.danger:hover {
  background: rgba(255, 82, 82, 0.2);
  border-color: rgba(255, 82, 82, 0.5);
}

.context-menu-btn.cancel {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  margin-top: 0.5rem;
  margin-bottom: 0;
}

.context-menu-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.context-menu-btn .icon {
  font-size: 1.1rem;
  line-height: 1;
}

.speed-control {
  margin: 1rem 0;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.speed-control label {
  display: block;
  color: white;
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  text-align: center;
}

.speed-slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.2);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.speed-marks {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 0.5rem;
}

.speed-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: linear-gradient(135deg, #E91E63, #9C27B0);
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  border: 2px solid white;
}

.speed-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: linear-gradient(135deg, #E91E63, #9C27B0);
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  border: 2px solid white;
}

.delay-control {
  margin: 1rem 0;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.delay-control label {
  display: block;
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 0.75rem;
  color: white;
}

.delay-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.delay-btn {
  padding: 0.5rem 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  font-size: 0.8rem;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.delay-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-1px);
}

.delay-btn.reset {
  background: rgba(33, 150, 243, 0.2);
  border-color: rgba(33, 150, 243, 0.5);
  color: #64B5F6;
}

.delay-btn.reset:hover {
  background: rgba(33, 150, 243, 0.3);
  border-color: rgba(33, 150, 243, 0.7);
}

@keyframes contextMenuSlideIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style> 