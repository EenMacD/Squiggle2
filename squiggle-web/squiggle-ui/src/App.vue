<template>
  <div class="app-container">
    <!-- Session Status Component -->
    <SessionStatus />
    
    <!-- Hidden file input for importing -->
    <FileImportInput @file-selected="handleFileImport" />
    
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
          
          <!-- Export/Import Controls -->
          <div class="export-import-controls">
            <button class="nav-btn export-btn" @click="handleExportPlays" :disabled="plays.length === 0">
              <span class="icon">📤</span>
              Export Plays
            </button>
            <button class="nav-btn import-btn" @click="triggerFileImport">
              <span class="icon">📥</span>
              Import Plays
            </button>
            <button class="nav-btn clear-btn" @click="handleClearAllPlays" :disabled="plays.length === 0">
              <span class="icon">🗑️</span>
              Clear All
            </button>
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

    <!-- Confirm Clear All Plays Dialog -->
    <ConfirmDialog
      :show="showClearConfirm"
      title="Clear All Plays"
      message="Are you sure you want to clear all plays? This action cannot be undone."
      confirm-text="Clear All Plays"
      @confirm="handleClearAllPlaysConfirm"
      @cancel="showClearConfirm = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import RugbyPitch from './components/RugbyPitch.vue'
import PlaybackViewer from './components/PlaybackViewer.vue'
import SavePlayDialog from './components/SavePlayDialog.vue'
import SessionStatus from './components/SessionStatus.vue'
import FileImportInput from './components/FileImportInput.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import { playService } from './services/playService'
import { usePlaysStore } from './stores/playsStore'
import { useActivityTracker } from './composables/useActivityTracker'
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
const showClearConfirm = ref(false)

const playsStore = usePlaysStore()
useActivityTracker()

onMounted(async () => {
  try {
    plays.value = playsStore.listPlays()
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
  if (isRecording.value && !newValue) {
    if (currentPlayerStates.value.length > 0) {
      showSavePlayDialog.value = true
    }
  } else if (!isRecording.value && newValue) {
    currentPlayerStates.value = []
  }
  isRecording.value = newValue
}

const updatePlayerStates = (states: PlayerState[]) => {
  if (isRecording.value) {
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
    try {
      await playService.deletePlay(id)
    plays.value = playsStore.listPlays()
    } catch (error) {
      console.error('Failed to delete play:', error)
  }
}

const handleSequenceComplete = () => {
  console.log('Sequence playback complete')
}

const handleSavePlay = async (playName: string) => {
  try {
    const uniqueStates = currentPlayerStates.value.reduce((acc, state) => {
      const key = `${state.playerId}-${state.timestamp}`
      if (!acc.has(key)) {
        acc.set(key, state)
      }
      return acc
    }, new Map<string, PlayerState>())
    
    await playService.createPlay({
      name: playName,
      playerStates: Array.from(uniqueStates.values()),
    })
    plays.value = playsStore.listPlays()
    currentPlayback.value = plays.value[plays.value.length - 1] || null
    showSavePlayDialog.value = false
    console.log('Play saved successfully:', playName)
  } catch (error) {
    console.error('Failed to save play:', error)
    alert('Failed to save play. Please try again.')
  }
}

const handleCancelSave = () => {
  showSavePlayDialog.value = false
  currentPlayerStates.value = []
}

// Export/Import functionality
const handleExportPlays = async () => {
  try {
    await playService.exportPlays()
    alert('Plays exported successfully!')
  } catch (error) {
    console.error('Failed to export plays:', error)
    alert(`Failed to export plays: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

const triggerFileImport = () => {
  // This will be handled by the FileImportInput component
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
  if (fileInput) {
    fileInput.click()
  }
}

const handleFileImport = async (file: File) => {
  try {
    const result = await playService.importPlays(file)
    
    if (result.success > 0) {
      // Refresh the plays list
      plays.value = playsStore.listPlays()
      
      let message = `Successfully imported ${result.success} play(s)`
      if (result.errors.length > 0) {
        message += `\n\nErrors:\n${result.errors.join('\n')}`
      }
      
      alert(message)
    } else {
      alert('No plays were imported. Please check the file format.')
    }
  } catch (error) {
    console.error('Failed to import plays:', error)
    alert(`Failed to import plays: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

const handleClearAllPlays = () => {
  showClearConfirm.value = true
}

const handleClearAllPlaysConfirm = async () => {
    try {
      await playService.clearAllPlays()
      plays.value = []
      currentPlayback.value = null
      alert('All plays cleared successfully!')
    } catch (error) {
      console.error('Failed to clear plays:', error)
      alert('Failed to clear plays. Please try again.')
    }
  showClearConfirm.value = false
}
</script>

<style>
.app-container {
  min-height: 100vh;
  background: #000000;
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
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
  font-size: 1.3rem;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: -0.5px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.navbar-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
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
  min-width: 44px;
  min-height: 44px;
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
  width: 90vw;
  max-width: 320px;
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
  padding: 1rem;
  max-width: 100vw;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.pitch-container {
  width: 100%;
}

.playback-screen {
  width: 100%;
  max-width: 100vw;
  margin: 0 auto;
  padding: 1rem;
}

.playback-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
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
  min-width: 44px;
  min-height: 44px;
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
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

@media (max-width: 768px) {
  .navbar {
    padding: 0.5rem 1rem;
  }
  .main-content {
    padding: 0.5rem;
    gap: 0.5rem;
  }
  .playback-header {
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  .playback-title {
    font-size: 1rem;
  }
  .navbar-menu {
    width: 100vw;
    max-width: 100vw;
    padding: 4rem 1rem 1rem;
  }
}

button, .nav-btn, .control-btn, .play-action-btn {
  min-width: 44px;
  min-height: 44px;
  font-size: 1rem;
  border-radius: 10px;
  padding: 0.75rem 1rem;
  box-sizing: border-box;
}

input, textarea, select {
  font-size: 16px !important;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  box-sizing: border-box;
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

.export-import-controls {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.export-import-controls .nav-btn {
  margin-bottom: 0.5rem;
}

.nav-btn.export-btn {
  background: linear-gradient(135deg, #28a745, #20c997);
  color: white;
  font-weight: 600;
}

.nav-btn.export-btn:disabled {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.3);
  cursor: not-allowed;
}

.nav-btn.import-btn {
  background: linear-gradient(135deg, #007bff, #0056b3);
  color: white;
  font-weight: 600;
}

.nav-btn.clear-btn {
  background: linear-gradient(135deg, #dc3545, #c82333);
  color: white;
  font-weight: 600;
}

.nav-btn.clear-btn:disabled {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.3);
  cursor: not-allowed;
}

@media (max-width: 480px) {
  .navbar {
    flex-direction: column;
    align-items: flex-start;
    padding: 0.5rem;
  }
  .navbar-brand {
    margin-bottom: 0.5rem;
  }
  .main-content {
    padding: 0.25rem;
  }
  .playback-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
  .playback-title {
    font-size: 0.95rem;
  }
}
</style> 