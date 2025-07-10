<template>
  <div class="app-container">
    <nav class="navbar">
      <div class="navbar-brand">
        <span class="logo">Squiggle</span>
      </div>
      
      <div class="navbar-actions">
        <button class="nav-btn profile-btn">
          <span class="icon">👤</span>
          Profile
        </button>
        
        <button class="hamburger" @click="toggleMenu" :class="{ 'active': isMenuOpen }">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      <div class="navbar-menu" :class="{ 'active': isMenuOpen }">
        <div class="player-controls">
          <div class="control-group">
            <button class="nav-btn plays" @click="showPlays = !showPlays">
              <span class="icon">📋</span>
              Saved Plays
            </button>
            <div v-if="showPlays" class="plays-list">
              <div v-if="plays.length === 0" class="no-plays">
                No saved plays
              </div>
              <div v-else class="play-items">
                <div v-for="play in plays" :key="play.id" class="play-item">
                  <span class="play-name">{{ play.name }}</span>
                  <div class="play-actions">
                    <button @click="viewPlayback(play)" class="play-action-btn">
                      <span class="icon">▶️</span>
                    </button>
                    <button @click="deletePlay(play.id)" class="play-action-btn">
                      <span class="icon">🗑️</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <main class="main-content">
      <div v-if="currentPlayback" class="playback-screen">
        <div class="playback-header">
          <button @click="closePlayback" class="close-btn">← Back to Match</button>
          <h2 class="playback-title">{{ currentPlayback.name }}</h2>
        </div>
        <PlaybackViewer 
          :playback-data="currentPlayback.playerStates" 
          @sequence-complete="handleSequenceComplete"
        />
      </div>
      <div v-else class="pitch-container">
        <RugbyPitch 
          :is-recording="isRecording"
          @update:is-recording="handleRecordingChange"
          :playback-data="[]"
          @update:player-states="updatePlayerStates"
        />
      </div>
    </main>

    <!-- Save Play Dialog -->
    <SavePlayDialog
      :show="showSavePlayDialog"
      @save="handleSavePlay"
      @cancel="handleCancelSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import RugbyPitch from './components/RugbyPitch.vue'
import PlaybackViewer from './components/PlaybackViewer.vue'
import SavePlayDialog from './components/SavePlayDialog.vue'
import { playService } from './services/playService'
import type { Play, PlayerState } from './types/play'

const isMenuOpen = ref(false)
const showAttackingCount = ref(false)
const showDefensiveCount = ref(false)
const selectedAttackingCount = ref(0)
const selectedDefensiveCount = ref(0)
const isRecording = ref(false)
const showPlays = ref(false)
const plays = ref<Play[]>([])
const currentPlayback = ref<Play | null>(null)
const currentPlayerStates = ref<PlayerState[]>([])
const players = ref<PlayerState[]>([])
const showSavePlayDialog = ref(false)

// Load saved plays on component mount
onMounted(async () => {
  try {
    plays.value = await playService.listPlays()
  } catch (error) {
    console.error('Failed to load plays:', error)
  }
})

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const showPlayerCount = (type: 'attacking' | 'defensive') => {
  if (type === 'attacking') {
    showAttackingCount.value = !showAttackingCount.value
    showDefensiveCount.value = false
  } else {
    showDefensiveCount.value = !showDefensiveCount.value
    showAttackingCount.value = false
  }
}

const selectPlayerCount = (type: 'attacking' | 'defensive', count: number) => {
  if (type === 'attacking') {
    selectedAttackingCount.value = count
    showAttackingCount.value = false
  } else {
    selectedDefensiveCount.value = count
    showDefensiveCount.value = false
  }
}

const handleRecordingChange = async (newValue: boolean) => {
  // If we're switching from recording to not recording
  if (isRecording.value && !newValue) {
    // Stop recording and show save dialog if we have recorded states
    if (currentPlayerStates.value.length > 0) {
      showSavePlayDialog.value = true
    }
  } else if (!isRecording.value && newValue) {
    // Start recording - clear previous states
    currentPlayerStates.value = []
  }
  
  // Update the recording state
  isRecording.value = newValue
}

const updatePlayerStates = (states: PlayerState[]) => {
  if (isRecording.value) {
    // Append new states to the existing ones
    currentPlayerStates.value = [...currentPlayerStates.value, ...states]
  }
}

const viewPlayback = (play: Play) => {
  currentPlayback.value = play
  showPlays.value = false
}

const closePlayback = () => {
  currentPlayback.value = null
}

const deletePlay = async (id: string) => {
  if (confirm('Are you sure you want to delete this play?')) {
    try {
      await playService.deletePlay(id)
      plays.value = plays.value.filter(play => play.id !== id)
    } catch (error) {
      console.error('Failed to delete play:', error)
    }
  }
}

const handleSequenceComplete = () => {
  // Sequence has finished playing
  console.log('Sequence playback complete')
}

const handleSavePlay = async (playName: string) => {
  try {
    // Remove duplicate timestamps to ensure smooth playback
    const uniqueStates = currentPlayerStates.value.reduce((acc, state) => {
      const key = `${state.playerId}-${state.timestamp}`
      if (!acc.has(key)) {
        acc.set(key, state)
      }
      return acc
    }, new Map<string, PlayerState>())
    
    const savedPlay = await playService.createPlay({
      name: playName,
      playerStates: Array.from(uniqueStates.values()),
    })
    
    // Refresh plays list
    plays.value = await playService.listPlays()
    
    // Set the current playback to the newly saved play
    currentPlayback.value = savedPlay
    
    // Close the save dialog
    showSavePlayDialog.value = false
    
    console.log('Play saved successfully:', playName)
  } catch (error) {
    console.error('Failed to save play:', error)
    alert('Failed to save play. Please try again.')
    // Keep dialog open on error
  }
}

const handleCancelSave = () => {
  showSavePlayDialog.value = false
  // Optionally clear the recorded states if user cancels
  currentPlayerStates.value = []
}
</script>

<style>
.app-container {
  min-height: 100vh;
  background: #000000;
}

.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 2rem;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(20px);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  position: sticky;
  top: 0;
  z-index: 1000;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.navbar-brand {
  display: flex;
  align-items: center;
}

.logo {
  font-size: 1.5rem;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: -0.5px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.navbar-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.nav-btn.profile-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.nav-btn.profile-btn:hover {
  color: #ffffff;
}

.nav-btn.profile-btn .icon {
  font-size: 1.3rem;
  margin-right: 0.5rem;
  opacity: 0.9;
}

.nav-btn {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 1rem 1.25rem;
  margin-bottom: 0.5rem;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  transform: translateX(4px);
}

.nav-btn.active {
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
  font-weight: 600;
}

.nav-btn .icon {
  font-size: 1.3rem;
  margin-right: 1rem;
  opacity: 0.9;
}

.hamburger {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 28px;
  height: 20px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  z-index: 1001;
  margin-left: 1rem;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.hamburger:hover {
  transform: scale(1.05);
}

.hamburger span {
  width: 100%;
  height: 2px;
  background: #ffffff;
  border-radius: 2px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: block;
  transform-origin: center;
}

.hamburger.active span:nth-child(1) {
  transform: translateY(9px) rotate(45deg);
  background: #ffffff;
}

.hamburger.active span:nth-child(2) {
  opacity: 0;
  transform: scale(0);
}

.hamburger.active span:nth-child(3) {
  transform: translateY(-9px) rotate(-45deg);
  background: #ffffff;
}

.navbar-menu {
  position: fixed;
  top: 0;
  right: -100%;
  width: 300px;
  height: 100vh;
  background: rgba(0, 0, 0, 0.98);
  backdrop-filter: blur(20px);
  display: flex;
  flex-direction: column;
  padding: 5rem 1.5rem 1.5rem;
  margin: 0;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.navbar-menu.active {
  right: 0;
}

.main-content {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.pitch-container {
  width: 100%;
}

.playback-screen {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.playback-header {
  display: flex;
  align-items: center;
  gap: 2rem;
  margin-bottom: 2rem;
}

.close-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateX(-4px);
}

.close-btn .icon {
  font-size: 1.2rem;
}

.playback-title {
  color: white;
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

@media (max-width: 768px) {
  .navbar {
    padding: 1rem;
  }
  .main-content {
    padding: 1rem;
  }
}

.player-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.control-group {
  position: relative;
  width: 100%;
}

.nav-btn.attacking {
  background: linear-gradient(135deg, #FF4444, #FF6B6B);
  color: white;
  font-weight: 600;
}

.nav-btn.defensive {
  background: linear-gradient(135deg, #4444FF, #6D9BFF);
  color: white;
  font-weight: 600;
}

.count-selector {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1rem;
  margin-top: 0.5rem;
  z-index: 1002;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.count-label {
  display: block;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
}

.count-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

.count-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  padding: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.count-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.count-btn.active {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-color: rgba(255, 255, 255, 0.3);
}

.record {
  background: rgba(255, 0, 0, 0.1);
}

.record.recording {
  background: rgba(255, 0, 0, 0.3);
  animation: pulse 2s infinite;
}

.plays-list {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  max-height: 300px;
  overflow-y: auto;
}

.no-plays {
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
  padding: 1rem;
}

.play-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.play-item:last-child {
  border-bottom: none;
}

.play-name {
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.9rem;
}

.play-actions {
  display: flex;
  gap: 0.5rem;
}

.play-action-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.play-action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(255, 0, 0, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 0, 0, 0);
  }
}
</style> 