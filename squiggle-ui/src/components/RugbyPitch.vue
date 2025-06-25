<template>
  <div class="rugby-pitch-container" :class="{ 'minimized': isMinimized, 'fullscreen': isFullscreen }">
    <!-- Phase Management Tabs -->
    <div class="phase-tabs" v-if="isPhaseActive">
      <div class="phase-instructions">
        <span class="instructions-text" v-if="!isSequenceMode">Triple-click any player to set path & speed</span>
        <span class="instructions-text" v-else-if="sequencePlayersOrder.length === 0">Click 'Start Sequence' to begin player sequencing</span>
        <span class="instructions-text" v-else-if="currentSequencePlayerIndex < sequencePlayersOrder.length">
          Sequencing Player {{ sequencePlayersOrder[currentSequencePlayerIndex]?.id }} ({{ currentSequencePlayerIndex + 1 }}/{{ sequencePlayersOrder.length }}) - Triple-click to set path & speed, then click 'Next Player'
        </span>
        <span class="instructions-text" v-else>All players sequenced! Click 'Run Sequence' to test timing</span>
      </div>
      <div class="sequence-controls" v-if="isSequenceLinesActive">
        <button 
          v-if="sequencePlayersOrder.length === 0"
          @click="startSequence" 
          class="sequence-btn start-sequence"
        >
          Start Sequence
        </button>
        <button 
          v-else-if="currentSequencePlayerIndex < sequencePlayersOrder.length"
          @click="nextSequencePlayer"
          class="sequence-btn next-player"
          :disabled="!hasCurrentPlayerPath"
        >
          Next Player ({{ currentSequencePlayerIndex + 1 }}/{{ sequencePlayersOrder.length }})
        </button>
        <button 
          v-else
          @click="runSequence"
          class="sequence-btn run-sequence"
          :disabled="isSequenceRunning"
        >
          {{ isSequenceRunning ? 'Running...' : 'Run Sequence' }}
        </button>
        <button 
          @click="resetSequence"
          class="sequence-btn reset-sequence"
        >
          Reset Sequence
        </button>
      </div>
      <button 
        v-for="phase in phases" 
        :key="phase.id"
        @click="selectPhase(phase.id)" 
        :class="{ active: currentPhase === phase.id }"
        class="phase-tab"
      >
        Phase {{ phase.id }}
      </button>
      <button @click="addPhase" class="phase-tab add-phase">+ Add Phase</button>
    </div>

    <!-- Sequence Management Tabs -->
    <div class="sequence-tabs" v-if="isPhaseActive && isSequenceMode">
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
    </div>

    <!-- Player Sequence Controls -->
    <div class="player-controls" v-if="isPhaseActive && isSequenceMode && availableSequences.length > 0">
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
          <span class="player-icon">{{ player.type === 'attacking' ? 'A' : 'D' }}{{ player.id }}</span>
          <span class="player-status">
            {{ player.isLooping ? 'INCLUDED' : canActivatePlayer(player) ? 'READY' : 'NEEDS PATH' }}
            <span v-if="canActivatePlayer(player) && player.sequenceDelay !== undefined" class="player-delay">
              {{ player.sequenceDelay }}ms delay
            </span>
          </span>
        </div>
      </div>
      
      <div class="sequence-controls-new">
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

    <!-- Pass Key Instructions -->
    <div class="pass-instructions" v-if="players.length > 0 && !isPhaseActive">
      <div class="pass-title">Pass to Player:</div>
      <div class="pass-keys">
        <span 
          v-for="player in players.filter(p => p.assignedNumber !== undefined)" 
          :key="`${player.type}-${player.id}`"
          class="pass-key"
          :class="player.type"
        >
          {{ player.assignedNumber }}: {{ player.type === 'attacking' ? 'A' : 'D' }}{{ player.id }}
        </span>
      </div>
    </div>

    <div class="canvas-controls">
      <button @click="showPlayerCount('attacking')" class="control-btn attacking">
        <span class="icon">+</span>
        Add Attack
      </button>

      <button @click="showPlayerCount('defensive')" class="control-btn defensive">
        <span class="icon">+</span>
        Add Defense
      </button>
      
      <button @click="toggleRecording" class="control-btn record" :class="{ 'recording': props.isRecording }">
        <span class="icon">●</span>
        {{ props.isRecording ? 'Stop Recording' : 'Record Play' }}
      </button>

      <button @click="togglePhaseMode" class="control-btn phase-mode" :class="{ 'active': isPhaseActive }" title="Triple-click players to set paths and speeds">
        <span class="icon">⟿</span>
        {{ isPhaseActive ? 'Exit Phase Mode' : 'Phase Mode' }}
      </button>

      <button 
        v-if="isPhaseActive"
        @click="toggleSequenceMode" 
        class="control-btn sequence-mode" 
        :class="{ 'active': isSequenceMode }" 
        title="Toggle sequence management - click players to include in sequences"
      >
        <span class="icon">🎬</span>
        {{ isSequenceMode ? 'Exit Sequence Mode' : 'Sequence Mode' }}
      </button>

      <button 
        @click="runCurrentPhaseSequences" 
        class="control-btn run-phase" 
        :disabled="!hasAnySequencesInCurrentPhase || isRunningCurrentPhase"
        :class="{ 'running': isRunningCurrentPhase, 'recording': props.isRecording && hasAnySequencesInCurrentPhase }"
      >
        <span class="icon">▶</span>
        {{ isRunningCurrentPhase ? 'Running Phase...' : props.isRecording && hasAnySequencesInCurrentPhase ? 'Run & Record Phase' : 'Run Current Phase' }}
      </button>

      <button 
        v-if="isPhaseActive && phases.length > 1"
        @click="runFullPlay" 
        class="control-btn run-full-play" 
        :disabled="isRunningCurrentPhase || isRunningFullPlay"
        :class="{ 'running': isRunningFullPlay }"
      >
        <span class="icon">▶▶</span>
        {{ isRunningFullPlay ? 'Running Full Play...' : 'Run Full Play' }}
      </button>

      <button @click="clearAllPaths" class="control-btn clear-paths" :disabled="!hasAnyPaths">
        <span class="icon">🗑</span>
        Clear Paths
      </button>
      
      <button @click="toggleFullscreen" class="control-btn minimize" :class="{ 'fullscreen-btn': isFullscreen }">
        <span class="icon">{{ isFullscreen ? '⤢' : '⤡' }}</span>
        {{ isFullscreen ? 'Exit Fullscreen' : 'Fullscreen' }}
      </button>
    </div>

    <!-- Dialog Backdrop -->
    <div v-if="showAttackingCount || showDefensiveCount || showContextMenu" class="dialog-backdrop" @click="closeDialog"></div>

    <!-- Player Count Dialog -->
    <div v-if="showAttackingCount || showDefensiveCount" class="dialog">
      <div class="dialog-content">
        <h3 class="dialog-title">
          {{ showAttackingCount ? 'Add Attacking Players' : 'Add Defensive Players' }}
        </h3>
        <div class="number-input">
          <button class="number-btn" @click="decrementCount(showAttackingCount ? 'attacking' : 'defensive')">-</button>
          <input 
            type="number" 
            :value="showAttackingCount ? selectedAttackingCount : selectedDefensiveCount"
            @input="validateCount(showAttackingCount ? 'attacking' : 'defensive', $event)"
            min="1" 
            max="16"
          >
          <button class="number-btn" @click="incrementCount(showAttackingCount ? 'attacking' : 'defensive')">+</button>
        </div>
        <div class="dialog-actions">
          <button class="dialog-btn cancel" @click="closeDialog">Cancel</button>
          <button class="dialog-btn confirm" @click="confirmPlayerCount(showAttackingCount ? 'attacking' : 'defensive')">
            Add Players
          </button>
        </div>
      </div>
    </div>

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
            @input="updatePlayerSpeed($event)"
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

    <div class="canvas-container">
      <canvas
        ref="pitchCanvas"
        :width="canvasWidth"
        :height="canvasHeight"
        @mousedown="handleCanvasClick"
        @mousemove="handleCanvasMouseMove"
        @mouseup="handleCanvasMouseUp"
        @mouseleave="handleCanvasMouseUp"
      ></canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted, computed } from 'vue'
import type { PlayerState } from '../types/play'

interface PathPoint {
  x: number
  y: number
  timestamp?: number
}

interface Player {
  x: number
  y: number
  type: 'attacking' | 'defensive'
  id: number
  mode?: 'drag' | 'path'
  speed?: number // Percentage of base speed (100 = normal)
  path?: PathPoint[]
  originalPosition?: { x: number, y: number }
  assignedNumber?: number // 1-9, 0 for pass functionality
  isSelected?: boolean
  isLooping?: boolean // Whether the player is actively looping in current sequence
  loopStartTime?: number // When the loop started for timing calculations
  sequenceDelay?: number // Delay in milliseconds before starting path
  isAnimating?: boolean // Whether the player is currently animating along their path
  pathVisible?: boolean // Whether to show the path when drawing
  isCarryingBall?: boolean // Whether this player is carrying the ball
  currentPathIndex?: number // Current index in path for animations
}

interface Sequence {
  id: number
  name: string
  activePlayerIds: number[] // Players that are looping in this sequence
  ballEvents: BallPassEvent[] // Recorded ball pass events with timing
  isActive?: boolean
  passingInterval?: number // Timer interval for ball passing
  // Enhanced: Store complete player state per sequence
  playerData: {
    [playerId: string]: {
      path: PathPoint[]
      originalPosition: { x: number, y: number }
      speed: number
      sequenceDelay: number
      mode: 'drag' | 'path'
      position: { x: number, y: number }
    }
  }
  ballState: Ball
  // NEW: Store final positions after this sequence completes
  finalPlayerPositions?: { [playerId: string]: { x: number, y: number } }
  // NEW: Store starting positions for this sequence
  startingPlayerPositions?: { [playerId: string]: { x: number, y: number } }
}

interface BallPassEvent {
  timestamp: number // Relative to sequence start
  fromPlayerId: number
  toPlayerId: number
  ballPosition: { x: number, y: number }
}

interface Phase {
  id: number
  name: string
  playerStates: Player[]
  ballState: Ball
  sequences: Sequence[] // Array of sequences within this phase
  currentSequenceId?: number // Track which sequence is currently selected for this phase
  duration?: number
  sequenceProgress?: {
    currentPlayerIndex: number
    completedPlayers: number[]
  }
}

interface Ball {
  x: number
  y: number
  attachedTo: { type: 'attacking' | 'defensive', id: number } | null
}

interface Props {
  isRecording?: boolean
  playbackData?: PlayerState[]
}

const props = withDefaults(defineProps<Props>(), {
  isRecording: false,
  playbackData: () => []
})

const emit = defineEmits<{
  (e: 'update:playerStates', states: PlayerState[]): void
  (e: 'update:is-recording', isRecording: boolean): void
}>()

const pitchCanvas = ref<HTMLCanvasElement | null>(null)
const canvasWidth = ref(800)
const canvasHeight = ref(600)
const isMinimized = ref(false)
const isFullscreen = ref(false)
const players = ref<Player[]>([])
const ball = ref<Ball>({
  x: 0,
  y: 0,
  attachedTo: null
})
const selectedPlayer = ref<Player | null>(null)
const selectedBall = ref<boolean>(false)
const isDragging = ref(false)
const dragOffset = ref<{ x: number, y: number, playerIndex?: number, pointIndex?: number }>({ x: 0, y: 0 })
let nextPlayerId = 1

// Player count dialog state
const showAttackingCount = ref(false)
const showDefensiveCount = ref(false)
const selectedAttackingCount = ref(1)
const selectedDefensiveCount = ref(1)

// Phase planning state
const isPhaseActive = ref(false)
const showContextMenu = ref(false)
const contextMenuPlayer = ref<Player | null>(null)
const contextMenuPosition = ref({ x: 0, y: 0 })
const isDrawingPath = ref(false)
const currentPath = ref<PathPoint[]>([])
const isPlayRunning = ref(false)
const playAnimations = ref<Map<number, number>>(new Map())

// Legacy sequence lines state (unused but kept for compatibility)
const isSequenceLinesActive = ref(false)
const currentSequencePlayerIndex = ref(0)
const sequenceCompletedPlayers = ref<number[]>([])
const sequencePlayersOrder = ref<Player[]>([])
const isSequenceRunning = ref(false)

// Multi-phase management
const phases = ref<Phase[]>([{ id: 1, name: 'Phase 1', playerStates: [], ballState: { x: 0, y: 0, attachedTo: null }, sequences: [] }])
const currentPhase = ref(1)
const isRunningAllPhases = ref(false)
const isRunningCurrentPhase = ref(false)
const isRunningFullPlay = ref(false)

// Sequence Management state
const currentSequence = ref(1)
const isSequenceMode = ref(false)
const activeLoopingPlayers = ref<Map<number, number>>(new Map()) // PlayerId -> Loop Animation ID
const sequenceStartTime = ref<number>(0)
const recordedBallEvents = ref<BallPassEvent[]>([])
const isRecordingBallEvents = ref(false)

// Triple-click detection
const clickCount = ref(0)
const clickTimer = ref<number | null>(null)
const lastClickedPlayer = ref<Player | null>(null)

const playbackInterval = ref<number | null>(null)
const currentPlaybackIndex = ref(0)

// Computed properties
const contextMenuStyle = computed(() => ({
  left: `${contextMenuPosition.value.x}px`,
  top: `${contextMenuPosition.value.y}px`
}))

const hasAnyPaths = computed(() => 
  players.value.some(player => player.path && player.path.length > 0)
)

const hasCurrentPlayerPath = computed(() => {
  if (!isSequenceLinesActive.value || sequencePlayersOrder.value.length === 0) return false
  if (currentSequencePlayerIndex.value >= sequencePlayersOrder.value.length) return true
  
  const currentPlayer = sequencePlayersOrder.value[currentSequencePlayerIndex.value]
  return currentPlayer && currentPlayer.path && currentPlayer.path.length > 0
})

const currentPhaseData = computed(() => {
  return phases.value.find(p => p.id === currentPhase.value)
})

const currentSequenceData = computed(() => {
  const phase = currentPhaseData.value
  if (!phase || !phase.sequences) return null
  return phase.sequences.find(s => s.id === currentSequence.value)
})

const availableSequences = computed(() => {
  const phase = currentPhaseData.value
  return phase?.sequences || []
})

const playersWithPaths = computed(() => {
  return players.value.filter(player => player.path && player.path.length > 0)
})

const canActivatePlayer = computed(() => (player: Player) => {
  return player.path && player.path.length > 0
})

const hasAnySequencesInCurrentPhase = computed(() => {
  const phase = currentPhaseData.value
  return phase?.sequences && phase.sequences.length > 0 && 
         phase.sequences.some(seq => seq.activePlayerIds.length > 0)
})

const calculateFullscreenDimensions = () => {
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight
  
  // Use the same base ratio as normal mode
  const baseWidth = 1000
  const fieldRatio = 70/100 // Standard rugby field ratio (width/height)
  const normalWidth = baseWidth * 1.4 // 1400px - same as normal mode
  const normalHeight = baseWidth / fieldRatio // ~1428px - same as normal mode
  
  // Calculate scale factor to fit in window while maintaining exact same proportions
  const scaleX = (windowWidth * 0.9) / normalWidth
  const scaleY = (windowHeight * 0.9) / normalHeight
  const scale = Math.min(scaleX, scaleY) // Use smaller scale to fit both dimensions
  
  return {
    width: normalWidth * scale,
    height: normalHeight * scale
  }
}

const updateCanvasSize = () => {
  // Use the same base dimensions for both modes
  const baseWidth = 1000
  const fieldRatio = 70/100
  
  if (isFullscreen.value) {
    const dimensions = calculateFullscreenDimensions()
    canvasWidth.value = dimensions.width
    canvasHeight.value = dimensions.height
  } else {
    // Normal mode - use base dimensions
    canvasWidth.value = baseWidth * 1.4 // 40% extra width
    canvasHeight.value = baseWidth / fieldRatio
  }
  
  // Update ball position to center of pitch
  const fieldWidth = canvasWidth.value / 1.4 // Remove the extra width for substitutes
  const fieldHeight = canvasHeight.value
  ball.value.x = fieldWidth * 0.5 // Center horizontally
  ball.value.y = fieldHeight * 0.5 // Center vertically
  
  requestAnimationFrame(drawPitch)
}

const toggleFullscreen = () => {
  // Store current player positions relative to field dimensions
  const fieldWidth = canvasWidth.value / 1.4 // Remove the extra width for substitutes
  const fieldHeight = canvasHeight.value
  const playerPositions = players.value.map(player => ({
    ...player,
    relativeX: player.x / fieldWidth,
    relativeY: player.y / fieldHeight
  }))
  
  // Toggle fullscreen
  isFullscreen.value = !isFullscreen.value
  
  // Update canvas size
  updateCanvasSize()
  
  // Restore player positions using relative coordinates
  const newFieldWidth = canvasWidth.value / 1.4
  const newFieldHeight = canvasHeight.value
  players.value = playerPositions.map(player => ({
    ...player,
    x: player.relativeX * newFieldWidth,
    y: player.relativeY * newFieldHeight
  }))
  
  requestAnimationFrame(drawPitch)
}

const handleResize = () => {
  if (isFullscreen.value) {
    updateCanvasSize()
  }
}

const toggleMinimize = () => {
  isMinimized.value = !isMinimized.value
  if (!isMinimized.value) {
    drawPitch()
  }
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

const incrementCount = (type: 'attacking' | 'defensive') => {
  if (type === 'attacking' && selectedAttackingCount.value < 16) {
    selectedAttackingCount.value++
  } else if (type === 'defensive' && selectedDefensiveCount.value < 16) {
    selectedDefensiveCount.value++
  }
}

const decrementCount = (type: 'attacking' | 'defensive') => {
  if (type === 'attacking' && selectedAttackingCount.value > 1) {
    selectedAttackingCount.value--
  } else if (type === 'defensive' && selectedDefensiveCount.value > 1) {
    selectedDefensiveCount.value--
  }
}

const closeDialog = () => {
  showAttackingCount.value = false
  showDefensiveCount.value = false
  showContextMenu.value = false
}

// Phase planning methods
const togglePhaseMode = () => {
  isPhaseActive.value = !isPhaseActive.value
  if (!isPhaseActive.value) {
    closeContextMenu()
  }
}

const handleTripleClick = (player: Player, event: MouseEvent) => {
  if (!isPhaseActive.value) return
  
  // In sequence lines mode, only allow configuring the current player
  if (isSequenceLinesActive.value && sequencePlayersOrder.value.length > 0) {
    const currentPlayer = sequencePlayersOrder.value[currentSequencePlayerIndex.value]
    if (currentPlayer && player.id !== currentPlayer.id) {
      return // Don't show context menu for non-current players
    }
  }
  
  // Show context menu
  const rect = pitchCanvas.value?.getBoundingClientRect()
  if (rect) {
    contextMenuPosition.value = {
      x: event.clientX - rect.left + rect.left,
      y: event.clientY - rect.top + rect.top
    }
  }
  
  // Initialize player for path planning if not already set
  if (!player.mode) {
    player.mode = 'drag'
  }
  if (!player.speed) {
    player.speed = 100
  }
  if (!player.originalPosition) {
    player.originalPosition = { x: player.x, y: player.y }
  }
  
  contextMenuPlayer.value = player
  showContextMenu.value = true
}

const setPlayerMode = (mode: 'drag' | 'path') => {
  if (contextMenuPlayer.value) {
    contextMenuPlayer.value.mode = mode
    if (mode === 'path' && !contextMenuPlayer.value.path) {
      contextMenuPlayer.value.path = []
    }
  }
}

const updatePlayerSpeed = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (contextMenuPlayer.value) {
    contextMenuPlayer.value.speed = parseInt(input.value)
    // Save to current sequence efficiently
    throttledSaveCurrentSequence()
  }
}

const adjustPlayerDelay = (amount: number) => {
  if (contextMenuPlayer.value) {
    const currentDelay = contextMenuPlayer.value.sequenceDelay || 0
    const newDelay = Math.max(0, currentDelay + amount) // Don't allow negative delays
    contextMenuPlayer.value.sequenceDelay = newDelay
    // Save to current sequence efficiently
    throttledSaveCurrentSequence()
  }
}

const resetPlayerDelay = () => {
  if (contextMenuPlayer.value) {
    contextMenuPlayer.value.sequenceDelay = 0
    // Save to current sequence efficiently
    throttledSaveCurrentSequence()
  }
}

const clearPlayerPath = () => {
  if (contextMenuPlayer.value) {
    contextMenuPlayer.value.path = []
    contextMenuPlayer.value.mode = 'drag'
    // Save to current sequence efficiently
    throttledSaveCurrentSequence()
  }
  drawPitch()
}

const closeContextMenu = () => {
  showContextMenu.value = false
  contextMenuPlayer.value = null
}

const clearAllPaths = () => {
  players.value.forEach(player => {
    player.path = []
    player.mode = 'drag'
    if (player.originalPosition) {
      player.x = player.originalPosition.x
      player.y = player.originalPosition.y
    }
  })
  drawPitch()
}

// NEW: Clear all player paths for sequence independence
const clearAllPlayerPaths = () => {
  players.value.forEach(player => {
    // Clear all path-related visual data
    player.path = []
    player.currentPathIndex = 0
    // Keep position but remove path visualization
  })
  
  // Clear any active animations
  activeLoopingPlayers.value.clear()
  playAnimations.value.clear()
  
  // Force immediate redraw to update display
  drawPitch()
}

// NEW: Inherit positions from previous sequence
const inheritPositionsFromSequence = (previousSequence: Sequence) => {
  if (!previousSequence.finalPlayerPositions) return
  
  players.value.forEach(player => {
    const playerId = `${player.type}-${player.id}`
    const finalPos = previousSequence.finalPlayerPositions![playerId]
    if (finalPos) {
      player.x = finalPos.x
      player.y = finalPos.y
    }
  })
}

// NEW: Load sequence starting positions
const loadSequenceStartingPositions = (sequenceId: number) => {
  const currentSeq = currentSequenceData.value
  if (!currentSeq) return
  
  // Use stored starting positions or inherit from previous sequence
  if (currentSeq.startingPlayerPositions) {
    players.value.forEach(player => {
      const playerId = `${player.type}-${player.id}`
      const startPos = currentSeq.startingPlayerPositions![playerId]
      if (startPos) {
        player.x = startPos.x
        player.y = startPos.y
      }
    })
  }
}

// Sequence Mode functions
const toggleSequenceMode = () => {
  isSequenceMode.value = !isSequenceMode.value
  if (isSequenceMode.value) {
    // Auto-create first sequence if none exist
    if (availableSequences.value.length === 0) {
      addSequence()
    }
  } else {
    // Stop all loops when exiting sequence mode
    stopAllPlayerLoops()
  }
}

const startSequence = () => {
  // Order players logically (e.g., by position on field)
  sequencePlayersOrder.value = [...players.value].sort((a, b) => {
    // Sort by team first (attacking players first), then by y position
    if (a.type !== b.type) {
      return a.type === 'attacking' ? -1 : 1
    }
    return a.y - b.y
  })
  
  currentSequencePlayerIndex.value = 0
  sequenceCompletedPlayers.value = []
  
  // Clear all existing paths
  players.value.forEach(player => {
    player.path = []
    player.mode = 'drag'
    player.isSelected = false
  })
  
  // Select first player
  if (sequencePlayersOrder.value.length > 0) {
    sequencePlayersOrder.value[0].isSelected = true
  }
  
  drawPitch()
}

const nextSequencePlayer = () => {
  if (currentSequencePlayerIndex.value < sequencePlayersOrder.value.length) {
    // Mark current player as completed
    const currentPlayer = sequencePlayersOrder.value[currentSequencePlayerIndex.value]
    if (currentPlayer) {
      sequenceCompletedPlayers.value.push(currentPlayer.id)
      currentPlayer.isSelected = false
    }
    
    // Move to next player
    currentSequencePlayerIndex.value++
    
    // Select next player if available
    if (currentSequencePlayerIndex.value < sequencePlayersOrder.value.length) {
      const nextPlayer = sequencePlayersOrder.value[currentSequencePlayerIndex.value]
      if (nextPlayer) {
        nextPlayer.isSelected = true
      }
    }
    
    drawPitch()
  }
}

const runSequence = async () => {
  if (isSequenceRunning.value) return
  
  isSequenceRunning.value = true
  
  // Run players in sequence with timing
  for (let i = 0; i < sequencePlayersOrder.value.length; i++) {
    const player = sequencePlayersOrder.value[i]
    
    if (player.path && player.path.length > 0 && player.originalPosition && player.speed) {
      // Reset player to original position
      player.x = player.originalPosition.x
      player.y = player.originalPosition.y
      
      // Animate this player's path
      const pathLength = calculatePathLength(player.path)
      const baseSpeed = 100 // pixels per second at 100% speed
      const actualSpeed = (baseSpeed * player.speed) / 100
      const duration = (pathLength / actualSpeed) * 1000 // Convert to milliseconds
      
      await animatePlayerPath(player, duration)
      
      // Wait a moment before starting next player
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  
  isSequenceRunning.value = false
}

const resetSequence = () => {
  currentSequencePlayerIndex.value = 0
  sequenceCompletedPlayers.value = []
  sequencePlayersOrder.value = []
  isSequenceRunning.value = false
  
  // Deselect all players
  players.value.forEach(player => {
    player.isSelected = false
  })
  
  drawPitch()
}

// Phase management functions
const selectPhase = (phaseId: number) => {
  // Save current phase state
  saveCurrentPhaseState()
  
  // Switch to selected phase
  currentPhase.value = phaseId
  
  // Load phase state
  loadPhaseState(phaseId)
}

const addPhase = () => {
  // Save current phase state
  saveCurrentPhaseState()
  
  const newPhaseId = phases.value.length + 1
  phases.value.push({
    id: newPhaseId,
    name: `Phase ${newPhaseId}`,
    playerStates: [],
    ballState: { x: 0, y: 0, attachedTo: null },
    sequences: []
  })
  
  // Switch to new phase
  currentPhase.value = newPhaseId
  loadPhaseState(newPhaseId)
}

const saveCurrentPhaseState = () => {
  const currentPhaseData = phases.value.find(p => p.id === currentPhase.value)
  if (currentPhaseData) {
    currentPhaseData.playerStates = JSON.parse(JSON.stringify(players.value))
    currentPhaseData.ballState = JSON.parse(JSON.stringify(ball.value))
    currentPhaseData.currentSequenceId = currentSequence.value
    
    // Save sequence progress if in sequence lines mode
    if (isSequenceLinesActive.value) {
      currentPhaseData.sequenceProgress = {
        currentPlayerIndex: currentSequencePlayerIndex.value,
        completedPlayers: [...sequenceCompletedPlayers.value]
      }
    }
  }
}

const loadPhaseState = (phaseId: number) => {
  const phaseData = phases.value.find(p => p.id === phaseId)
  if (phaseData) {
    // Restore the saved sequence for this phase, or default to first sequence
    if (phaseData.currentSequenceId && phaseData.sequences.some(s => s.id === phaseData.currentSequenceId)) {
      currentSequence.value = phaseData.currentSequenceId
    } else {
      currentSequence.value = phaseData.sequences.length > 0 ? phaseData.sequences[0].id : 1
    }
    
    if (phaseData.playerStates.length > 0) {
      players.value = JSON.parse(JSON.stringify(phaseData.playerStates))
      ball.value = JSON.parse(JSON.stringify(phaseData.ballState))
    } else if (phaseId > 1) {
      // Inherit from previous phase - players start where they ended
      const previousPhase = phases.value.find(p => p.id === phaseId - 1)
      if (previousPhase && previousPhase.playerStates.length > 0) {
        players.value = JSON.parse(JSON.stringify(previousPhase.playerStates))
        ball.value = JSON.parse(JSON.stringify(previousPhase.ballState))
        
        // For new phase, players start at their ending positions from previous phase
        // Set their current position as the new original position for this phase
        players.value.forEach(player => {
          // If player had a path in previous phase, use the end position as starting position
          if (player.path && player.path.length > 0) {
            const endPoint = player.path[player.path.length - 1]
            player.x = endPoint.x
            player.y = endPoint.y
            player.originalPosition = { x: endPoint.x, y: endPoint.y }
          } else if (player.originalPosition) {
            // If no path, use the original position from previous phase
            player.originalPosition = { x: player.x, y: player.y }
          }
          
          // Clear paths for new phase
          player.path = []
          player.mode = 'drag'
          player.isSelected = false
        })
      }
    }
    
    // IMPORTANT: Restore sequence relationships after loading player states
    // This ensures that when runFullPlay switches phases, the sequence activePlayerIds are properly set
    if (phaseData.sequences && phaseData.sequences.length > 0) {
      phaseData.sequences.forEach(sequence => {
        // Ensure activePlayerIds are properly maintained from saved sequence data
        if (sequence.activePlayerIds && sequence.activePlayerIds.length > 0) {
          // The sequence already has activePlayerIds saved, so they should be preserved
          // Just ensure the players have the correct isLooping state when the sequence is selected
        }
      })
      
      // If we have a current sequence, restore the player loop states for that sequence
      const currentSequenceData = phaseData.sequences.find(s => s.id === currentSequence.value)
      if (currentSequenceData && currentSequenceData.activePlayerIds) {
        players.value.forEach(player => {
          player.isLooping = currentSequenceData.activePlayerIds.includes(player.id)
        })
      }
    }
    
    // Reset sequence lines mode state when switching phases
    if (isSequenceLinesActive.value) {
      resetSequence()
    }
  }
  drawPitch()
}

// Sequence Management functions
const selectSequence = (sequenceId: number) => {
  // Save current sequence data before switching
  throttledSaveCurrentSequence()
  
  // NEW: Clear all current paths before switching
  clearAllPlayerPaths()
  
  // Switch to new sequence
  currentSequence.value = sequenceId
  stopAllPlayerLoops()
  
  // NEW: Load positions from previous sequence or use inherited positions
  loadSequenceStartingPositions(sequenceId)
  
  // Load complete sequence data for the new sequence
  const newSequenceData = currentSequenceData.value
  if (newSequenceData) {
    if (newSequenceData.playerData && Object.keys(newSequenceData.playerData).length > 0) {
      loadPlayerDataFromSequence(newSequenceData)
    } else {
      // Initialize sequence with current player states
      players.value.forEach(player => {
        player.isLooping = newSequenceData.activePlayerIds.includes(player.id)
      })
    }
  }
  
  drawPitch()
}

const addSequence = () => {
  const phase = currentPhaseData.value
  if (!phase) return
  
  // Save current sequence before creating new one
  throttledSaveCurrentSequence()
  
  const newSequenceId = phase.sequences.length + 1
  const newSequence: Sequence = {
    id: newSequenceId,
    name: `Sequence ${newSequenceId}`,
    activePlayerIds: [],
    ballEvents: [],
    isActive: false,
    playerData: {},
    ballState: { x: ball.value.x, y: ball.value.y, attachedTo: null },
    // NEW: Initialize position tracking
    finalPlayerPositions: {},
    startingPlayerPositions: {}
  }
  
  phase.sequences.push(newSequence)
  currentSequence.value = newSequenceId
  
  console.log('Adding new sequence - clearing all paths')
  
  // NEW: Clear all paths for sequence independence
  clearAllPlayerPaths()
  
  // Reset player states for new sequence and ensure paths stay cleared
  players.value.forEach(player => {
    player.isLooping = false
    player.path = [] // Double-ensure paths are cleared
    player.currentPathIndex = 0
    player.mode = 'drag' // Reset to drag mode
    player.originalPosition = { x: player.x, y: player.y }
  })
  
  console.log('Paths after clearing:', players.value.map(p => ({ id: p.id, pathLength: p.path?.length || 0 })))
  
  drawPitch()
}

const togglePlayerLoop = (player: Player) => {
  if (!canActivatePlayer.value(player)) {
    return // Can't activate player without path
  }
  
  // Toggle player's active state in current sequence
  player.isLooping = !player.isLooping
  
  // Update current sequence data efficiently
  throttledSaveCurrentSequence()
  
  drawPitch()
}

const startPlayerLoop = (player: Player) => {
  if (!player.path || player.path.length === 0 || !player.originalPosition || !player.speed) {
    return
  }
  
  player.isLooping = true
  player.loopStartTime = Date.now()
  
  const pathLength = calculatePathLength(player.path)
  const baseSpeed = 100 // pixels per second at 100% speed
  const actualSpeed = (baseSpeed * player.speed) / 100
  const duration = (pathLength / actualSpeed) * 1000 // Convert to milliseconds
  const delay = player.sequenceDelay || 0 // Get player's delay
  
  const loop = async () => {
    while (player.isLooping) {
      // Reset to original position
      if (player.originalPosition) {
        player.x = player.originalPosition.x
        player.y = player.originalPosition.y
        
        // If this player has the ball, move the ball with them
        if (ball.value.attachedTo && 
            ball.value.attachedTo.type === player.type && 
            ball.value.attachedTo.id === player.id) {
          const playerRadius = Math.min(canvasWidth.value, canvasHeight.value) * 0.02
          ball.value.x = player.x + playerRadius * 0.8
          ball.value.y = player.y + playerRadius * 0.4
          console.log(`Ball moving with player ${player.type}-${player.id} to (${ball.value.x.toFixed(1)}, ${ball.value.y.toFixed(1)})`)
        }
      }
      
      // Redraw to show player at starting position
      drawPitch()
      
      // Apply delay BEFORE moving (player stays at start position during delay)
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
      
      // Only animate if player is still looping after delay
      if (player.isLooping) {
        // Animate through path (with ball if attached)
        await animatePlayerPathWithBall(player, duration)
      }
      
      // Short pause before next loop
      if (player.isLooping) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }
  }
  
  // Start the loop
  loop()
}

const stopPlayerLoop = (player: Player) => {
  player.isLooping = false
  player.loopStartTime = undefined
  
  // Reset to original position
  if (player.originalPosition) {
    player.x = player.originalPosition.x
    player.y = player.originalPosition.y
  }
}

const stopAllPlayerLoops = () => {
  players.value.forEach(player => {
    if (player.isLooping) {
      stopPlayerLoop(player)
    }
  })
  activeLoopingPlayers.value.clear()
}



// Helper function to save current player state to a sequence
const savePlayerDataToSequence = (sequence: Sequence) => {
  sequence.playerData = {}
    players.value.forEach(player => {
    const playerId = `${player.type}-${player.id}`
    sequence.playerData[playerId] = {
      path: player.path ? [...player.path] : [],
      originalPosition: player.originalPosition ? { ...player.originalPosition } : { x: player.x, y: player.y },
      speed: player.speed || 100,
      sequenceDelay: player.sequenceDelay || 0,
      mode: player.mode || 'drag',
      position: { x: player.x, y: player.y }
    }
  })
  
  // Save ball state
  sequence.ballState = {
    x: ball.value.x,
    y: ball.value.y,
    attachedTo: ball.value.attachedTo ? { ...ball.value.attachedTo } : null
  }
  
  // Update active player IDs
  sequence.activePlayerIds = players.value
    .filter(player => player.isLooping)
    .map(player => player.id)
}

// Helper function to load player state from a sequence
const loadPlayerDataFromSequence = (sequence: Sequence) => {
  if (!sequence.playerData) {
    console.warn(`Sequence ${sequence.id} has no player data`)
    return
  }
  
  players.value.forEach(player => {
    const playerId = `${player.type}-${player.id}`
    const savedData = sequence.playerData[playerId]
    
    if (savedData) {
      // Restore complete player state
      player.path = savedData.path ? [...savedData.path] : []
      player.originalPosition = savedData.originalPosition ? { ...savedData.originalPosition } : { x: player.x, y: player.y }
      player.speed = savedData.speed || 100
      player.sequenceDelay = savedData.sequenceDelay || 0
      player.mode = savedData.mode || 'drag'
      player.x = savedData.position.x
      player.y = savedData.position.y
      player.isLooping = sequence.activePlayerIds.includes(player.id)
    } else {
      // Player doesn't exist in this sequence - reset to defaults
      player.path = []
      player.originalPosition = { x: player.x, y: player.y }
      player.speed = 100
      player.sequenceDelay = 0
      player.mode = 'drag'
      player.isLooping = false
    }
  })
  
  // NEW: Also load sequence-specific starting positions
  if (sequence.startingPlayerPositions) {
    inheritPositionsFromSequence(sequence)
  }
  
  // Restore ball state
  if (sequence.ballState) {
    ball.value.x = sequence.ballState.x
    ball.value.y = sequence.ballState.y
    ball.value.attachedTo = sequence.ballState.attachedTo ? { ...sequence.ballState.attachedTo } : null
  }
}

// Throttled sequence saving to prevent excessive calls
let saveSequenceTimeout: number | null = null
const throttledSaveCurrentSequence = () => {
  if (saveSequenceTimeout) {
    clearTimeout(saveSequenceTimeout)
  }
  saveSequenceTimeout = setTimeout(() => {
    const currentSeq = currentSequenceData.value
    if (currentSeq) {
      savePlayerDataToSequence(currentSeq)
    }
  }, 300) // Save after 300ms of inactivity
}

const runSequenceWithBallPassing = async (activePlayers: Player[]) => {
  if (activePlayers.length === 0) return
  
  // Start with first player having the ball
  const firstPlayer = activePlayers[0]
  ball.value.attachedTo = {
    type: firstPlayer.type,
    id: firstPlayer.id
  }
  
  // Position ball with first player
  const playerRadius = Math.min(canvasWidth.value, canvasHeight.value) * 0.02
  ball.value.x = firstPlayer.x + playerRadius * 0.8
  ball.value.y = firstPlayer.y + playerRadius * 0.4
  
  // Calculate timing for ball passes
  let currentPlayerIndex = 0
  let currentBallCarrier = firstPlayer
  
  // Start all players looping in sync, with first player carrying ball
  restartAllPlayersInSync(activePlayers, currentBallCarrier)
  
  // Set up ball passing sequence
  const passingInterval = setInterval(() => {
    const sequenceData = currentSequenceData.value
    if (!sequenceData?.isActive) {
      clearInterval(passingInterval)
      return
    }
    
    // Move to next player in sequence
    currentPlayerIndex = (currentPlayerIndex + 1) % activePlayers.length
    const nextPlayer = activePlayers[currentPlayerIndex]
    
    // Pass ball to next player
    passBallToPlayerInSequence(nextPlayer)
    currentBallCarrier = nextPlayer
    
    // Restart all players' loops in sync after pass animation
    setTimeout(() => {
      if (sequenceData?.isActive) {
        restartAllPlayersInSync(activePlayers, currentBallCarrier)
      }
    }, 300) // Wait for pass animation to complete
    
  }, 3000) // Pass every 3 seconds
  
  // Store interval reference for cleanup
  const sequenceData = currentSequenceData.value
  if (sequenceData) {
    sequenceData.passingInterval = passingInterval
  }
}

const startPlayerLoopWithBall = (player: Player) => {
  if (!player.path || player.path.length === 0 || !player.originalPosition || !player.speed) {
    return
  }
  
  player.isLooping = true
  player.loopStartTime = Date.now()
  
  const pathLength = calculatePathLength(player.path)
  const baseSpeed = 100 // pixels per second at 100% speed
  const actualSpeed = (baseSpeed * player.speed) / 100
  const duration = (pathLength / actualSpeed) * 1000 // Convert to milliseconds
  const delay = player.sequenceDelay || 0 // Get player's delay
  
  const loop = async () => {
    while (player.isLooping) {
      // Reset to original position
      if (player.originalPosition) {
        player.x = player.originalPosition.x
        player.y = player.originalPosition.y
        
        // Move ball with player if they have it
        if (ball.value.attachedTo && 
            ball.value.attachedTo.type === player.type && 
            ball.value.attachedTo.id === player.id) {
          const playerRadius = Math.min(canvasWidth.value, canvasHeight.value) * 0.02
          ball.value.x = player.x + playerRadius * 0.8
          ball.value.y = player.y + playerRadius * 0.4
        }
      }
      
      // Redraw to show player at starting position
      drawPitch()
      
      // Apply delay BEFORE moving (player stays at start position during delay)
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
      
      // Only animate if player is still looping after delay
      if (player.isLooping) {
        // Animate through path with ball
        await animatePlayerPathWithBall(player, duration)
      }
      
      // Short pause before next loop
      if (player.isLooping) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }
  }
  
  // Start the loop
  loop()
}

const passBallToPlayerInSequence = (targetPlayer: Player) => {
  const startX = ball.value.x
  const startY = ball.value.y
  const endX = targetPlayer.x
  const endY = targetPlayer.y
  
  // Record ball pass event if recording
  if (isRecordingBallEvents.value && sequenceStartTime.value > 0) {
    const currentPlayer = players.value.find(p => 
      ball.value.attachedTo && 
      p.type === ball.value.attachedTo.type && 
      p.id === ball.value.attachedTo.id
    )
    
    if (currentPlayer) {
      const ballEvent: BallPassEvent = {
        timestamp: Date.now() - sequenceStartTime.value,
        fromPlayerId: currentPlayer.id,
        toPlayerId: targetPlayer.id,
        ballPosition: { x: startX, y: startY }
      }
      
      recordedBallEvents.value.push(ballEvent)
      
      // Update current sequence data
      const sequenceData = currentSequenceData.value
      if (sequenceData) {
        sequenceData.ballEvents.push(ballEvent)
      }
    }
  }
  
  const startTime = Date.now()
  const duration = 300 // 300ms animation
  
  const animatePass = () => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    
    // Eased animation
    const easeProgress = 1 - Math.pow(1 - progress, 3)
    
    ball.value.x = startX + (endX - startX) * easeProgress
    ball.value.y = startY + (endY - startY) * easeProgress
    
    if (progress < 1) {
      requestAnimationFrame(animatePass)
    } else {
      // Attach ball to target player
      ball.value.attachedTo = {
        type: targetPlayer.type,
        id: targetPlayer.id
      }
      
      // Position ball slightly offset from player
      const playerRadius = Math.min(canvasWidth.value, canvasHeight.value) * 0.02
      ball.value.x = targetPlayer.x + playerRadius * 0.8
      ball.value.y = targetPlayer.y + playerRadius * 0.4
      
      // Record the pass if recording is active
      if (props.isRecording) {
        emitCurrentPlayerStates()
      }
    }
    
    drawPitch()
  }
  
  // Start animation
  requestAnimationFrame(animatePass)
}

// Function to restart all players in sync when ball is passed
const restartAllPlayersInSync = (activePlayers: Player[], ballCarrier: Player) => {
  // Stop all currently looping players
  activePlayers.forEach(player => {
    if (player.isLooping) {
      stopPlayerLoop(player)
    }
  })
  
  // Wait a brief moment for loops to stop, then restart all in sync
  setTimeout(() => {
    startSynchronizedLoop(activePlayers, ballCarrier)
  }, 50) // Small delay to ensure loops have stopped
}

// Function to start synchronized loop where all players wait for each other
const startSynchronizedLoop = async (activePlayers: Player[], ballCarrier?: Player) => {
  const playersWithPaths = activePlayers.filter(player => 
    player.path && player.path.length > 0 && player.originalPosition && player.speed
  )
  
  if (playersWithPaths.length === 0) return
  
  // Mark all players as looping
  playersWithPaths.forEach(player => {
    player.isLooping = true
    player.loopStartTime = Date.now()
  })
  
  // Calculate each player's timing info once
  const playerTimings = playersWithPaths.map(player => {
    const pathLength = calculatePathLength(player.path!)
    const baseSpeed = 100
    const actualSpeed = (baseSpeed * player.speed!) / 100
    const pathDuration = (pathLength / actualSpeed) * 1000
    const delay = player.sequenceDelay || 0
    return {
      player,
      pathDuration,
      delay
    }
  })
  
    // Main synchronization loop
  const runSynchronizedCycle = async () => {
    while (playersWithPaths.some(p => p.isLooping)) {
      // STEP 1: Reset ALL players to their starting positions simultaneously
      playersWithPaths.forEach(player => {
        if (player.isLooping && player.originalPosition) {
          player.x = player.originalPosition.x
          player.y = player.originalPosition.y
          
          // Move ball with ball carrier if applicable
          if (ballCarrier && player === ballCarrier && ball.value.attachedTo && 
              ball.value.attachedTo.type === player.type && 
              ball.value.attachedTo.id === player.id) {
            const playerRadius = Math.min(canvasWidth.value, canvasHeight.value) * 0.02
            ball.value.x = player.x + playerRadius * 0.8
            ball.value.y = player.y + playerRadius * 0.4
          }
        }
      })
      
      // Redraw to show all players at their starting positions
      drawPitch()
      
      // STEP 2: Start all players' journeys (delay + path animation)
      const playerPromises = playerTimings.map(async ({ player, pathDuration, delay }) => {
        if (!player.isLooping) return
        
        // Apply delay at the start position (player holds here visibly)
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay))
        }
        
        // After delay, animate this player's path
        if (player.isLooping) {
          const hasBall = ballCarrier && player === ballCarrier
          if (hasBall) {
            await animatePlayerPathWithBall(player, pathDuration)
          } else {
            await animatePlayerPath(player, pathDuration)
          }
        }
      })
      
      // STEP 3: Wait for ALL players to complete their full journey (delay + animation)
      await Promise.all(playerPromises)
      
      // Brief pause before next cycle
      if (playersWithPaths.some(p => p.isLooping)) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }
  }
    
  // Start the synchronized cycle
  runSynchronizedCycle()
}

// Function to start regular player loop without ball carrying
const startRegularPlayerLoop = (player: Player) => {
  if (!player.path || player.path.length === 0 || !player.originalPosition || !player.speed) {
    return
  }
  
  player.isLooping = true
  player.loopStartTime = Date.now()
  
  const pathLength = calculatePathLength(player.path)
  const baseSpeed = 100 // pixels per second at 100% speed
  const actualSpeed = (baseSpeed * player.speed) / 100
  const duration = (pathLength / actualSpeed) * 1000 // Convert to milliseconds
  const delay = player.sequenceDelay || 0 // Get player's delay
  
  const loop = async () => {
    while (player.isLooping) {
      // Reset to original position
      if (player.originalPosition) {
        player.x = player.originalPosition.x
        player.y = player.originalPosition.y
      }
      
      // Redraw to show player at starting position
      drawPitch()
      
      // Apply delay BEFORE moving (player stays at start position during delay)
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
      
      // Only animate if player is still looping after delay
      if (player.isLooping) {
        // Animate through path (without ball)
        await animatePlayerPath(player, duration)
      }
      
      // Short pause before next loop
      if (player.isLooping) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }
  }
  
  // Start the loop
  loop()
}

const runCurrentSequence = async () => {
  const sequenceData = currentSequenceData.value
  if (!sequenceData) {
    console.warn('No sequence data found for current sequence')
    return
  }
  if (sequenceData.activePlayerIds.length === 0) {
    console.warn(`Sequence ${sequenceData.id} has no active players. ActivePlayerIds:`, sequenceData.activePlayerIds)
    return
  }
  
  console.log(`Running sequence ${sequenceData.id} with ${sequenceData.activePlayerIds.length} active players:`, sequenceData.activePlayerIds)
  
  // NEW: Store starting positions for this sequence
  sequenceData.startingPlayerPositions = {}
  players.value.forEach(player => {
    const playerId = `${player.type}-${player.id}`
    sequenceData.startingPlayerPositions![playerId] = { x: player.x, y: player.y }
  })
  
  // Stop any existing animations
  stopAllPlayerLoops()
  
  // Get active players for this sequence
  const activePlayers = players.value.filter(player => 
    sequenceData.activePlayerIds.includes(player.id) &&
    player.path && player.path.length > 0 &&
    player.originalPosition && player.speed
  )
  
  if (activePlayers.length === 0) {
    console.warn(`No valid active players found for sequence ${sequenceData.id}. Players with paths:`, players.value.filter(p => p.path && p.path.length > 0).map(p => `${p.type}-${p.id}`))
    return
  }
  
  // Reset all players to their original positions
  activePlayers.forEach(player => {
    if (player.originalPosition) {
      player.x = player.originalPosition.x
      player.y = player.originalPosition.y
    }
  })
  
  // Handle ball state for sequence
  if (activePlayers.length > 0) {
    // Determine which player should have the ball at the start of this sequence
    let ballCarrier = activePlayers[0] // Default to first player
    
    // If ball is already attached to someone, keep it with them if they're in this sequence
    if (ball.value.attachedTo) {
      const currentBallCarrier = activePlayers.find(player => 
        player.type === ball.value.attachedTo?.type && 
        player.id === ball.value.attachedTo?.id
      )
      if (currentBallCarrier) {
        ballCarrier = currentBallCarrier
      }
    }
    
    // Clear all ball carriers first
    players.value.forEach(player => {
      player.isCarryingBall = false
    })
    
    // Set the ball carrier
    ballCarrier.isCarryingBall = true
    
    ball.value.attachedTo = {
      type: ballCarrier.type,
      id: ballCarrier.id
    }
    
    // Position ball with the ball carrier
    const playerRadius = Math.min(canvasWidth.value, canvasHeight.value) * 0.02
    ball.value.x = ballCarrier.x + playerRadius * 0.8
    ball.value.y = ballCarrier.y + playerRadius * 0.4
    
    console.log(`Sequence ${sequenceData.id}: Ball carrier is ${ballCarrier.type}-${ballCarrier.id}`)
  }
  
  drawPitch()
  
  // If recording is active, emit initial positions
  if (props.isRecording) {
    emitCurrentPlayerStates()
  }
  
  // Run all players' sequences simultaneously
  const playerAnimations = activePlayers.map(async (player) => {
    const delay = player.sequenceDelay || 0
    
    // Apply delay before starting animation
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }
    
    // Calculate animation duration
    const pathLength = calculatePathLength(player.path!)
    const baseSpeed = 100
    const actualSpeed = (baseSpeed * player.speed!) / 100
    const duration = (pathLength / actualSpeed) * 1000
    
    // Animate player along their path (with ball if they're carrying it)
    if (player.isCarryingBall) {
      return animatePlayerPathWithBall(player, duration)
    } else {
      return animatePlayerPath(player, duration)
    }
  })
  
  // Wait for all animations to complete
  await Promise.all(playerAnimations)
  
  // NEW: Store final positions after sequence completes
  sequenceData.finalPlayerPositions = {}
  players.value.forEach(player => {
    const playerId = `${player.type}-${player.id}`
    sequenceData.finalPlayerPositions![playerId] = { x: player.x, y: player.y }
  })

  console.log(`Sequence ${sequenceData.id} execution complete`)
}

const runAllSequences = async () => {
  const sequences = availableSequences.value
  if (sequences.length === 0) return
  
  for (let i = 0; i < sequences.length; i++) {
    const sequence = sequences[i]
    
    // NEW: Clear paths from previous sequence
    clearAllPlayerPaths()
    
    // NEW: Set starting positions (inherit from previous sequence)
    if (i > 0) {
      const previousSequence = sequences[i - 1]
      if (previousSequence.finalPlayerPositions) {
        inheritPositionsFromSequence(previousSequence)
      }
    }
    
    // Switch to sequence and run
    currentSequence.value = sequence.id
    await runCurrentSequence()
    
    // Brief pause between sequences
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  console.log('All sequences execution complete')
}

const resetCurrentSequence = () => {
  // Stop any running animations
  stopAllPlayerLoops()
  
  // Reset all players to original positions
  players.value.forEach(player => {
    if (player.originalPosition) {
      player.x = player.originalPosition.x
      player.y = player.originalPosition.y
    }
    player.isLooping = false
  })
  
  // Reset ball to center
    const fieldWidth = canvasWidth.value / 1.4
    const fieldHeight = canvasHeight.value
    ball.value = {
      x: fieldWidth * 0.5,
      y: fieldHeight * 0.5,
      attachedTo: null
    }
  
  drawPitch()
}

const runCurrentPhase = async () => {
  if (isPlayRunning.value || !hasAnyPaths.value) return
  
  isPlayRunning.value = true
  
  // Store original positions and reset players
  players.value.forEach(player => {
    if (player.originalPosition && player.path && player.path.length > 0) {
      player.x = player.originalPosition.x
      player.y = player.originalPosition.y
    }
  })
  
  // Determine which player should carry the ball during animation
  players.value.forEach(player => {
    player.isCarryingBall = false // Reset all players first
  })
  
  // Set the ball carrier based on ball.attachedTo
  if (ball.value.attachedTo) {
    const ballCarrier = players.value.find(player => 
      player.type === ball.value.attachedTo?.type && 
      player.id === ball.value.attachedTo?.id
    )
    if (ballCarrier) {
      ballCarrier.isCarryingBall = true
      console.log(`Setting ball carrier for phase: ${ballCarrier.type}-${ballCarrier.id}`)
    }
  }
  
  drawPitch()
  
  // If recording is active, emit initial positions
  if (props.isRecording) {
    emitCurrentPlayerStates()
  }
  
  // Calculate the maximum duration needed for all paths
  let maxDuration = 0
  players.value.forEach(player => {
    if (player.path && player.path.length > 0 && player.speed) {
      const pathLength = calculatePathLength(player.path)
      const baseSpeed = 100 // pixels per second at 100% speed
      const actualSpeed = (baseSpeed * player.speed) / 100
      const duration = (pathLength / actualSpeed) * 1000 // Convert to milliseconds
      maxDuration = Math.max(maxDuration, duration)
    }
  })
  
  // Animate all players simultaneously
  const animationPromises = players.value.map(player => {
    if (player.path && player.path.length > 0 && player.originalPosition && player.speed) {
      return animatePlayerPath(player, maxDuration)
    }
    return Promise.resolve()
  })
  
  await Promise.all(animationPromises)
  isPlayRunning.value = false
}

// NEW: Centralized sequence execution logic
const executeSequenceChain_temp = async (
  sequencesToRun: Sequence[],
  runningFlag: import('vue').Ref<boolean>
) => {
  if (runningFlag.value || isPlayRunning.value) return;

  const originalPhaseId = currentPhase.value;
  const originalSequenceId = currentSequence.value;

  runningFlag.value = true;
  console.log('Sequence chain execution started.');

  // Start recording if requested
  if (props.isRecording) {
    emitCurrentPlayerStates();
  }

  try {
    const sequencesByPhase: { [phaseId: number]: Sequence[] } = {};
    phases.value.forEach(phase => {
      const phaseSequences = sequencesToRun.filter(s => phase.sequences.some(ps => ps.id === s.id));
      if (phaseSequences.length > 0) {
        sequencesByPhase[phase.id] = phaseSequences;
      }
    });

    const phaseIdsToRun = Object.keys(sequencesByPhase).map(Number).sort((a, b) => a - b);

    for (const phaseId of phaseIdsToRun) {
      if (currentPhase.value !== phaseId) {
        currentPhase.value = phaseId;
        loadPhaseState(phaseId);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const phaseSequences = sequencesByPhase[phaseId];
      for (let i = 0; i < phaseSequences.length; i++) {
        const sequence = phaseSequences[i];

        clearAllPlayerPaths();

        if (i > 0) {
          inheritPositionsFromSequence(phaseSequences[i - 1]);
        } else if (phaseId > phaseIdsToRun[0]) {
          const prevPhaseId = phaseIdsToRun[phaseIdsToRun.indexOf(phaseId) - 1];
          const lastSeqOfPrevPhase = sequencesByPhase[prevPhaseId]?.slice(-1)[0];
          if (lastSeqOfPrevPhase) {
            inheritPositionsFromSequence(lastSeqOfPrevPhase);
          }
        }
        
        currentSequence.value = sequence.id;

        if (sequence.playerData && Object.keys(sequence.playerData).length > 0) {
          loadPlayerDataFromSequence(sequence);
        } else {
          players.value.forEach(player => {
            player.isLooping = sequence.activePlayerIds.includes(player.id);
          });
        }

        await runCurrentSequence();

        if (i < phaseSequences.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      players.value.forEach(player => {
        if (player.originalPosition) {
          player.originalPosition = { x: player.x, y: player.y };
        }
      });

      if (phaseId < phaseIdsToRun[phaseIdsToRun.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } finally {
    currentPhase.value = originalPhaseId;
    currentSequence.value = originalSequenceId;
    loadPhaseState(originalPhaseId);

    runningFlag.value = false;
    console.log('Sequence chain execution finished.');
  }
};

// NEW: Legacy function to run old plays without sequences
const runAllPhasesLegacy_temp = async () => {
  isRunningFullPlay.value = true;
  for (const phase of phases.value) {
    currentPhase.value = phase.id;
    loadPhaseState(phase.id);
    await new Promise(resolve => setTimeout(resolve, 500));

    if (players.value.some(p => p.path && p.path.length > 0)) {
      await runCurrentPhase();
    }

    players.value.forEach(player => {
      if (player.originalPosition) {
        player.originalPosition = { x: player.x, y: player.y };
      }
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  isRunningFullPlay.value = false;
};


// NEW: Run all sequences in the current phase only
const runCurrentPhaseSequences = async () => {
  if (isRunningCurrentPhase.value || isPlayRunning.value) return;

  const phase = currentPhaseData.value;
  if (!phase || !phase.sequences || phase.sequences.length === 0) {
    if (players.value.some(p => p.path && p.path.length > 0)) {
      console.log('No sequences, running legacy phase animation.');
      await runCurrentPhase();
    }
    return;
  }
  
  await executeSequenceChain_temp(phase.sequences, isRunningCurrentPhase);
}

// NEW: Run full play (renamed from runAllPhases for clarity)
const runFullPlay = async () => {
  if (isRunningFullPlay.value || isPlayRunning.value) return;
  console.log('Starting runFullPlay with phases:', phases.value.map(p => ({ id: p.id, sequences: p.sequences.length })));

  const allSequences = phases.value.flatMap(phase => phase.sequences);

  if (allSequences.length === 0) {
    console.log('No sequences found, attempting to run legacy phase animations.');
    await runAllPhasesLegacy_temp();
    return;
  }

  await executeSequenceChain_temp(allSequences, isRunningFullPlay);
  console.log('runFullPlay completed')
  isRunningFullPlay.value = false
}

const calculatePathLength = (path: PathPoint[]): number => {
  let length = 0
  for (let i = 1; i < path.length; i++) {
    const dx = path[i].x - path[i-1].x
    const dy = path[i].y - path[i-1].y
    length += Math.sqrt(dx * dx + dy * dy)
  }
  return length
}

// Animation function that moves ball with player
const animatePlayerPathWithBall = (player: Player, totalDuration: number): Promise<void> => {
  return new Promise((resolve) => {
    if (!player.path || player.path.length === 0 || !player.originalPosition || !player.speed) {
      resolve()
      return
    }
    
    // Mark player as animating for visual feedback
    player.isAnimating = true
    
    const startTime = Date.now()
    const pathLength = calculatePathLength(player.path)
    const baseSpeed = 100 // pixels per second at 100% speed
    const actualSpeed = (baseSpeed * player.speed) / 100
    const playerDuration = (pathLength / actualSpeed) * 1000 // Convert to milliseconds
    
    // Create interpolated path points with timing
    const interpolatedPath: PathPoint[] = []
    let accumulatedDistance = 0
    
    interpolatedPath.push({ x: player.originalPosition.x, y: player.originalPosition.y, timestamp: 0 })
    
    for (let i = 1; i < player.path.length; i++) {
      const prev = player.path[i-1]
      const curr = player.path[i]
      const dx = curr.x - prev.x
      const dy = curr.y - prev.y
      const segmentLength = Math.sqrt(dx * dx + dy * dy)
      
      accumulatedDistance += segmentLength
      const timestamp = (accumulatedDistance / pathLength) * playerDuration
      
      interpolatedPath.push({ x: curr.x, y: curr.y, timestamp })
    }
    
    let currentSegment = 0
    const playerRadius = Math.min(canvasWidth.value, canvasHeight.value) * 0.02
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      
      if (elapsed >= playerDuration || currentSegment >= interpolatedPath.length - 1) {
        // Animation complete - reset size and mark as not animating
        player.isAnimating = false
        
        const lastPoint = interpolatedPath[interpolatedPath.length - 1]
        player.x = lastPoint.x
        player.y = lastPoint.y
        
        // If this player is carrying the ball, move the ball to final position
        if (player.isCarryingBall) {
          const playerRadius = Math.min(canvasWidth.value, canvasHeight.value) * 0.02
          ball.value.x = player.x + playerRadius * 0.8
          ball.value.y = player.y + playerRadius * 0.4
        }
        
        drawPitch()
        resolve()
        return
      }
      
      // Find current segment
      while (currentSegment < interpolatedPath.length - 1 && 
             interpolatedPath[currentSegment + 1].timestamp !== undefined &&
             elapsed >= interpolatedPath[currentSegment + 1].timestamp!) {
        currentSegment++
      }
      
      // Interpolate between current and next point
      if (currentSegment < interpolatedPath.length - 1) {
        const current = interpolatedPath[currentSegment]
        const next = interpolatedPath[currentSegment + 1]
        
        if (current.timestamp !== undefined && next.timestamp !== undefined) {
          const segmentProgress = (elapsed - current.timestamp!) / (next.timestamp! - current.timestamp!)
          const clampedProgress = Math.max(0, Math.min(1, segmentProgress))
        
          player.x = current.x + (next.x - current.x) * clampedProgress
          player.y = current.y + (next.y - current.y) * clampedProgress
          
          // Move ball with player if attached
          if (ball.value.attachedTo && 
              ball.value.attachedTo.type === player.type && 
              ball.value.attachedTo.id === player.id) {
            ball.value.x = player.x + playerRadius * 0.8
            ball.value.y = player.y + playerRadius * 0.4
          }
        }
      }
      
      if (props.isRecording) {
        emitCurrentPlayerStates()
      }
      
      drawPitch()
      requestAnimationFrame(animate)
    }
    
    animate()
  })
}

const animatePlayerPath = (player: Player, totalDuration: number): Promise<void> => {
  return new Promise((resolve) => {
    if (!player.path || player.path.length === 0 || !player.originalPosition || !player.speed) {
      resolve()
      return
    }
    
    // Mark player as animating for visual feedback
    player.isAnimating = true
    
    const startTime = Date.now()
    const pathLength = calculatePathLength(player.path)
    const baseSpeed = 100 // pixels per second at 100% speed
    const actualSpeed = (baseSpeed * player.speed) / 100
    const playerDuration = (pathLength / actualSpeed) * 1000 // Convert to milliseconds
    
    // Create interpolated path points with timing
    const interpolatedPath: PathPoint[] = []
    let accumulatedDistance = 0
    
    interpolatedPath.push({ x: player.originalPosition.x, y: player.originalPosition.y, timestamp: 0 })
    
    for (let i = 1; i < player.path.length; i++) {
      const prev = player.path[i-1]
      const curr = player.path[i]
      const dx = curr.x - prev.x
      const dy = curr.y - prev.y
      const segmentLength = Math.sqrt(dx * dx + dy * dy)
      
      accumulatedDistance += segmentLength
      const timestamp = (accumulatedDistance / pathLength) * playerDuration
      
      interpolatedPath.push({ x: curr.x, y: curr.y, timestamp })
    }
    
    let currentSegment = 0
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      
      if (elapsed >= playerDuration || currentSegment >= interpolatedPath.length - 1) {
        // Animation complete - reset size and mark as not animating
        player.isAnimating = false
        
        const lastPoint = interpolatedPath[interpolatedPath.length - 1]
        player.x = lastPoint.x
        player.y = lastPoint.y
        drawPitch()
        resolve()
        return
      }
      
      // Find current segment
      while (currentSegment < interpolatedPath.length - 1 && 
             elapsed > interpolatedPath[currentSegment + 1].timestamp!) {
        currentSegment++
      }
      
      if (currentSegment < interpolatedPath.length - 1) {
        const current = interpolatedPath[currentSegment]
        const next = interpolatedPath[currentSegment + 1]
        const segmentProgress = (elapsed - current.timestamp!) / 
                               (next.timestamp! - current.timestamp!)
        
        // Linear interpolation between points
        player.x = current.x + (next.x - current.x) * segmentProgress
        player.y = current.y + (next.y - current.y) * segmentProgress
        
        // If this player is carrying the ball, move the ball with them
        if (player.isCarryingBall) {
          const playerRadius = Math.min(canvasWidth.value, canvasHeight.value) * 0.02
          ball.value.x = player.x + playerRadius * 0.8
          ball.value.y = player.y + playerRadius * 0.4
        }
      }
      
      drawPitch()
      
      // If recording is active, emit player states during animation
      if (props.isRecording) {
        emitCurrentPlayerStates()
      }
      
      requestAnimationFrame(animate)
    }
    
    animate()
  })
}

// Helper function to emit current player states for recording
const emitCurrentPlayerStates = () => {
  const timestamp = Date.now()
  const states: PlayerState[] = [
    // First state contains ball information
    {
      playerId: 'ball',
      position: {
        x: ball.value.x,
        y: ball.value.y
      },
      timestamp: timestamp,
      ballState: {
        position: {
          x: ball.value.x,
          y: ball.value.y
        },
        attachedTo: ball.value.attachedTo ? {
          type: ball.value.attachedTo.type,
          id: ball.value.attachedTo.id
        } : null
      }
    },
    // Followed by player states without ball state
    ...players.value.map(player => ({
      playerId: `${player.type}-${player.id}`,
      position: {
        x: player.x,
        y: player.y
      },
      timestamp: timestamp
    }))
  ]
  
  emit('update:playerStates', states)
}

// Helper function to get next available number for pass functionality
const getNextAvailableNumber = (): number => {
  const assignedNumbers = players.value.map(p => p.assignedNumber).filter(n => n !== undefined)
  
  // Try numbers 1-9 first, then 0
  for (let i = 1; i <= 9; i++) {
    if (!assignedNumbers.includes(i)) {
      return i
    }
  }
  
  // If all 1-9 are taken, use 0
  if (!assignedNumbers.includes(0)) {
    return 0
  }
  
  // If all numbers are taken, return undefined (no pass number assigned)
  return undefined as any
}

const validateCount = (type: 'attacking' | 'defensive', event: Event) => {
  const input = event.target as HTMLInputElement
  let value = parseInt(input.value)
  
  if (isNaN(value)) value = 1
  if (value < 1) value = 1
  if (value > 16) value = 16
  
  if (type === 'attacking') {
    selectedAttackingCount.value = value
  } else {
    selectedDefensiveCount.value = value
  }
}

const confirmPlayerCount = (type: 'attacking' | 'defensive') => {
  if (type === 'attacking') {
    for (let i = 0; i < selectedAttackingCount.value; i++) {
      addAttackingPlayer()
    }
    showAttackingCount.value = false
  } else {
    for (let i = 0; i < selectedDefensiveCount.value; i++) {
      addDefensivePlayer()
    }
    showDefensiveCount.value = false
  }
}

const addAttackingPlayer = () => {
  const attackingPlayers = players.value.filter(p => p.type === 'attacking')
  const row = Math.floor(attackingPlayers.length / 5)
  const col = attackingPlayers.length % 5
  
  // Calculate base positions for the attacking team (bottom half)
  const fieldWidth = canvasWidth.value / 1.4 // Remove the extra width for substitutes
  const baseX = fieldWidth * 0.5 // 50% of field width
  const baseY = canvasHeight.value * 0.75 // 75% of field height
  
  // Calculate spacing between players (reduced spacing)
  const horizontalSpacing = fieldWidth * 0.08 // 8% of field width
  const verticalSpacing = canvasHeight.value * 0.05 // 5% of field height
  
  // Calculate position for this player
  const x = baseX + (col - 2) * horizontalSpacing // Center the line of 5
  const y = baseY + row * verticalSpacing
  
  // Assign number for pass functionality (1-9, then 0)
  const assignedNumber = getNextAvailableNumber()
  
  players.value.push({
    x: x,
    y: y,
    type: 'attacking',
    id: attackingPlayers.length + 1, // Start from 1 for attacking team
    assignedNumber: assignedNumber,
    isSelected: false,
    speed: 100,
    mode: 'drag',
    sequenceDelay: 0
  })
  drawPitch()
}

const addDefensivePlayer = () => {
  const defensivePlayers = players.value.filter(p => p.type === 'defensive')
  const row = Math.floor(defensivePlayers.length / 5)
  const col = defensivePlayers.length % 5
  
  // Calculate base positions for the defensive team (top half)
  const fieldWidth = canvasWidth.value / 1.4 // Remove the extra width for substitutes
  const baseX = fieldWidth * 0.5 // 50% of field width
  const baseY = canvasHeight.value * 0.25 // 25% of field height
  
  // Calculate spacing between players (reduced spacing)
  const horizontalSpacing = fieldWidth * 0.08 // 8% of field width
  const verticalSpacing = canvasHeight.value * 0.05 // 5% of field height
  
  // Calculate position for this player
  const x = baseX + (col - 2) * horizontalSpacing // Center the line of 5
  const y = baseY - row * verticalSpacing // Move up for each row
  
  // Assign number for pass functionality (1-9, then 0)
  const assignedNumber = getNextAvailableNumber()
  
  players.value.push({
    x: x,
    y: y,
    type: 'defensive',
    id: defensivePlayers.length + 1, // Start from 1 for defensive team
    assignedNumber: assignedNumber,
    isSelected: false,
    speed: 100,
    mode: 'drag',
    sequenceDelay: 0
  })
  drawPitch()
}

const handleCanvasClick = (event: MouseEvent) => {
  if (!pitchCanvas.value) return
  
  const rect = pitchCanvas.value.getBoundingClientRect()
  const scaleX = canvasWidth.value / rect.width
  const scaleY = canvasHeight.value / rect.height
  
  const x = (event.clientX - rect.left) * scaleX
  const y = (event.clientY - rect.top) * scaleY
  
  // Check if we clicked on the ball
  const ballRadius = Math.min(canvasWidth.value, canvasHeight.value) * 0.015
  const dx = ball.value.x - x
  const dy = ball.value.y - y
  const ballDistance = Math.sqrt(dx * dx + dy * dy)
  
  if (ballDistance <= ballRadius) {
    if (!isDragging.value) {
      selectedBall.value = true
      selectedPlayer.value = null
      isDragging.value = true
      dragOffset.value = {
        x: x - ball.value.x,
        y: y - ball.value.y
      }
    }
    drawPitch()
    return
  }

  // Check if we clicked on an existing path point (for editing)
  if (isPhaseActive.value) {
    for (const player of players.value) {
      if (player.path && player.path.length > 0) {
        for (let i = 0; i < player.path.length; i++) {
          const point = player.path[i]
          const dx = point.x - x
          const dy = point.y - y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance <= 8) { // 8px radius for path point selection
            if (!isDragging.value) {
              selectedPlayer.value = null
              selectedBall.value = false
              isDragging.value = true
              isDrawingPath.value = false
              currentPath.value = []
              // Store which point we're dragging
              dragOffset.value = {
                x: x - point.x,
                y: y - point.y,
                playerIndex: players.value.indexOf(player),
                pointIndex: i
              }
            }
            drawPitch()
            return
          }
        }
      }
    }
  }
  
  // Check if we clicked on a player
  const clickedPlayer = players.value.find(player => {
    const dx = player.x - x
    const dy = player.y - y
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance <= 20 // Player radius for click detection
  })

  if (clickedPlayer) {
    // Handle triple-click detection for phase mode
    if (isPhaseActive.value) {
      if (lastClickedPlayer.value === clickedPlayer) {
        clickCount.value++
      } else {
        clickCount.value = 1
      }
      
      lastClickedPlayer.value = clickedPlayer
      
      if (clickTimer.value) {
        clearTimeout(clickTimer.value)
      }
      
      clickTimer.value = window.setTimeout(() => {
        if (clickCount.value === 3) {
          // Triple-click detected, show context menu
          handleTripleClick(clickedPlayer, event)
        } else if (clickCount.value === 1) {
          // Single click - check if we're in sequence mode with sequences available
          if (isSequenceMode.value && availableSequences.value.length > 0 && clickedPlayer.path && clickedPlayer.path.length > 0) {
            // In sequence mode with existing path - toggle player loop
            togglePlayerLoop(clickedPlayer)
            return
          }
          
          // Single click - handle path drawing or normal dragging
          if (clickedPlayer.mode === 'path') {
            // Start drawing a path
            if (!isDragging.value) {
              // Clear previous selection
              players.value.forEach(p => p.isSelected = false)
              
              selectedPlayer.value = clickedPlayer
              clickedPlayer.isSelected = true
              selectedBall.value = false
              isDragging.value = true
              isDrawingPath.value = true
              
              // Initialize path if it doesn't exist
              if (!clickedPlayer.path) {
                clickedPlayer.path = []
              }
              
              // Always set original position at the start of drawing a new path
              clickedPlayer.originalPosition = { x: clickedPlayer.x, y: clickedPlayer.y }
              
              // Start current path from player position
              currentPath.value = [{ x: clickedPlayer.x, y: clickedPlayer.y }]
              
              dragOffset.value = {
                x: x - clickedPlayer.x,
                y: y - clickedPlayer.y
              }
            }
          } else {
            // Regular drag behavior
            if (!isDragging.value) {
              // Clear previous selection
              players.value.forEach(p => p.isSelected = false)
              
              selectedPlayer.value = clickedPlayer
              clickedPlayer.isSelected = true
              selectedBall.value = false
              isDragging.value = true
              isDrawingPath.value = false
              dragOffset.value = {
                x: x - clickedPlayer.x,
                y: y - clickedPlayer.y
              }
            }
          }
        }
        clickCount.value = 0
      }, 300) // 300ms window for detecting multiple clicks
      
      return
    }
    
    // Non-phase mode behavior (existing logic)
    if (!isDragging.value) {
      // Clear previous selection
      players.value.forEach(p => p.isSelected = false)
      
      selectedPlayer.value = clickedPlayer
      clickedPlayer.isSelected = true
      selectedBall.value = false
      isDragging.value = true
      isDrawingPath.value = false
      dragOffset.value = {
        x: x - clickedPlayer.x,
        y: y - clickedPlayer.y
      }
    }
  } else {
    // Clicked on empty space - deselect
    if (!isDragging.value) {
      selectedPlayer.value = null
      selectedBall.value = false
    }
  }
  
  drawPitch()
}

const handleCanvasMouseMove = (event: MouseEvent) => {
  if (!pitchCanvas.value || !isDragging.value) return
  
  const rect = pitchCanvas.value.getBoundingClientRect()
  const scaleX = canvasWidth.value / rect.width
  const scaleY = canvasHeight.value / rect.height
  
  const x = (event.clientX - rect.left) * scaleX
  const y = (event.clientY - rect.top) * scaleY
  
  // Calculate player radius based on canvas dimensions
  const playerRadius = Math.min(canvasWidth.value, canvasHeight.value) * 0.02
  
  // Handle dragging existing path points
  if (dragOffset.value.playerIndex !== undefined && dragOffset.value.pointIndex !== undefined) {
    const player = players.value[dragOffset.value.playerIndex]
    if (player && player.path && player.path[dragOffset.value.pointIndex]) {
      player.path[dragOffset.value.pointIndex].x = x - dragOffset.value.x
      player.path[dragOffset.value.pointIndex].y = y - dragOffset.value.y
    }
    drawPitch()
    return
  }
  
  if (selectedBall.value) {
    ball.value.x = x - dragOffset.value.x
    ball.value.y = y - dragOffset.value.y
    
    // Check if ball is near any player
    const ballRadius = Math.min(canvasWidth.value, canvasHeight.value) * 0.015
    const attachmentThreshold = playerRadius * 1.2 // Ball attaches when within 120% of player radius
    
    let closestPlayer: Player | null = null
    let minDistance = Infinity
    
    players.value.forEach(player => {
      const dx = player.x - ball.value.x
      const dy = player.y - ball.value.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance < minDistance && distance < attachmentThreshold) {
        minDistance = distance
        closestPlayer = player
      }
    })
    
    if (closestPlayer) {
      ball.value.attachedTo = {
        type: (closestPlayer as Player).type,
        id: (closestPlayer as Player).id
      }
      // Position the ball slightly offset from the player's center
      const offsetX = playerRadius * 0.8 // Offset by 80% of player radius
      const offsetY = playerRadius * 0.4 // Offset by 40% of player radius
      ball.value.x = (closestPlayer as Player).x + offsetX
      ball.value.y = (closestPlayer as Player).y + offsetY
    } else {
      ball.value.attachedTo = null
    }
  } else if (selectedPlayer.value) {
    if (isDrawingPath.value && selectedPlayer.value.mode === 'path') {
      // Drawing a path - add points as we drag
      const newX = x - dragOffset.value.x
      const newY = y - dragOffset.value.y
      
      // Add point to current path if we've moved enough distance
      const lastPoint = currentPath.value[currentPath.value.length - 1]
      const dx = newX - lastPoint.x
      const dy = newY - lastPoint.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance > 15) { // Only add point if we've moved 15 pixels
        currentPath.value.push({ x: newX, y: newY })
      }
    } else {
      // Normal player dragging
      selectedPlayer.value.x = x - dragOffset.value.x
      selectedPlayer.value.y = y - dragOffset.value.y
      
      // If ball is attached to this player, move it with the player
      if (ball.value.attachedTo && 
          ball.value.attachedTo.type === selectedPlayer.value.type && 
          ball.value.attachedTo.id === selectedPlayer.value.id) {
        const offsetX = playerRadius * 0.8 // Offset by 80% of player radius
        const offsetY = playerRadius * 0.4 // Offset by 40% of player radius
        ball.value.x = selectedPlayer.value.x + offsetX
        ball.value.y = selectedPlayer.value.y + offsetY
      }
    }
  }
  
  const timestamp = Date.now()
  const states: PlayerState[] = [
    // First state contains ball information
    {
      playerId: 'ball',
      position: {
        x: ball.value.x,
        y: ball.value.y
      },
      timestamp: timestamp,
      ballState: {
        position: {
          x: ball.value.x,
          y: ball.value.y
        },
        attachedTo: ball.value.attachedTo ? {
          type: ball.value.attachedTo.type,
          id: ball.value.attachedTo.id
        } : null
      }
    },
    // Followed by player states without ball state
    ...players.value.map(player => ({
      playerId: `${player.type}-${player.id}`,
      position: {
        x: player.x,
        y: player.y
      },
      timestamp: timestamp
    }))
  ]
  
  // Only emit player states when recording is active
  if (props.isRecording) {
    emit('update:playerStates', states)
  }
  
  drawPitch()
}

const handleCanvasMouseUp = () => {
  // If we were drawing a path, save it to the player
  if (isDrawingPath.value && selectedPlayer.value && currentPath.value.length > 1) {
    selectedPlayer.value.path = [...currentPath.value]
    
    // Save to current sequence efficiently
    throttledSaveCurrentSequence()
  }
  
  // Deselect player after drag operation
  if (selectedPlayer.value) {
    selectedPlayer.value.isSelected = false
    selectedPlayer.value = null
  }
  
  // Reset drawing state
  isDragging.value = false
  isDrawingPath.value = false
  currentPath.value = []
  
  // Reset drag offset for next interaction
  dragOffset.value = { x: 0, y: 0 }
  
  drawPitch()
}

const drawPitch = () => {
  if (!pitchCanvas.value) return
  const ctx = pitchCanvas.value.getContext('2d')
  if (!ctx) return

  // Clear canvas
  ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)

  // Calculate field dimensions and position
  const fieldWidth = canvasWidth.value / 1.4 // Original width without extra space
  const fieldHeight = canvasHeight.value

  // Calculate grid spacing to ensure perfect squares
  const squareSize = Math.min(fieldWidth / 70, fieldHeight / 100) // Size of one meter square (rotated dimensions)
  const gridSpacingX = squareSize
  const gridSpacingY = squareSize

  // Calculate actual field dimensions based on square size (rotated)
  const actualFieldWidth = squareSize * 70 // 70 meters wide
  const actualFieldHeight = squareSize * 100 // 100 meters long
  const fieldX = (canvasWidth.value - actualFieldWidth) / 2 // Center the field horizontally
  const fieldY = (canvasHeight.value - actualFieldHeight) / 2 // Center the field vertically

  // Draw premium background with sophisticated gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight.value)
  gradient.addColorStop(0, '#FFFFFF')
  gradient.addColorStop(0.3, '#FAFBFC')
  gradient.addColorStop(0.7, '#F8F9FA')
  gradient.addColorStop(1, '#F5F7FA')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value)

  // Draw premium texture overlay with refined pattern
  ctx.fillStyle = 'rgba(0, 0, 0, 0.01)'
  for (let i = 0; i < canvasWidth.value; i += 8) {
    for (let j = 0; j < canvasHeight.value; j += 8) {
      if ((i + j) % 16 === 0) {
        ctx.fillRect(i, j, 4, 4)
      }
    }
  }

  // Draw premium border with sophisticated shadow and gradient
  ctx.shadowColor = 'rgba(0, 0, 0, 0.15)'
  ctx.shadowBlur = 15
  ctx.shadowOffsetY = 3
  const borderGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight.value)
  borderGradient.addColorStop(0, 'rgba(0, 0, 0, 0.95)')
  borderGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.85)')
  borderGradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)')
  ctx.strokeStyle = borderGradient
  ctx.lineWidth = 3
  ctx.strokeRect(fieldX + 4, fieldY + 4, actualFieldWidth - 8, actualFieldHeight - 8)
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0

  // Draw premium pitch markings
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)'
  ctx.lineWidth = 2

  // Draw center line with premium dash
  ctx.beginPath()
  ctx.setLineDash([25, 15])
  ctx.moveTo(fieldX, fieldY + actualFieldHeight / 2)
  ctx.lineTo(fieldX + actualFieldWidth, fieldY + actualFieldHeight / 2)
  ctx.stroke()
  ctx.setLineDash([])

  // Draw 22-meter lines with premium style
  const twentyTwoMeterLine = actualFieldHeight * 0.22
  ctx.beginPath()
  ctx.setLineDash([25, 15])
  ctx.moveTo(fieldX, fieldY + twentyTwoMeterLine)
  ctx.lineTo(fieldX + actualFieldWidth, fieldY + twentyTwoMeterLine)
  ctx.moveTo(fieldX, fieldY + actualFieldHeight - twentyTwoMeterLine)
  ctx.lineTo(fieldX + actualFieldWidth, fieldY + actualFieldHeight - twentyTwoMeterLine)
  ctx.stroke()
  ctx.setLineDash([])

  // Draw try lines with premium weight
  ctx.beginPath()
  ctx.lineWidth = 3
  ctx.moveTo(fieldX, fieldY)
  ctx.lineTo(fieldX, fieldY + actualFieldHeight)
  ctx.moveTo(fieldX + actualFieldWidth, fieldY)
  ctx.lineTo(fieldX + actualFieldWidth, fieldY + actualFieldHeight)
  ctx.stroke()

  // Draw premium goal posts
  const postWidth = 12
  const postHeight = 30
  const leftPostX = fieldX + actualFieldWidth * 0.1
  const rightPostX = fieldX + actualFieldWidth * 0.9

  // Add premium shadow to goal posts
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
  ctx.shadowBlur = 8
  ctx.shadowOffsetY = 3

  // Create premium gradient for goal posts
  const postGradient = ctx.createLinearGradient(0, 0, 0, postHeight)
  postGradient.addColorStop(0, 'rgba(0, 0, 0, 0.98)')
  postGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.9)')
  postGradient.addColorStop(1, 'rgba(0, 0, 0, 0.85)')

  // // Left goal posts
  // ctx.fillStyle = postGradient
  // ctx.fillRect(leftPostX - postWidth/2, fieldY - postHeight/2, postWidth, postHeight)
  // ctx.fillRect(leftPostX - postWidth/2, fieldY + actualFieldHeight - postHeight/2, postWidth, postHeight)

  // Right goal posts
  ctx.fillRect(rightPostX - postWidth/2, fieldY - postHeight/2, postWidth, postHeight)
  ctx.fillRect(rightPostX - postWidth/2, fieldY + actualFieldHeight - postHeight/2, postWidth, postHeight)

  // Reset shadow
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0

  // Add premium grid lines
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)'
  ctx.lineWidth = 1

  // Vertical grid lines (70 meters)
  for (let x = fieldX; x <= fieldX + actualFieldWidth; x += gridSpacingX) {
    ctx.beginPath()
    ctx.moveTo(x, fieldY)
    ctx.lineTo(x, fieldY + actualFieldHeight)
    ctx.stroke()
  }

  // Horizontal grid lines (100 meters)
  for (let y = fieldY; y <= fieldY + actualFieldHeight; y += gridSpacingY) {
    ctx.beginPath()
    ctx.moveTo(fieldX, y)
    ctx.lineTo(fieldX + actualFieldWidth, y)
    ctx.stroke()
  }

  // Draw premium players
  const basePlayerRadius = Math.min(actualFieldWidth, actualFieldHeight) * 0.02
  players.value.forEach(player => {
    // Draw player at its exact position
    const adjustedX = player.x
    const adjustedY = player.y
    
    // Increase player size slightly during animation
    const playerRadius = player.isAnimating ? basePlayerRadius * 1.15 : basePlayerRadius
    
    // Draw premium player shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)'
    ctx.shadowBlur = 12
    ctx.shadowOffsetY = 4
    ctx.beginPath()
    ctx.arc(adjustedX, adjustedY + 2, playerRadius, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
    ctx.fill()

    // Draw premium player circle with sophisticated gradient
    const playerGradient = ctx.createRadialGradient(
      adjustedX - playerRadius/2, adjustedY - playerRadius/2, 0,
      adjustedX, adjustedY, playerRadius
    )
    if (player.type === 'attacking') {
      playerGradient.addColorStop(0, '#FF8A8A')
      playerGradient.addColorStop(0.3, '#FF6B6B')
      playerGradient.addColorStop(0.7, '#FF5252')
      playerGradient.addColorStop(1, '#FF4444')
    } else {
      playerGradient.addColorStop(0, '#6D9BFF')
      playerGradient.addColorStop(0.3, '#5D8BFF')
      playerGradient.addColorStop(0.7, '#4D7CFF')
      playerGradient.addColorStop(1, '#4444FF')
    }
    
    ctx.shadowColor = 'transparent'
    ctx.beginPath()
    ctx.arc(adjustedX, adjustedY, playerRadius, 0, Math.PI * 2)
    ctx.fillStyle = playerGradient
    ctx.fill()

    // Draw premium player border with selection state
    if (player.isSelected || player === selectedPlayer.value) {
      ctx.strokeStyle = '#FFD700' // Gold color for selected players
      ctx.lineWidth = 4
      ctx.shadowColor = 'rgba(255, 215, 0, 0.5)'
      ctx.shadowBlur = 8
    } else {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.98)'
      ctx.lineWidth = 1.5
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
    }
    ctx.stroke()
    
    // Reset shadow for next drawings
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0

    // Draw premium player number with improved rendering
    ctx.textRendering = 'geometricPrecision'
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.fillStyle = 'rgba(255, 255, 255, 1)'
    const fontSize = Math.max(playerRadius * 0.8, 12) // Ensure minimum font size scales with player
    ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    // Add subtle text shadow for better readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)'
    ctx.shadowBlur = 2
    ctx.shadowOffsetY = 1
    
    // Display assigned number for pass functionality, fallback to ID
    const displayNumber = player.assignedNumber !== undefined ? player.assignedNumber.toString() : player.id.toString()
    ctx.fillText(displayNumber, adjustedX, adjustedY)
    
    // Reset shadow
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0
    
    // Draw sequence inclusion indicator for sequence mode
    if (player.isLooping && isSequenceMode.value) {
      ctx.beginPath()
      ctx.arc(adjustedX, adjustedY, playerRadius + 8, 0, Math.PI * 2)
      ctx.strokeStyle = player.type === 'attacking' ? 
        'rgba(255, 68, 68, 0.8)' : 'rgba(68, 68, 255, 0.8)'
      ctx.lineWidth = 3
      ctx.setLineDash([8, 4])
      ctx.stroke()
      ctx.setLineDash([])
      
      // Add "INCLUDED" text above player
      ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillStyle = player.type === 'attacking' ? 
        'rgba(255, 68, 68, 0.9)' : 'rgba(68, 68, 255, 0.9)'
      ctx.textAlign = 'center'
      ctx.fillText('INCLUDED', adjustedX, adjustedY - playerRadius - 15)
    }
  })

  // Draw the ball
  const ballRadius = basePlayerRadius * 0.75 // Slightly smaller than base player radius
  
  // Draw ball shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.25)'
  ctx.shadowBlur = 12
  ctx.shadowOffsetY = 4
  ctx.beginPath()
  ctx.arc(ball.value.x, ball.value.y + 2, ballRadius, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
  ctx.fill()

  // Draw ball with gradient
  const ballGradient = ctx.createRadialGradient(
    ball.value.x - ballRadius/2, ball.value.y - ballRadius/2, 0,
    ball.value.x, ball.value.y, ballRadius
  )
  ballGradient.addColorStop(0, '#FFEB3B')
  ballGradient.addColorStop(0.3, '#FFD600')
  ballGradient.addColorStop(0.7, '#FFC107')
  ballGradient.addColorStop(1, '#FFB300')
  
  ctx.shadowColor = 'transparent'
  ctx.beginPath()
  ctx.arc(ball.value.x, ball.value.y, ballRadius, 0, Math.PI * 2)
  ctx.fillStyle = ballGradient
  ctx.fill()

  // Draw ball border with selection state
  if (selectedBall.value) {
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 3
  } else {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.98)'
    ctx.lineWidth = 1.5
  }
  ctx.stroke()

  // Draw player paths
  if (isPhaseActive.value) {
    players.value.forEach(player => {
      if (player.path && player.path.length > 0 && (player.pathVisible !== false)) {
        // Draw path line
        ctx.beginPath()
        ctx.strokeStyle = player.type === 'attacking' ? 
          'rgba(255, 68, 68, 0.7)' : 'rgba(68, 68, 255, 0.7)'
        ctx.lineWidth = 3
        ctx.setLineDash([10, 5])
        
        // Start from player's original position or current position
        const startX = player.originalPosition ? player.originalPosition.x : player.x
        const startY = player.originalPosition ? player.originalPosition.y : player.y
        
        ctx.moveTo(startX, startY)
        
        // Draw path
        player.path.forEach(point => {
          ctx.lineTo(point.x, point.y)
        })
        
        ctx.stroke()
        ctx.setLineDash([]) // Reset dash pattern
        
        // Draw path points (larger for easier grabbing)
        player.path.forEach((point, index) => {
          ctx.beginPath()
          ctx.arc(point.x, point.y, 6, 0, Math.PI * 2)
          ctx.fillStyle = player.type === 'attacking' ? 
            'rgba(255, 68, 68, 0.8)' : 'rgba(68, 68, 255, 0.8)'
          ctx.fill()
          ctx.strokeStyle = 'white'
          ctx.lineWidth = 2
          ctx.stroke()
          
          // Add a smaller inner circle for better visibility
          ctx.beginPath()
          ctx.arc(point.x, point.y, 3, 0, Math.PI * 2)
          ctx.fillStyle = 'white'
          ctx.fill()
        })
        
        // Draw direction arrow at the end
        if (player.path.length > 1) {
          const lastPoint = player.path[player.path.length - 1]
          const secondLastPoint = player.path[player.path.length - 2]
          
          const dx = lastPoint.x - secondLastPoint.x
          const dy = lastPoint.y - secondLastPoint.y
          const angle = Math.atan2(dy, dx)
          
          // Draw arrow
          const arrowLength = 15
          const arrowAngle = Math.PI / 6
          
          ctx.beginPath()
          ctx.moveTo(lastPoint.x, lastPoint.y)
          ctx.lineTo(
            lastPoint.x - arrowLength * Math.cos(angle - arrowAngle),
            lastPoint.y - arrowLength * Math.sin(angle - arrowAngle)
          )
          ctx.moveTo(lastPoint.x, lastPoint.y)
          ctx.lineTo(
            lastPoint.x - arrowLength * Math.cos(angle + arrowAngle),
            lastPoint.y - arrowLength * Math.sin(angle + arrowAngle)
          )
          ctx.strokeStyle = player.type === 'attacking' ? 
            'rgba(255, 68, 68, 1)' : 'rgba(68, 68, 255, 1)'
          ctx.lineWidth = 2
          ctx.stroke()
        }
        
        // Show speed indicator
        if (player.speed && player.speed !== 100) {
          ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          ctx.fillStyle = player.type === 'attacking' ? 
            'rgba(255, 68, 68, 1)' : 'rgba(68, 68, 255, 1)'
          ctx.textAlign = 'center'
          const currentPlayerRadius = player.isAnimating ? basePlayerRadius * 1.15 : basePlayerRadius
          ctx.fillText(`${player.speed}%`, player.x, player.y - currentPlayerRadius - 10)
        }
      }
    })
    
    // Draw current path being drawn
    if (isDrawingPath.value && currentPath.value.length > 1) {
      const player = selectedPlayer.value
      if (player) {
        ctx.beginPath()
        ctx.strokeStyle = player.type === 'attacking' ? 
          'rgba(255, 68, 68, 0.9)' : 'rgba(68, 68, 255, 0.9)'
        ctx.lineWidth = 4
        ctx.setLineDash([5, 5])
        
        ctx.moveTo(currentPath.value[0].x, currentPath.value[0].y)
        
        currentPath.value.slice(1).forEach(point => {
          ctx.lineTo(point.x, point.y)
        })
        
        ctx.stroke()
        ctx.setLineDash([]) // Reset dash pattern
        
        // Draw current path points
        currentPath.value.forEach((point, index) => {
          if (index > 0) { // Skip the starting point
            ctx.beginPath()
            ctx.arc(point.x, point.y, 4, 0, Math.PI * 2)
            ctx.fillStyle = player.type === 'attacking' ? 
              'rgba(255, 68, 68, 1)' : 'rgba(68, 68, 255, 1)'
            ctx.fill()
            ctx.strokeStyle = 'white'
            ctx.lineWidth = 1
            ctx.stroke()
          }
        })
      }
    }
  }
}

// Keyboard event handling for pass functionality
const handleKeyDown = (event: KeyboardEvent) => {
  // Only handle number keys 0-9
  const key = event.key
  if (!/^[0-9]$/.test(key)) return
  
  const targetNumber = parseInt(key)
  
  // Find player with this assigned number
  const targetPlayer = players.value.find(player => player.assignedNumber === targetNumber)
  if (!targetPlayer) return
  
  // Move ball to target player with animation
  passBallToPlayer(targetPlayer)
  
  // Prevent default behavior
  event.preventDefault()
}

// Pass ball to specific player with animation
const passBallToPlayer = (targetPlayer: Player) => {
  const startX = ball.value.x
  const startY = ball.value.y
  const endX = targetPlayer.x
  const endY = targetPlayer.y
  
  // Update which player is carrying the ball
  players.value.forEach(player => {
    player.isCarryingBall = (player === targetPlayer)
  })
  
  const startTime = Date.now()
  const duration = 300 // 300ms animation
  
  const animatePass = () => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    
    // Eased animation
    const easeProgress = 1 - Math.pow(1 - progress, 3)
    
    ball.value.x = startX + (endX - startX) * easeProgress
    ball.value.y = startY + (endY - startY) * easeProgress
    
    if (progress < 1) {
      requestAnimationFrame(animatePass)
    } else {
      // Attach ball to target player
      ball.value.attachedTo = {
        type: targetPlayer.type,
        id: targetPlayer.id
      }
      
      // Position ball slightly offset from player
      const playerRadius = Math.min(canvasWidth.value, canvasHeight.value) * 0.02
      ball.value.x = targetPlayer.x + playerRadius * 0.8
      ball.value.y = targetPlayer.y + playerRadius * 0.4
      
      // Record the pass if recording is active
      if (props.isRecording) {
        emitCurrentPlayerStates()
      }
    }
    
    drawPitch()
  }
  
  // Start animation
  requestAnimationFrame(animatePass)
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  window.addEventListener('keydown', handleKeyDown)
  
  if (pitchCanvas.value) {
    pitchCanvas.value.addEventListener('mousemove', handleCanvasMouseMove)
    pitchCanvas.value.addEventListener('mouseup', handleCanvasMouseUp)
    pitchCanvas.value.addEventListener('mouseleave', handleCanvasMouseUp)
  }
  
  // Initialize canvas with correct dimensions FIRST
  updateCanvasSize()
  
  // Initialize ball position in center of pitch (now with correct dimensions)
  const fieldWidth = canvasWidth.value / 1.4
  const fieldHeight = canvasHeight.value
  ball.value = {
    x: fieldWidth * 0.5,
    y: fieldHeight * 0.5,
    attachedTo: null
  }
  
  // Draw the pitch with proper dimensions
  drawPitch()

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
  
  if (pitchCanvas.value) {
    pitchCanvas.value.removeEventListener('mousemove', handleCanvasMouseMove)
    pitchCanvas.value.removeEventListener('mouseup', handleCanvasMouseUp)
    pitchCanvas.value.removeEventListener('mouseleave', handleCanvasMouseUp)
  }
  stopPlayback()
  stopAllPlayerLoops()
})

watch(players, () => {
  requestAnimationFrame(drawPitch)
}, { deep: true })

// Continuous redraw for looping animations
let animationFrameId: number | null = null

const startContinuousRedraw = () => {
  const redraw = () => {
    // Only redraw if there are looping players
    const hasLoopingPlayers = players.value.some(player => player.isLooping)
    if (hasLoopingPlayers) {
      drawPitch()
    }
    
    animationFrameId = requestAnimationFrame(redraw)
  }
  
  if (!animationFrameId) {
    animationFrameId = requestAnimationFrame(redraw)
  }
}

const stopContinuousRedraw = () => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
}

// Watch for looping players to start/stop continuous redraw
watch(() => players.value.some(player => player.isLooping), (hasLoopingPlayers) => {
  if (hasLoopingPlayers) {
    startContinuousRedraw()
  } else {
    stopContinuousRedraw()
  }
}, { immediate: true })

const startPlayback = () => {
  if (props.playbackData.length === 0) return

  // Reset players array and ball
  players.value = []
  
  // Calculate field dimensions
  const fieldWidth = canvasWidth.value / 1.4
  const fieldHeight = canvasHeight.value
  
  // Initialize ball in center
  ball.value = {
    x: fieldWidth * 0.5,
    y: fieldHeight * 0.5,
    attachedTo: null
  }

  // Initialize players from the first state
  const playerTypes = new Set(props.playbackData.map(state => state.playerId.split('-')[0]))
  
  playerTypes.forEach(type => {
    const typeStates = props.playbackData.filter(state => state.playerId.startsWith(type))
    typeStates.forEach((state, index) => {
      players.value.push({
        x: state.position.x,
        y: state.position.y,
        type: type as 'attacking' | 'defensive',
        id: index + 1
      })
    })
  })

  currentPlaybackIndex.value = 0
  playbackInterval.value = window.setInterval(() => {
    if (currentPlaybackIndex.value >= props.playbackData.length) {
      stopPlayback()
      return
    }

    const currentState = props.playbackData[currentPlaybackIndex.value]
    const [type, id] = currentState.playerId.split('-')
    const player = players.value.find(p => p.type === type && p.id === parseInt(id))
    if (player) {
      player.x = currentState.position.x
      player.y = currentState.position.y
    }
    requestAnimationFrame(drawPitch)
    currentPlaybackIndex.value++
  }, 100) // Play back at the same rate as recording
}

const stopPlayback = () => {
  if (playbackInterval.value) {
    clearInterval(playbackInterval.value)
    playbackInterval.value = null
  }
  currentPlaybackIndex.value = 0
}

const toggleRecording = () => {
  // Emit the toggle event to the parent
  const willBeRecording = !props.isRecording;
  emit('update:is-recording', willBeRecording);
  
  // If we're starting recording, send the initial player states
  if (willBeRecording) {
    const timestamp = Date.now();
    const states: PlayerState[] = [
      // First state contains ball information
      {
        playerId: 'ball',
        position: {
          x: ball.value.x,
          y: ball.value.y
        },
        timestamp: timestamp,
        ballState: {
          position: {
            x: ball.value.x,
            y: ball.value.y
          },
          attachedTo: ball.value.attachedTo ? {
            type: ball.value.attachedTo.type,
            id: ball.value.attachedTo.id
          } : null
        }
      },
      // Followed by player states without ball state
      ...players.value.map(player => ({
        playerId: `${player.type}-${player.id}`,
        position: {
          x: player.x,
          y: player.y
        },
        timestamp: timestamp
      }))
    ];
    emit('update:playerStates', states);
  }
}

const togglePathVisibility = () => {
  if (contextMenuPlayer.value) {
    contextMenuPlayer.value.pathVisible = contextMenuPlayer.value.pathVisible !== false ? false : true
    drawPitch()
  }
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

.sequence-controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin: 0.5rem 0;
  flex-wrap: wrap;
}

.sequence-btn {
  padding: 0.4rem 0.8rem;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  background: white;
  color: #666;
  font-weight: 500;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sequence-btn:hover {
  border-color: #FF9800;
  color: #FF9800;
}

.sequence-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sequence-btn.start-sequence {
  border-color: #4CAF50;
  color: #4CAF50;
}

.sequence-btn.start-sequence:hover {
  background: #4CAF50;
  color: white;
}

.sequence-btn.next-player {
  border-color: #2196F3;
  color: #2196F3;
}

.sequence-btn.next-player:hover:not(:disabled) {
  background: #2196F3;
  color: white;
}

.sequence-btn.run-sequence:hover:not(:disabled) {
  background: #FF5722;
  color: white;
}

.sequence-btn.reset-sequence {
  border-color: #9E9E9E;
  color: #9E9E9E;
}

.sequence-btn.reset-sequence:hover {
  background: #9E9E9E;
  color: white;
}

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

.fullscreen .canvas-controls {
  position: fixed;
  top: 24px;
  left: 24px;
  margin-bottom: 0;
  z-index: 10000;
}

.rugby-pitch-container.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  max-width: none;
  margin: 0;
  padding: 0;
  border-radius: 0;
  z-index: 9999;
  background: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: none;
}

.rugby-pitch-container.minimized {
  max-width: 500px;
}

.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.control-group {
  position: relative;
  display: flex;
  gap: 1rem;
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

.control-btn.path-mode {
  background: linear-gradient(135deg, #9C27B0, #673AB7);
  color: white;
}

.control-btn.path-mode.active {
  background: linear-gradient(135deg, #E91E63, #9C27B0);
  box-shadow: 0 6px 20px rgba(233, 30, 99, 0.3);
}

.control-btn.run-play {
  background: linear-gradient(135deg, #4CAF50, #2E7D32);
  color: white;
}

.control-btn.run-play.running {
  background: linear-gradient(135deg, #FF9800, #F57C00);
  animation: pulse 1.5s infinite;
}

.control-btn.run-play.recording {
  background: linear-gradient(135deg, #E91E63, #9C27B0);
  box-shadow: 0 6px 20px rgba(233, 30, 99, 0.3);
}

.control-btn.run-play:disabled {
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

.control-btn.run-all-phases {
  background: linear-gradient(135deg, #FF9800, #F57C00);
  color: white;
}

.control-btn.run-all-phases.running {
  background: linear-gradient(135deg, #E91E63, #9C27B0);
  animation: pulse 1.5s infinite;
}

.control-btn.run-all-phases:disabled {
  background: linear-gradient(135deg, #BDBDBD, #9E9E9E);
  color: #757575;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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

.control-btn.minimize {
  background-color: #f8f9fa;
  color: #2c3e50;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.control-btn.minimize.fullscreen-btn {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 10000;
  background-color: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(12px);
  padding: 0.75rem 1.25rem;
  font-size: 0.9rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.control-btn.minimize.fullscreen-btn:hover {
  background-color: white;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.16);
}

.canvas-container {
  position: relative;
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  background: white;
}

.fullscreen .canvas-container {
  border-radius: 0;
  height: auto;
  width: auto;
  max-width: 90vw;
  max-height: 90vh;
  box-shadow: none;
  margin: 5vh auto;
}

canvas {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 16px;
}

.fullscreen canvas {
  border-radius: 0;
  height: auto;
  width: auto;
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
}

@media (max-width: 768px) {
  .controls {
    flex-direction: column;
    align-items: stretch;
  }

  .control-group {
    flex-direction: column;
  }

  .control-btn {
    width: 100%;
    justify-content: center;
  }
}

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

/* Context Menu Styles */
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

.context-menu {
  position: fixed;
  background: rgba(0, 0, 0, 0.9);
  border-radius: 10px;
  padding: 1rem;
  z-index: 1000;
}

.context-menu-content {
  color: white;
  font-size: 1rem;
}

.context-menu-title {
  font-weight: 500;
  margin-bottom: 1rem;
}

.context-menu-btn {
  display: block;
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 0.5rem;
}

.context-menu-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.speed-control {
  margin-bottom: 1rem;
}

.speed-slider {
  width: 100%;
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

.context-menu-btn.danger {
  background: rgba(255, 0, 0, 0.1);
  color: white;
}

.context-menu-btn.danger:hover {
  background: rgba(255, 0, 0, 0.2);
}

.context-menu-btn.cancel {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.context-menu-btn.cancel:hover {
  background: rgba(255, 255, 255, 0.2);
}

.control-btn.sequence-mode {
  background: linear-gradient(135deg, #9C27B0, #673AB7);
  color: white;
}

.control-btn.sequence-mode.active {
  background: linear-gradient(135deg, #E91E63, #9C27B0);
  box-shadow: 0 6px 20px rgba(233, 30, 99, 0.3);
}

/* Sequence Management Styles */
.sequence-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
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

/* Player Loop Controls */
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
  animation: pulse 2s infinite;
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

.sequence-controls-new {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.control-btn.sequence-run {
  background: linear-gradient(135deg, #4CAF50, #2E7D32);
  color: white;
  padding: 0.6rem 1.2rem;
  font-size: 0.85rem;
}

.control-btn.sequence-run:disabled {
  background: linear-gradient(135deg, #BDBDBD, #9E9E9E);
  color: #757575;
  cursor: not-allowed;
}

.control-btn.sequence-run-all {
  background: linear-gradient(135deg, #FF9800, #F57C00);
  color: white;
  padding: 0.6rem 1.2rem;
  font-size: 0.85rem;
}

.control-btn.sequence-run-all:disabled {
  background: linear-gradient(135deg, #BDBDBD, #9E9E9E);
  color: #757575;
  cursor: not-allowed;
}

.control-btn.sequence-reset {
  background: linear-gradient(135deg, #9E9E9E, #757575);
  color: white;
  padding: 0.6rem 1.2rem;
  font-size: 0.85rem;
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

.player-control-btn.defensive.active {
  animation: pulseBlue 2s infinite;
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

.player-delay {
  display: block;
  font-size: 0.6rem;
  color: #666;
  margin-top: 0.2rem;
  font-weight: 400;
  text-transform: none;
  letter-spacing: normal;
}
</style> 