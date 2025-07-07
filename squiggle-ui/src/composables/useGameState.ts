import { ref, computed, reactive } from 'vue'
import type { 
  Player, 
  Ball, 
  Phase, 
  Sequence, 
  GameState, 
  CanvasConfig,
  PlayerState
} from '../types/game'
import { CANVAS_CONFIG } from '../types/game'

export function useGameState() {
  // Core game state
  const players = ref<Player[]>([])
  const ball = ref<Ball>({
    x: 0,
    y: 0,
    attachedTo: null
  })
  
  const phases = ref<Phase[]>([{
    id: 1,
    name: 'Phase 1',
    playerStates: [],
    ballState: { x: 0, y: 0, attachedTo: null },
    sequences: []
  }])
  
  const currentPhase = ref(1)
  const currentSequence = ref(1)
  const isSequenceMode = ref(false)
  const isRecording = ref(false)
  const isFullscreen = ref(false)
  
  // Canvas configuration
  const canvasConfig = reactive<CanvasConfig>({
    width: CANVAS_CONFIG.BASE_WIDTH * 1.4,
    height: CANVAS_CONFIG.BASE_WIDTH / CANVAS_CONFIG.FIELD_RATIO,
    fieldWidth: CANVAS_CONFIG.BASE_WIDTH,
    fieldHeight: CANVAS_CONFIG.BASE_WIDTH / CANVAS_CONFIG.FIELD_RATIO,
    playerRadius: 0,
    ballRadius: 0
  })
  
  // Computed properties
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
  
  const hasAnyPaths = computed(() => 
    players.value.some(player => player.path && player.path.length > 0)
  )
  
  const hasAnySequencesInCurrentPhase = computed(() => {
    const phase = currentPhaseData.value
    return phase?.sequences && phase.sequences.length > 0 && 
           phase.sequences.some(seq => seq.activePlayerIds.length > 0)
  })
  
  // Player management
  const addPlayer = (type: 'attacking' | 'defensive', position: { x: number, y: number }) => {
    const existingPlayersOfType = players.value.filter(p => p.type === type)
    const nextId = existingPlayersOfType.length > 0 ? 
      Math.max(...existingPlayersOfType.map(p => p.id)) + 1 : 1
    
    const assignedNumber = getNextAvailableNumber()
    
    const newPlayer: Player = {
      ...position,
      type,
      id: nextId,
      assignedNumber,
      isSelected: false,
      speed: 100,
      mode: 'drag',
      sequenceDelay: 0,
      pathVisible: true
    }
    
    players.value.push(newPlayer)
    updateCanvasRadii()
  }
  
  const removePlayer = (playerId: number, type: 'attacking' | 'defensive') => {
    const index = players.value.findIndex(p => p.id === playerId && p.type === type)
    if (index !== -1) {
      players.value.splice(index, 1)
    }
  }
  
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
    
    // If all numbers are taken, return undefined
    return undefined as any
  }
  
  // Ball management
  const updateBallPosition = (position: { x: number, y: number }) => {
    ball.value.x = position.x
    ball.value.y = position.y
  }
  
  // UNIFIED: Single function to handle all ball carrier state
  const setBallCarrier = (player: Player | null) => {
    // Clear all players' carrying state first
    players.value.forEach(p => {
      p.isCarryingBall = false
    })
    
    if (player) {
      // Set the new ball carrier
      player.isCarryingBall = true
      ball.value.attachedTo = {
        type: player.type,
        id: player.id
      }
      
      // Position ball near player
      const playerRadius = canvasConfig.playerRadius
      ball.value.x = player.x + playerRadius * 0.8
      ball.value.y = player.y + playerRadius * 0.4
    } else {
      // No ball carrier
      ball.value.attachedTo = null
    }
  }
  
  // Legacy functions for backward compatibility
  const attachBallToPlayer = (player: Player) => {
    setBallCarrier(player)
  }
  
  const detachBall = () => {
    setBallCarrier(null)
  }
  
  // Phase management
  const selectPhase = (phaseId: number) => {
    saveCurrentPhaseState()
    currentPhase.value = phaseId
    loadPhaseState(phaseId)
  }
  
  const addPhase = () => {
    saveCurrentPhaseState()
    
    const newPhaseId = phases.value.length > 0 ? 
      Math.max(...phases.value.map(p => p.id)) + 1 : 1
    
    phases.value.push({
      id: newPhaseId,
      name: `Phase ${newPhaseId}`,
      playerStates: [],
      ballState: { x: 0, y: 0, attachedTo: null },
      sequences: []
    })
    
    selectPhase(newPhaseId)
  }
  
  const removePhase = (phaseId: number) => {
    if (phases.value.length <= 1) return false
    
    const indexToRemove = phases.value.findIndex(p => p.id === phaseId)
    if (indexToRemove !== -1) {
      phases.value.splice(indexToRemove, 1)
      
      const newIndex = Math.max(0, indexToRemove - 1)
      if (phases.value.length > 0) {
        selectPhase(phases.value[newIndex].id)
      }
      return true
    }
    return false
  }
  
  const saveCurrentPhaseState = () => {
    const currentPhaseData = phases.value.find(p => p.id === currentPhase.value)
    if (currentPhaseData) {
      currentPhaseData.playerStates = JSON.parse(JSON.stringify(players.value))
      currentPhaseData.ballState = JSON.parse(JSON.stringify(ball.value))
      currentPhaseData.currentSequenceId = currentSequence.value
    }
  }
  
  const loadPhaseState = (phaseId: number) => {
    const phaseData = phases.value.find(p => p.id === phaseId)
    if (phaseData) {
      if (phaseData.currentSequenceId && phaseData.sequences.some(s => s.id === phaseData.currentSequenceId)) {
        currentSequence.value = phaseData.currentSequenceId
      } else {
        currentSequence.value = phaseData.sequences.length > 0 ? phaseData.sequences[0].id : 1
      }
      
      if (phaseData.playerStates.length > 0) {
        players.value = JSON.parse(JSON.stringify(phaseData.playerStates))
        ball.value = JSON.parse(JSON.stringify(phaseData.ballState))
      } else if (phaseId > 1) {
        // Inherit from previous phase
        const previousPhase = phases.value.find(p => p.id === phaseId - 1)
        if (previousPhase && previousPhase.playerStates.length > 0) {
          players.value = JSON.parse(JSON.stringify(previousPhase.playerStates))
          ball.value = JSON.parse(JSON.stringify(previousPhase.ballState))

          // Set the new originalPosition for each player to their current position
          // (which is the final position from the previous phase),
          // and clear the path they just ran to prepare for the new phase.
          players.value.forEach(player => {
            player.originalPosition = { x: player.x, y: player.y }
            player.path = []
            player.mode = 'drag'
            player.isSelected = false
          })
        }
      }
      
      // Restore sequence relationships
      if (phaseData.sequences && phaseData.sequences.length > 0) {
        const currentSequenceData = phaseData.sequences.find(s => s.id === currentSequence.value)
        if (currentSequenceData && currentSequenceData.activePlayerIds) {
          players.value.forEach(player => {
            player.isLooping = currentSequenceData.activePlayerIds.includes(player.id)
          })
        }
      }
    }
  }
  
  // Sequence management
  const selectSequence = (sequenceId: number) => {
    currentSequence.value = sequenceId
    
    const seq = currentSequenceData.value
    if (seq) {
      loadPlayerDataFromSequence(seq)
      players.value.forEach(p => {
        p.isLooping = seq.activePlayerIds.includes(p.id)
      })
    }
  }
  
  const addSequence = () => {
    const phase = currentPhaseData.value
    if (!phase) return
    
    const newSequenceId = phase.sequences.length > 0 ? 
      Math.max(...phase.sequences.map(s => s.id)) + 1 : 1
    
    const newSequence: Sequence = {
      id: newSequenceId,
      name: `Sequence ${newSequenceId}`,
      activePlayerIds: [],
      ballEvents: [],
      isActive: false,
      playerData: {},
      ballState: JSON.parse(JSON.stringify(ball.value)),
      finalPlayerPositions: {},
      startingPlayerPositions: {}
    }
    
    // Snapshot current positions
    players.value.forEach(player => {
      const playerId = `${player.type}-${player.id}`
      newSequence.startingPlayerPositions![playerId] = { x: player.x, y: player.y }
    })
    
    phase.sequences.push(newSequence)
    selectSequence(newSequenceId)
  }
  
  const removeSequence = (sequenceId: number) => {
    const phase = currentPhaseData.value
    if (!phase || phase.sequences.length === 0) return false
    
    const indexToRemove = phase.sequences.findIndex(s => s.id === sequenceId)
    if (indexToRemove !== -1) {
      phase.sequences.splice(indexToRemove, 1)
      
      if (phase.sequences.length > 0) {
        const newIndex = Math.max(0, indexToRemove - 1)
        selectSequence(phase.sequences[newIndex].id)
      } else {
        currentSequence.value = 1
      }
      return true
    }
    return false
  }
  
  const loadPlayerDataFromSequence = (sequence: Sequence) => {
    if (!sequence.playerData) return
    
    players.value.forEach(player => {
      const playerId = `${player.type}-${player.id}`
      const savedData = sequence.playerData[playerId]
      
      if (savedData) {
        player.path = savedData.path ? [...savedData.path] : []
        player.speed = savedData.speed || 100
        player.sequenceDelay = savedData.sequenceDelay || 0
        player.mode = savedData.mode || 'drag'
        player.isLooping = sequence.activePlayerIds.includes(player.id)
      } else {
        // Reset to defaults
        player.path = []
        player.originalPosition = { x: player.x, y: player.y }
        player.speed = 100
        player.sequenceDelay = 0
        player.mode = 'drag'
        player.isLooping = false
      }
    })
    
    // Restore ball state
    if (sequence.ballState) {
      ball.value.x = sequence.ballState.x
      ball.value.y = sequence.ballState.y
      ball.value.attachedTo = sequence.ballState.attachedTo ? 
        { ...sequence.ballState.attachedTo } : null
    }
  }
  
  // Canvas management
  const updateCanvasSize = (width: number, height: number) => {
    canvasConfig.width = width
    canvasConfig.height = height
    canvasConfig.fieldWidth = width / 1.4
    canvasConfig.fieldHeight = height
    updateCanvasRadii()
    
    // Update ball position to center
    ball.value.x = canvasConfig.fieldWidth * 0.5
    ball.value.y = canvasConfig.fieldHeight * 0.5
  }
  
  const updateCanvasRadii = () => {
    canvasConfig.playerRadius = Math.min(canvasConfig.width, canvasConfig.height) * 
      CANVAS_CONFIG.PLAYER_RADIUS_RATIO
    canvasConfig.ballRadius = Math.min(canvasConfig.width, canvasConfig.height) * 
      CANVAS_CONFIG.BALL_RADIUS_RATIO
  }
  
  const toggleFullscreen = () => {
    // Store current player positions relative to field dimensions
    const playerPositions = players.value.map(player => ({
      ...player,
      relativeX: player.x / canvasConfig.fieldWidth,
      relativeY: player.y / canvasConfig.fieldHeight
    }))
    
    isFullscreen.value = !isFullscreen.value
    
    // Canvas size will be updated externally
    // Then restore relative positions
    const newFieldWidth = canvasConfig.width / 1.4
    const newFieldHeight = canvasConfig.height
    
    players.value = playerPositions.map(player => ({
      ...player,
      x: player.relativeX * newFieldWidth,
      y: player.relativeY * newFieldHeight
    }))
  }
  
  // Utility functions
  const getPlayerStates = (): PlayerState[] => {
    const timestamp = Date.now()
    return [
      // Ball state
      {
        playerId: 'ball',
        position: { x: ball.value.x, y: ball.value.y },
        timestamp,
        ballState: {
          position: { x: ball.value.x, y: ball.value.y },
          attachedTo: ball.value.attachedTo ? { ...ball.value.attachedTo } : null
        }
      },
      // Player states
      ...players.value.map(player => ({
        playerId: `${player.type}-${player.id}`,
        position: { x: player.x, y: player.y },
        timestamp
      }))
    ]
  }
  
  // NEW: Save current game state to backend
  const saveGameState = async (name: string): Promise<boolean> => {
    try {
      // Ensure current phase is saved
      saveCurrentPhaseState()
      
      const gameState = {
        name,
        phases: phases.value,
        players: players.value,
        ball: ball.value,
        currentPhase: currentPhase.value,
        currentSequence: currentSequence.value,
        canvasConfig: { ...canvasConfig }
      }
      
      const response = await fetch('http://localhost:8080/api/plays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          playerStates: getPlayerStates(),
          gameData: gameState
        })
      })
      
      return response.ok
    } catch (error) {
      console.error('Failed to save game state:', error)
      return false
    }
  }

  // NEW: Load game state from backend
  const loadGameState = async (playId: string): Promise<boolean> => {
    try {
      const response = await fetch(`http://localhost:8080/api/plays/${playId}`)
      if (!response.ok) return false
      
      const play = await response.json()
      const gameData = play.gameData
      
      if (gameData) {
        // Restore all state
        phases.value = gameData.phases || []
        players.value = gameData.players || []
        ball.value = gameData.ball || { x: 0, y: 0, attachedTo: null }
        currentPhase.value = gameData.currentPhase || 1
        currentSequence.value = gameData.currentSequence || 1
        
        // Update canvas config if available
        if (gameData.canvasConfig) {
          Object.assign(canvasConfig, gameData.canvasConfig)
        }
        
        return true
      }
      
      return false
    } catch (error) {
      console.error('Failed to load game state:', error)
      return false
    }
  }
  
  const resetToDefaults = () => {
    players.value = []
    ball.value = {
      x: canvasConfig.fieldWidth * 0.5,
      y: canvasConfig.fieldHeight * 0.5,
      attachedTo: null
    }
    phases.value = [{
      id: 1,
      name: 'Phase 1',
      playerStates: [],
      ballState: { x: 0, y: 0, attachedTo: null },
      sequences: []
    }]
    currentPhase.value = 1
    currentSequence.value = 1
    isSequenceMode.value = false
    isRecording.value = false
  }
  
  const getFullPlayState = () => {
    const fullPlaySequences = []
    
    // Create a deep copy to avoid modifying the original state
    const allPhases = JSON.parse(JSON.stringify(phases.value))

    for (const phase of allPhases) {
      if (phase.sequences && phase.sequences.length > 0) {
        // Sort sequences by ID
        const sortedSequences = phase.sequences.sort((a: Sequence, b: Sequence) => a.id - b.id)
        
        for (const sequence of sortedSequences) {
          fullPlaySequences.push({
            sequence,
            playerStates: phase.playerStates,
            ballState: phase.ballState
          })
        }
      }
    }
    return fullPlaySequences
  }
  
  return {
    // State
    players,
    ball,
    phases,
    currentPhase,
    currentSequence,
    isSequenceMode,
    isRecording,
    isFullscreen,
    canvasConfig,
    
    // Computed
    currentPhaseData,
    currentSequenceData,
    availableSequences,
    playersWithPaths,
    hasAnyPaths,
    hasAnySequencesInCurrentPhase,
    
    // Methods
    addPlayer,
    removePlayer,
    updateBallPosition,
    setBallCarrier,
    attachBallToPlayer,
    detachBall,
    selectPhase,
    addPhase,
    removePhase,
    selectSequence,
    addSequence,
    removeSequence,
    updateCanvasSize,
    toggleFullscreen,
    getPlayerStates,
    resetToDefaults,
    getFullPlayState,
    saveGameState,
    loadGameState
  }
} 