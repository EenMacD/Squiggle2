<template>
  <div class="rugby-pitch-container" :class="{ 'minimized': false }">
    <!-- Control Panel -->
    <ControlPanel
      :is-recording="props.isRecording"
      :is-sequence-mode="gameState.isSequenceMode.value"
      :is-running-current-phase="animationState.isRunningCurrentPhase.value"
      :is-running-full-play="animationState.isRunningFullPlay.value"
      :has-any-sequences-in-current-phase="computedGameState.hasAnySequencesInCurrentPhase || false"
      :has-multiple-phases="gameState.phases.value.length > 1"
      :has-any-paths="computedGameState.hasAnyPaths"
      @add-players="handleAddPlayers"
      @toggle-recording="handleToggleRecording"
      @toggle-sequence-mode="handleToggleSequenceMode"
      @clear-paths="handleClearPaths"
      @run-current-phase="handleRunCurrentPhase"
      @run-full-play="handleRunFullPlay"
      @save-play="handleSavePlay"
      @load-play="handleLoadPlay"
    />

    <!-- Sequence Management Container -->
    <div v-if="gameState.isSequenceMode.value" class="sequence-management-container">
      <!-- Phase Management -->
      <PhaseManager
        :phases="gameState.phases.value"
        :current-phase="gameState.currentPhase.value"
        :is-sequence-mode="gameState.isSequenceMode.value"
        @phase-select="handlePhaseSelect"
        @phase-add="handlePhaseAdd"
        @phase-remove="handlePhaseRemove"
      />

      <!-- Sequence Management -->
      <SequenceManager
        :current-sequence="gameState.currentSequence.value"
        :available-sequences="gameState.availableSequences.value"
        :players-with-paths="gameState.playersWithPaths.value"
        :current-sequence-data="gameState.currentSequenceData.value || null"
        @select-sequence="handleSequenceSelect"
        @add-sequence="handleSequenceAdd"
        @remove-sequence="handleSequenceRemove"
        @run-current-sequence="handleSequenceRun"
        @run-all-sequences="handleRunAllSequences"
        @reset-current-sequence="handleSequenceReset"
      />

      <!-- Player Controls -->
      <PlayerManager
        :players="gameState.players.value"
        :available-sequences="gameState.availableSequences.value"
        :current-sequence-data="gameState.currentSequenceData.value || null"
        @toggle-player-loop="handlePlayerToggleLoop"
        @select-all-players="handleSelectAllPlayers"
        @deselect-all-players="handleDeselectAllPlayers"
      />
    </div>

    <!-- Pass Instructions -->
    <PassInstructions
      :players="gameState.players.value"
      :is-sequence-mode="gameState.isSequenceMode.value"
    />

    <!-- Dialog Components -->
    <PlayerDialog
      :show-attacking-count="extendedUIState.showPlayerDialog && extendedUIState.playerDialogType === 'attacking'"
      :show-defensive-count="extendedUIState.showPlayerDialog && extendedUIState.playerDialogType === 'defensive'"
      :selected-attacking-count="extendedUIState.playerDialogCount"
      :selected-defensive-count="extendedUIState.playerDialogCount"
      @close-dialog="handlePlayerDialogCancel"
      @confirm-player-count="handlePlayerDialogConfirm"
    />

    <ContextMenu
      :show-context-menu="uiState.showContextMenu"
      :context-menu-player="uiState.contextMenuPlayer"
      :context-menu-position="uiState.contextMenuPosition"
      @set-player-mode="handlePlayerModeUpdate"
      @toggle-path-visibility="handleTogglePathVisibility"
      @update-player-speed="handlePlayerSpeedUpdate"
      @adjust-player-delay="handlePlayerDelayUpdate"
      @reset-player-delay="handlePlayerDelayReset"
      @clear-player-path="handleClearPlayerPath"
      @close-context-menu="handleCloseContextMenu"
    />

    <!-- Main Canvas -->
    <RugbyCanvas
      ref="rugbyCanvas"
      :players="gameState.players.value"
      :ball="gameState.ball.value"
      :canvas-config="gameState.canvasConfig"
      :ui-state="uiState"
      :is-sequence-mode="gameState.isSequenceMode.value"
      :is-play-running="animationState.isPlayRunning.value"
      :current-path="uiState.currentPath"
      :is-drawing-path="uiState.isDrawingPath"
      @player-click="handlePlayerClick"
      @player-triple-click="handlePlayerTripleClick"
      @ball-click="handleBallClick"
      @canvas-click="handleCanvasClick"
      @player-drag="handlePlayerDrag"
      @ball-drag="handleBallDrag"
      @path-draw="handlePathDraw"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useGameState } from '../composables/useGameState'
import { useAnimations } from '../composables/useAnimations'
import type { 
  Player, 
  Ball, 
  UIState, 
  PathPoint,
  PlayerState,
  RugbyPitchProps 
} from '../types/game'
import ControlPanel from './ControlPanel.vue'
import PhaseManager from './PhaseManager.vue'
import SequenceManager from './SequenceManager.vue'
import PlayerManager from './PlayerManager.vue'
import PassInstructions from './PassInstructions.vue'
import PlayerDialog from './PlayerDialog.vue'
import ContextMenu from './ContextMenu.vue'
import RugbyCanvas from './RugbyCanvas.vue'

interface Props extends RugbyPitchProps {}

const props = withDefaults(defineProps<Props>(), {
  isRecording: false,
  playbackData: () => []
})

const emit = defineEmits<{
  (e: 'update:playerStates', states: PlayerState[]): void
  (e: 'update:is-recording', isRecording: boolean): void
}>()

// Composables
const gameState = useGameState()
const animationState = useAnimations(
  gameState.players,
  gameState.ball,
  computed(() => gameState.canvasConfig),
  (event: string, ...args: any[]) => {
    if (event === 'update:playerStates') {
      emit('update:playerStates', args[0])
    } else if (event === 'update:is-recording') {
      emit('update:is-recording', args[0])
    }
  },
  gameState.setBallCarrier
)

// UI State management
const uiState = reactive<UIState>({
  showAttackingCount: false,
  showDefensiveCount: false,
  showContextMenu: false,
  contextMenuPlayer: null,
  contextMenuPosition: { x: 0, y: 0 },
  selectedPlayer: null,
  selectedBall: false,
  isDragging: false,
  isDrawingPath: false,
  currentPath: [],
  dragOffset: { x: 0, y: 0 }
})

// Extended UI state for dialogs
const extendedUIState = reactive({
  showPlayerDialog: false,
  playerDialogType: 'attacking' as 'attacking' | 'defensive',
  playerDialogCount: 1
})

// Component refs
const rugbyCanvas = ref<InstanceType<typeof RugbyCanvas> | null>(null)

// Computed properties for derived state
const computedGameState = computed(() => ({
  ...gameState,
  isMinimized: false, // You can add this to gameState if needed
  hasAnySequencesInCurrentPhase: gameState.hasAnySequencesInCurrentPhase.value,
  hasAnyPaths: gameState.hasAnyPaths.value,
  availableSequences: gameState.availableSequences.value,
  currentPhaseData: gameState.currentPhaseData.value,
  currentSequenceData: gameState.currentSequenceData.value,
  playersWithPaths: gameState.playersWithPaths.value
}))

// Event Handlers - Control Panel
const handleAddPlayers = (type: 'attacking' | 'defensive') => {
  extendedUIState.showPlayerDialog = true
  extendedUIState.playerDialogType = type
  extendedUIState.playerDialogCount = 1
}

const handleToggleRecording = () => {
  const willBeRecording = !props.isRecording
  emit('update:is-recording', willBeRecording)
  
  if (willBeRecording) {
    const states = gameState.getPlayerStates()
    emit('update:playerStates', states)
  }
}

const handleToggleSequenceMode = () => {
  gameState.isSequenceMode.value = !gameState.isSequenceMode.value
  if (gameState.isSequenceMode.value) {
    if (gameState.availableSequences.value.length === 0) {
      gameState.addSequence()
    }
  } else {
    animationState.stopAllPlayerLoops()
    handleCloseContextMenu()
  }
}

const handleClearPaths = () => {
  gameState.players.value.forEach(player => {
    player.path = []
    player.mode = 'drag'
    if (player.originalPosition) {
      player.x = player.originalPosition.x
      player.y = player.originalPosition.y
    }
  })
  rugbyCanvas.value?.redraw()
}

const handleRunCurrentPhase = async () => {
  // Simple: Run all sequences in the current phase one after another
  const currentPhase = gameState.currentPhaseData.value
  if (!currentPhase || !currentPhase.sequences || currentPhase.sequences.length === 0) {
    return
  }

  // Stop any running animations first
  animationState.stopAllPlayerLoops()

  try {
    // Run each sequence in order with ball transitions
    for (const sequence of currentPhase.sequences) {
      await animationState.executeSequence(
        sequence, 
        gameState.players.value, 
        () => rugbyCanvas.value?.redraw(),
        true // isMultiSequenceExecution
      )
      // Small pause between sequences
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  } finally {
    // Animation state is managed internally by the animation system
  }
}

const handleRunFullPlay = async () => {
  // Stop any running animations
  animationState.stopAllPlayerLoops()
  
  try {
    // Get all sequences from all phases in order
    const allPhases = gameState.phases.value.sort((a, b) => a.id - b.id)
    let sequenceCount = 0
    
    for (const phase of allPhases) {
      if (!phase.sequences || phase.sequences.length === 0) continue
      
      // Sort sequences in this phase
      const sortedSequences = phase.sequences.sort((a, b) => a.id - b.id)
      
      for (const sequence of sortedSequences) {
        sequenceCount++
        
        // MODIFIED: Always reset players to their original positions for this sequence
        gameState.players.value.forEach(player => {
          const playerId = `${player.type}-${player.id}`
          
          // Priority 1: Use sequence's stored starting positions
          if (sequence.startingPlayerPositions && sequence.startingPlayerPositions[playerId]) {
            const startPos = sequence.startingPlayerPositions[playerId]
            player.x = startPos.x
            player.y = startPos.y
            player.originalPosition = { x: startPos.x, y: startPos.y }
          }
          // Priority 2: Use player data's original position
          else if (sequence.playerData && sequence.playerData[playerId] && sequence.playerData[playerId].originalPosition) {
            const originalPos = sequence.playerData[playerId].originalPosition
            player.x = originalPos.x
            player.y = originalPos.y
            player.originalPosition = { x: originalPos.x, y: originalPos.y }
          }
          // Priority 3: Use current originalPosition if it exists
          else if (player.originalPosition) {
            player.x = player.originalPosition.x
            player.y = player.originalPosition.y
          }
        })
        
        // Load sequence data
        if (sequence.playerData) {
          Object.entries(sequence.playerData).forEach(([playerId, playerData]) => {
            const [type, id] = playerId.split('-')
            const player = gameState.players.value.find(p => 
              p.type === type && p.id === parseInt(id)
            )
            if (player) {
              player.path = playerData.path ? [...playerData.path] : []
              player.speed = playerData.speed
              player.sequenceDelay = playerData.sequenceDelay
              player.mode = playerData.mode
              // Note: originalPosition is already set above, don't override it
            }
          })
        }
        
        // Execute the sequence
        await animationState.executeSequence(
          sequence, 
          gameState.players.value, 
          () => rugbyCanvas.value?.redraw(),
          true // isMultiSequenceExecution (full play)
        )
        
        // Pause between sequences for visibility
        await new Promise(resolve => setTimeout(resolve, 800))
      }
      
      // Longer pause between phases
      if (phase.id < allPhases[allPhases.length - 1].id) {
        await new Promise(resolve => setTimeout(resolve, 1500))
      }
    }
    
    console.log(`Full play complete: executed ${sequenceCount} sequences across ${allPhases.length} phases`)
    
  } finally {
    // Animation state is managed internally by the animation system
  }
}

const handleRunAllSequences = async () => {
  // Run all sequences with ball transitions
  const allSequences = gameState.availableSequences.value
  
  for (const sequence of allSequences) {
    await animationState.executeSequence(
      sequence, 
      gameState.players.value, 
      () => rugbyCanvas.value?.redraw(),
      true // isMultiSequenceExecution (run all sequences)
    )
    // Small pause between sequences
    await new Promise(resolve => setTimeout(resolve, 500))
  }
}

const handleSelectAllPlayers = () => {
  gameState.players.value.forEach(player => {
    if (player.path && player.path.length > 0) {
      player.isLooping = true
    }
  })
}

const handleDeselectAllPlayers = () => {
  gameState.players.value.forEach(player => {
    player.isLooping = false
  })
}

// Event Handlers - Phase Management
const handlePhaseSelect = (phaseId: number) => {
  gameState.selectPhase(phaseId)
}

const handlePhaseAdd = () => {
  gameState.addPhase()
}

const handlePhaseRemove = (phaseId: number) => {
  gameState.removePhase(phaseId)
}

// Event Handlers - Sequence Management
const handleSequenceSelect = (sequenceId: number) => {
  gameState.selectSequence(sequenceId)
}

const handleSequenceAdd = () => {
  gameState.addSequence()
}

const handleSequenceRemove = (sequenceId: number) => {
  gameState.removeSequence(sequenceId)
}

const handleSequenceRun = async (sequenceId: number) => {
  const sequence = gameState.availableSequences.value.find(s => s.id === sequenceId)
  if (sequence) {
    await animationState.executeSequence(
      sequence, 
      gameState.players.value, 
      () => rugbyCanvas.value?.redraw()
      // No multi-sequence flag - this is single sequence execution
    )
  }
}

const handleSequenceReset = () => {
  animationState.stopAllPlayerLoops()
  gameState.players.value.forEach(player => {
    if (player.originalPosition) {
      player.x = player.originalPosition.x
      player.y = player.originalPosition.y
    }
    player.isLooping = false
  })
  rugbyCanvas.value?.redraw()
}

// Event Handlers - Player Management
const handlePlayerToggleLoop = (player: Player) => {
  if (!player.path || player.path.length === 0) return
  
  player.isLooping = !player.isLooping
  
  const sequence = gameState.currentSequenceData.value
  if (sequence) {
    const playerId = `${player.type}-${player.id}`
    if (player.isLooping) {
      if (!sequence.activePlayerIds.includes(player.id)) {
        sequence.activePlayerIds.push(player.id)
      }
      sequence.playerData[playerId] = {
        path: player.path ? [...player.path] : [],
        originalPosition: player.originalPosition || { x: player.x, y: player.y },
        speed: player.speed || 100,
        sequenceDelay: player.sequenceDelay || 0,
        mode: player.mode || 'drag',
        position: { x: player.x, y: player.y }
      }
    } else {
      const index = sequence.activePlayerIds.indexOf(player.id)
      if (index > -1) {
        sequence.activePlayerIds.splice(index, 1)
      }
      delete sequence.playerData[playerId]
    }
  }
  
  rugbyCanvas.value?.redraw()
}

// Event Handlers - Canvas Interactions
const handlePlayerClick = (player: Player, event: MouseEvent) => {
  if (gameState.isSequenceMode.value && gameState.availableSequences.value.length > 0 && player.path && player.path.length > 0) {
    handlePlayerToggleLoop(player)
    return
  }
  
  const rect = (event.target as HTMLElement).getBoundingClientRect()
  const scaleX = gameState.canvasConfig.width / rect.width
  const scaleY = gameState.canvasConfig.height / rect.height
  const x = (event.clientX - rect.left) * scaleX
  const y = (event.clientY - rect.top) * scaleY
  
  if (player.mode === 'path') {
    // Start drawing a path
    if (!uiState.isDragging) {
      // Clear previous selection
      gameState.players.value.forEach(p => p.isSelected = false)
      
      uiState.selectedPlayer = player
      player.isSelected = true
      uiState.selectedBall = false
      uiState.isDragging = true
      uiState.isDrawingPath = true
      
      // Initialize path if it doesn't exist
      if (!player.path) {
        player.path = []
      }
      
      // Always set original position at the start of drawing a new path
      player.originalPosition = { x: player.x, y: player.y }
      
      // Start current path from player position
      uiState.currentPath = [{ x: player.x, y: player.y }]
      
      uiState.dragOffset = {
        x: x - player.x,
        y: y - player.y
      }
    }
  } else {
    // Handle normal click (drag mode)
    if (!uiState.isDragging) {
      // Clear previous selection
      gameState.players.value.forEach(p => p.isSelected = false)
      
      uiState.selectedPlayer = player
      player.isSelected = true
      uiState.selectedBall = false
      uiState.isDragging = true
      uiState.isDrawingPath = false
      
      uiState.dragOffset = {
        x: x - player.x,
        y: y - player.y
      }
    }
  }
}

const handlePlayerTripleClick = (player: Player, event: MouseEvent) => {
  if (!gameState.isSequenceMode.value) return
  
  // Show context menu
  const rect = (event.target as HTMLElement).getBoundingClientRect()
  uiState.contextMenuPosition = {
    x: event.clientX,
    y: event.clientY
  }
  
  // Initialize player for path planning
  if (!player.mode) player.mode = 'drag'
  if (!player.speed) player.speed = 100
  if (!player.originalPosition) {
    player.originalPosition = { x: player.x, y: player.y }
  }
  
  uiState.contextMenuPlayer = player
  uiState.showContextMenu = true
}

const handleBallClick = (ball: Ball, event: MouseEvent) => {
  uiState.selectedBall = true
  uiState.selectedPlayer = null
  uiState.isDragging = true
  
  const rect = (event.target as HTMLElement).getBoundingClientRect()
  const scaleX = gameState.canvasConfig.width / rect.width
  const scaleY = gameState.canvasConfig.height / rect.height
  const x = (event.clientX - rect.left) * scaleX
  const y = (event.clientY - rect.top) * scaleY
  
  uiState.dragOffset = {
    x: x - ball.x,
    y: y - ball.y
  }
}

const handleCanvasClick = (position: { x: number, y: number }, event: MouseEvent) => {
  uiState.selectedPlayer = null
  uiState.selectedBall = false
}

const handlePlayerDrag = (player: Player, position: { x: number, y: number }) => {
  if (uiState.isDrawingPath && player.mode === 'path') {
    // Handle path drawing
    const newPoint = {
      x: position.x - uiState.dragOffset.x,
      y: position.y - uiState.dragOffset.y
    }
    
    const lastPoint = uiState.currentPath[uiState.currentPath.length - 1]
    if (!lastPoint || Math.sqrt(Math.pow(newPoint.x - lastPoint.x, 2) + Math.pow(newPoint.y - lastPoint.y, 2)) > 15) {
      uiState.currentPath.push(newPoint)
    }
  } else {
    // Handle normal dragging
    player.x = position.x - uiState.dragOffset.x
    player.y = position.y - uiState.dragOffset.y
    
    // Move ball if player is carrying it
    if (player.isCarryingBall) {
      gameState.setBallCarrier(player)
    }
  }
  
  // Emit for recording
  if (props.isRecording) {
    const states = gameState.getPlayerStates()
    emit('update:playerStates', states)
  }
}

const handleBallDrag = (ball: Ball, position: { x: number, y: number }) => {
  gameState.updateBallPosition({
    x: position.x - uiState.dragOffset.x,
    y: position.y - uiState.dragOffset.y
  })
  
  // Check for player attachment
  const attachmentThreshold = gameState.canvasConfig.playerRadius * 1.2
  let closestPlayer: Player | null = null
  let minDistance = Infinity
  
  gameState.players.value.forEach(player => {
    const dx = player.x - ball.x
    const dy = player.y - ball.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance < minDistance && distance < attachmentThreshold) {
      minDistance = distance
      closestPlayer = player
    }
  })
  
  if (closestPlayer) {
    gameState.attachBallToPlayer(closestPlayer)
  } else {
    gameState.detachBall()
  }
  
  if (props.isRecording) {
    const states = gameState.getPlayerStates()
    emit('update:playerStates', states)
  }
}

const handlePathDraw = (player: Player, path: PathPoint[]) => {
  player.path = [...path]
  uiState.currentPath = []
  uiState.isDrawingPath = false
  uiState.selectedPlayer = null
}

// Event Handlers - Dialog Management
const handlePlayerDialogConfirm = (type: 'attacking' | 'defensive', count: number) => {
  for (let i = 0; i < count; i++) {
    // Calculate position based on existing players
    const existingPlayers = gameState.players.value.filter(p => p.type === type)
    const row = Math.floor(existingPlayers.length / 5)
    const col = existingPlayers.length % 5
    
    const fieldWidth = gameState.canvasConfig.fieldWidth
    const baseX = fieldWidth * 0.5
    const baseY = gameState.canvasConfig.height * (type === 'attacking' ? 0.75 : 0.25)
    const horizontalSpacing = fieldWidth * 0.08
    const verticalSpacing = gameState.canvasConfig.height * 0.05
    
    const position = {
      x: baseX + (col - 2) * horizontalSpacing,
      y: type === 'attacking' ? baseY + row * verticalSpacing : baseY - row * verticalSpacing
    }
    
    gameState.addPlayer(type, position)
  }
  
  extendedUIState.showPlayerDialog = false
  rugbyCanvas.value?.redraw()
}

const handlePlayerDialogCancel = () => {
  extendedUIState.showPlayerDialog = false
}

// Event Handlers - Context Menu
const handlePlayerModeUpdate = (mode: 'drag' | 'path') => {
  if (uiState.contextMenuPlayer) {
    uiState.contextMenuPlayer.mode = mode
    if (mode === 'path' && !uiState.contextMenuPlayer.path) {
      uiState.contextMenuPlayer.path = []
    }
  }
}

const handlePlayerSpeedUpdate = (speed: number) => {
  if (uiState.contextMenuPlayer) {
    uiState.contextMenuPlayer.speed = speed
  }
}

const handlePlayerDelayUpdate = (delay: number) => {
  if (uiState.contextMenuPlayer) {
    uiState.contextMenuPlayer.sequenceDelay = delay
  }
}

const handlePlayerDelayReset = () => {
  if (uiState.contextMenuPlayer) {
    uiState.contextMenuPlayer.sequenceDelay = 0
  }
}

const handleClearPlayerPath = () => {
  if (uiState.contextMenuPlayer) {
    uiState.contextMenuPlayer.path = []
    uiState.contextMenuPlayer.mode = 'drag'
  }
  rugbyCanvas.value?.redraw()
}

const handleTogglePathVisibility = () => {
  if (uiState.contextMenuPlayer) {
    uiState.contextMenuPlayer.pathVisible = uiState.contextMenuPlayer.pathVisible !== false ? false : true
    rugbyCanvas.value?.redraw()
  }
}

const handleCloseContextMenu = () => {
  uiState.showContextMenu = false
  uiState.contextMenuPlayer = null
}

const handleGlobalMouseUp = () => {
  if (uiState.isDragging) {
    uiState.isDragging = false
    if (!uiState.isDrawingPath) {
      uiState.selectedPlayer = null
      uiState.selectedBall = false
    }
  }
}

// Keyboard event handling for ball passing
const handleKeyDown = (event: KeyboardEvent) => {
  if (!/^[0-9]$/.test(event.key)) return
  
  const targetNumber = parseInt(event.key)
  const targetPlayer = gameState.players.value.find(player => player.assignedNumber === targetNumber)
  
  if (targetPlayer) {
    // Animate ball from the current carrier's hand to the target player
    animationState.animateBallToPlayer(targetPlayer)
    event.preventDefault()
  }
}

// NEW: Save/Load handlers
const handleSavePlay = async () => {
  const playName = prompt('Enter a name for this play:')
  if (!playName) return
  
  const success = await gameState.saveGameState(playName)
  if (success) {
    alert('Play saved successfully!')
  } else {
    alert('Failed to save play. Please try again.')
  }
}

const handleLoadPlay = async () => {
  try {
    const response = await fetch('http://localhost:8080/api/plays')
    const plays = await response.json()
    
    if (plays.length === 0) {
      alert('No saved plays found.')
      return
    }
    
    const playList = plays.map((play: any, index: number) => 
      `${index + 1}. ${play.name} (${new Date(play.createdAt).toLocaleDateString()})`
    ).join('\n')
    
    const selection = prompt(`Choose a play to load:\n\n${playList}\n\nEnter the number:`)
    const playIndex = parseInt(selection || '') - 1
    
    if (playIndex >= 0 && playIndex < plays.length) {
      const success = await gameState.loadGameState(plays[playIndex].id)
      if (success) {
        alert('Play loaded successfully!')
        rugbyCanvas.value?.redraw()
      } else {
        alert('Failed to load play. Please try again.')
      }
    }
  } catch (error) {
    alert('Failed to load plays. Please check your connection.')
  }
}

// Lifecycle
onMounted(() => {
  window.addEventListener('resize', handleResize)
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('mouseup', handleGlobalMouseUp)
  
  // Initialize canvas size based on container
  updateCanvasSize()
  
  // Watch for playback data changes
  watch(() => props.playbackData, (newValue) => {
    if (newValue.length > 0) {
      startPlayback()
    } else {
      stopPlayback()
    }
  }, { immediate: true })
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('mouseup', handleGlobalMouseUp)
  stopPlayback()
  animationState.stopAllPlayerLoops()
})

const handleResize = () => {
  updateCanvasSize()
}

const updateCanvasSize = () => {
  const container = rugbyCanvas.value?.$el?.parentElement
  if (!container) return
  
  const containerWidth = container.clientWidth
  const fieldRatio = 70/100 // Standard rugby field ratio (width/height)
  
  let newWidth, newHeight
  
  // In normal mode, fit to container
  const baseWidth = Math.min(containerWidth - 40, 1000) // Account for padding
  newWidth = baseWidth * 1.4
  newHeight = baseWidth / fieldRatio
  
  // Update canvas configuration
  gameState.updateCanvasSize(newWidth, newHeight)
  
  // Force redraw
  rugbyCanvas.value?.redraw()
}

// Playback functionality (simplified)
let playbackInterval: number | null = null
let currentPlaybackIndex = 0

const startPlayback = () => {
  if (props.playbackData.length === 0) return
  
  // Initialize playback state
  gameState.resetToDefaults()
  currentPlaybackIndex = 0
  
  // Start playback loop
  playbackInterval = window.setInterval(() => {
    if (currentPlaybackIndex >= props.playbackData.length) {
      stopPlayback()
      return
    }
    
    const currentState = props.playbackData[currentPlaybackIndex]
    // Update player positions based on playback data
    // ... playback logic
    
    currentPlaybackIndex++
  }, 100)
}

const stopPlayback = () => {
  if (playbackInterval) {
    clearInterval(playbackInterval)
    playbackInterval = null
  }
  currentPlaybackIndex = 0
}
</script>

<style scoped>
.rugby-pitch-container {
  position: relative;
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: white;
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  padding: 2rem;
  backdrop-filter: blur(20px);
}

.rugby-pitch-container.minimized {
  max-width: 500px;
}

.sequence-management-container {
  margin-bottom: 1rem;
}

@media (max-width: 768px) {
  .rugby-pitch-container {
    padding: 1rem;
  }
}
</style> 