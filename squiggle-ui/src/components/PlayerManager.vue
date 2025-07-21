<template>
  <div class="player-controls" v-if="availableSequences.length > 0">
    <div class="player-list">
      <div 
        v-for="player in players" 
        :key="`${player.type}-${player.id}`"
        @click="togglePlayerLoop(player)"
        class="player-control-btn" 
        :class="{ 
          'active': player.isLooping, 
          'no-path': !canActivatePlayer(player),
          [player.type]: true 
        }"
        :disabled="!canActivatePlayer(player)"
      >
        <span class="player-icon">{{ player.type === 'attacking' ? 'R' : 'B' }}{{ player.id }}</span>
        <span class="player-status">
          {{ player.isLooping ? 'INCLUDED' : canActivatePlayer(player) ? 'READY' : 'NEEDS PATH' }}
          <span v-if="canActivatePlayer(player) && player.sequenceDelay !== undefined" class="player-delay">
            {{ player.sequenceDelay }}ms delay
          </span>
        </span>
      </div>
    </div>
    
    <div class="player-actions">
      <button 
        @click="selectAllPlayers" 
        class="control-btn select-all"
        :disabled="!hasPlayersWithPaths"
      >
        <span class="icon">✓</span>
        Select All
      </button>
      
      <button 
        @click="deselectAllPlayers" 
        class="control-btn deselect-all"
        :disabled="!hasSelectedPlayers"
      >
        <span class="icon">✗</span>
        Deselect All
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Player, Sequence } from '../types/game'

interface Props {
  players: Player[]
  availableSequences: Sequence[]
  currentSequenceData: Sequence | null
}

interface Emits {
  (e: 'toggle-player-loop', player: Player): void
  (e: 'select-all-players'): void
  (e: 'deselect-all-players'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const canActivatePlayer = (player: Player) => {
  return player.path && player.path.length > 0
}

const hasPlayersWithPaths = computed(() => {
  return props.players.some(player => canActivatePlayer(player))
})

const hasSelectedPlayers = computed(() => {
  return props.players.some(player => player.isLooping)
})

const togglePlayerLoop = (player: Player) => {
  if (!canActivatePlayer(player)) return
  emit('toggle-player-loop', player)
}

const selectAllPlayers = () => {
  emit('select-all-players')
}

const deselectAllPlayers = () => {
  emit('deselect-all-players')
}
</script>

<style scoped>
.player-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #2196F3;
}

.player-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.player-control-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 80px;
  text-align: center;
}

.player-control-btn:hover:not(.no-path) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.player-control-btn.attacking {
  border-color: #ff4444;
}

.player-control-btn.attacking:hover:not(.no-path) {
  border-color: #ff4444;
  background: rgba(255, 68, 68, 0.1);
}

.player-control-btn.attacking.active {
  background: #ff4444;
  border-color: #ff4444;
  color: white;
  animation: pulse 2s infinite;
}

.player-control-btn.defensive {
  border-color: #4444ff;
}

.player-control-btn.defensive:hover:not(.no-path) {
  border-color: #4444ff;
  background: rgba(68, 68, 255, 0.1);
}

.player-control-btn.defensive.active {
  background: #4444ff;
  border-color: #4444ff;
  color: white;
  animation: pulseBlue 2s infinite;
}

.player-control-btn.no-path {
  opacity: 0.5;
  cursor: not-allowed;
  border-color: #ccc;
  color: #999;
}

.player-icon {
  font-weight: bold;
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.player-status {
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.player-delay {
  display: block;
  font-size: 0.6rem;
  color: #666;
  margin-top: 0.2rem;
  font-weight: 400;
  text-transform: none;
  letter-spacing: normal;
}

.player-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  flex-wrap: wrap;
}

.control-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.8rem;
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

.control-btn.select-all {
  background: linear-gradient(135deg, #4CAF50, #2E7D32);
  color: white;
}

.control-btn.deselect-all {
  background: linear-gradient(135deg, #F44336, #D32F2F);
  color: white;
}

.control-btn .icon {
  font-size: 1rem;
  line-height: 1;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(255, 68, 68, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 68, 68, 0);
  }
}

@keyframes pulseBlue {
  0% {
    box-shadow: 0 0 0 0 rgba(68, 68, 255, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(68, 68, 255, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(68, 68, 255, 0);
  }
}
</style> 