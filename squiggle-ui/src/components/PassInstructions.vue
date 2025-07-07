<template>
  <div class="pass-instructions" v-if="players.length > 0 && !isSequenceMode">
    <div class="pass-title">Pass to Player:</div>
    <div class="pass-keys">
      <span 
        v-for="player in playersWithNumbers" 
        :key="`${player.type}-${player.id}`"
        class="pass-key"
        :class="player.type"
      >
        {{ player.assignedNumber }}: {{ player.type === 'attacking' ? 'A' : 'D' }}{{ player.id }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Player } from '../types/game'

interface Props {
  players: Player[]
  isSequenceMode: boolean
}

const props = defineProps<Props>()

const playersWithNumbers = computed(() => {
  return props.players.filter(p => p.assignedNumber !== undefined)
})
</script>

<style scoped>
.pass-instructions {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.pass-title {
  font-weight: 500;
  color: #333;
  font-size: 0.9rem;
}

.pass-keys {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.pass-key {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  color: white;
}

.pass-key.attacking {
  background: #FF6B6B;
}

.pass-key.defensive {
  background: #4D7CFF;
}
</style> 