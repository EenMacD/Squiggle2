export interface PathPoint {
  x: number
  y: number
  timestamp?: number
}

export interface PlayerState {
  playerId: string
  position: { x: number, y: number }
  timestamp: number
  ballState?: {
    position: { x: number, y: number }
    attachedTo: { type: 'attacking' | 'defensive', id: number } | null
  }
}

export interface Ball {
  x: number
  y: number
  attachedTo: { type: 'attacking' | 'defensive', id: number } | null
}

export interface Player {
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
  playStartPosition?: { x: number; y: number }; // NEW: This is the immutable start position for the entire play
}

export interface BallPassEvent {
  timestamp: number // Relative to sequence start
  fromPlayerId: number
  toPlayerId: number
  ballPosition: { x: number, y: number }
}

export interface Sequence {
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

export interface Phase {
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

export interface CanvasConfig {
  width: number
  height: number
  fieldWidth: number
  fieldHeight: number
  playerRadius: number
  ballRadius: number
}

export interface GameState {
  players: Player[]
  ball: Ball
  phases: Phase[]
  currentPhase: number
  currentSequence: number
  isSequenceMode: boolean
  isRecording: boolean
  isFullscreen: boolean
  canvasConfig: CanvasConfig
}

export interface AnimationState {
  isPlayRunning: boolean
  isRunningCurrentPhase: boolean
  isRunningFullPlay: boolean
  activeLoopingPlayers: Map<number, number>
  playAnimations: Map<number, number>
}

export interface UIState {
  showAttackingCount: boolean
  showDefensiveCount: boolean
  showContextMenu: boolean
  contextMenuPlayer: Player | null
  contextMenuPosition: { x: number, y: number }
  selectedPlayer: Player | null
  selectedBall: boolean
  isDragging: boolean
  isDrawingPath: boolean
  currentPath: PathPoint[]
  dragOffset: { x: number, y: number, playerIndex?: number, pointIndex?: number }
}

export interface RecordingState {
  isRecordingBallEvents: boolean
  recordedBallEvents: BallPassEvent[]
  sequenceStartTime: number
  playbackInterval: number | null
  currentPlaybackIndex: number
}

// Events for component communication
export interface GameEvents {
  'update:playerStates': (states: PlayerState[]) => void
  'update:is-recording': (isRecording: boolean) => void
}

// Canvas interaction events
export interface CanvasInteractionEvents {
  'player-click': (player: Player, event: MouseEvent) => void
  'player-triple-click': (player: Player, event: MouseEvent) => void
  'ball-click': (ball: Ball, event: MouseEvent) => void
  'canvas-click': (position: { x: number, y: number }, event: MouseEvent) => void
  'player-drag': (player: Player, position: { x: number, y: number }) => void
  'ball-drag': (ball: Ball, position: { x: number, y: number }) => void
  'path-draw': (player: Player, path: PathPoint[]) => void
}

// Control panel events
export interface ControlPanelEvents {
  'toggle-recording': () => void
  'toggle-sequence-mode': () => void
  'toggle-fullscreen': () => void
  'add-players': (type: 'attacking' | 'defensive', count: number) => void
  'clear-paths': () => void
  'run-current-phase': () => void
  'run-full-play': () => void
}

// Phase management events
export interface PhaseEvents {
  'phase-select': (phaseId: number) => void
  'phase-add': () => void
  'phase-remove': (phaseId: number) => void
}

// Sequence management events
export interface SequenceEvents {
  'sequence-select': (sequenceId: number) => void
  'sequence-add': () => void
  'sequence-remove': (sequenceId: number) => void
  'sequence-run': (sequenceId: number) => void
  'sequence-reset': (sequenceId: number) => void
  'player-toggle-loop': (player: Player) => void
}

// Animation and timing utilities
export interface AnimationConfig {
  baseSpeed: number // pixels per second
  defaultDuration: number // milliseconds
  loopDelay: number // milliseconds between loops
}

export interface PlayerDialogState {
  type: 'attacking' | 'defensive'
  count: number
  visible: boolean
}

export interface ContextMenuState {
  visible: boolean
  position: { x: number, y: number }
  player: Player | null
}

// NEW: Formation system types
export interface Formation {
  id: string
  name: string
  positions: Array<{ x: number, y: number }> // Relative positions (0-1)
  playerCount: number
  type: 'attacking' | 'defensive'
  createdAt: Date
}

export interface FormationDialogState {
  selectedFormationType: 'default' | 'custom' | 'saved'
  customPositions?: Array<{ x: number, y: number }>
  selectedSavedFormation?: Formation | null
  showExistingPlayers: boolean
}

// Validation and utility types
export type PlayerType = 'attacking' | 'defensive'
export type PlayerMode = 'drag' | 'path'
export type AnimationStatus = 'idle' | 'running' | 'paused'

// Component props interfaces
export interface RugbyPitchProps {
  isRecording?: boolean
  playbackData?: PlayerState[]
}

export interface CanvasProps {
  gameState: GameState
  animationState: AnimationState
  uiState: UIState
  canvasConfig: CanvasConfig
}

export interface ControlPanelProps {
  gameState: GameState
  animationState: AnimationState
}

export interface PhaseManagerProps {
  phases: Phase[]
  currentPhase: number
  isSequenceMode: boolean
}

export interface SequenceManagerProps {
  sequences: Sequence[]
  currentSequence: number
  players: Player[]
}

export interface PlayerManagerProps {
  players: Player[]
  currentSequence: number
  isSequenceMode: boolean
}

// Type guards and utility functions
export const isPlayer = (obj: any): obj is Player => {
  return obj && typeof obj.x === 'number' && typeof obj.y === 'number' && 
         ['attacking', 'defensive'].includes(obj.type) && typeof obj.id === 'number'
}

export const isBall = (obj: any): obj is Ball => {
  return obj && typeof obj.x === 'number' && typeof obj.y === 'number' && 
         (obj.attachedTo === null || (obj.attachedTo && typeof obj.attachedTo.id === 'number'))
}

export const isPathPoint = (obj: any): obj is PathPoint => {
  return obj && typeof obj.x === 'number' && typeof obj.y === 'number'
}

// Constants
export const CANVAS_CONFIG = {
  BASE_WIDTH: 1000,
  FIELD_RATIO: 70/100, // Rugby field ratio (width/height)
  PLAYER_RADIUS_RATIO: 0.02, // Player radius as percentage of canvas size
  BALL_RADIUS_RATIO: 0.015, // Ball radius as percentage of canvas size
  GRID_SPACING: {
    METERS_WIDTH: 70,
    METERS_HEIGHT: 100
  }
} as const

// UNIFIED: Field calculation utility - ensures consistent field dimensions everywhere
export const calculateFieldDimensions = (canvasWidth: number, canvasHeight: number) => {
  // Remove extra width for substitutes to get actual field space
  const fieldWidth = canvasWidth / 1.4
  const fieldHeight = canvasHeight

  // Calculate grid spacing to ensure perfect meter squares
  const squareSize = Math.min(fieldWidth / 70, fieldHeight / 100)
  
  // Calculate actual field dimensions based on square size
  const actualFieldWidth = squareSize * 70  // 70 meters wide
  const actualFieldHeight = squareSize * 100 // 100 meters long
  
  // Center the field in the canvas
  const fieldX = (canvasWidth - actualFieldWidth) / 2
  const fieldY = (canvasHeight - actualFieldHeight) / 2
  
  return {
    fieldWidth,
    fieldHeight,
    actualFieldWidth,
    actualFieldHeight,
    fieldX,
    fieldY,
    squareSize,
    // Coordinate conversion utilities
    toRelativeX: (absoluteX: number) => (absoluteX - fieldX) / actualFieldWidth,
    toRelativeY: (absoluteY: number) => (absoluteY - fieldY) / actualFieldHeight,
    toAbsoluteX: (relativeX: number) => fieldX + (relativeX * actualFieldWidth),
    toAbsoluteY: (relativeY: number) => fieldY + (relativeY * actualFieldHeight),
  }
}

// UNIFIED: Preview field calculation - ensures preview matches main field exactly
export const calculatePreviewFieldDimensions = (previewWidth: number, previewHeight: number, padding: number = 20) => {
  const maxWidth = previewWidth - (padding * 2)
  const maxHeight = previewHeight - (padding * 2)
  
  // Use the same ratio and calculation method as main field
  const fieldRatio = CANVAS_CONFIG.FIELD_RATIO // 70/100
  
  let fieldWidth, fieldHeight
  if (maxWidth / maxHeight > fieldRatio) {
    // Height is limiting factor
    fieldHeight = maxHeight
    fieldWidth = fieldHeight * fieldRatio
  } else {
    // Width is limiting factor  
    fieldWidth = maxWidth
    fieldHeight = fieldWidth / fieldRatio
  }
  
  // Center the field in the preview canvas
  const fieldX = padding + (maxWidth - fieldWidth) / 2
  const fieldY = padding + (maxHeight - fieldHeight) / 2
  
  return {
    fieldWidth,
    fieldHeight,
    fieldX,
    fieldY,
    // Coordinate conversion utilities for preview
    toRelativeX: (absoluteX: number) => (absoluteX - fieldX) / fieldWidth,
    toRelativeY: (absoluteY: number) => (absoluteY - fieldY) / fieldHeight,
    toAbsoluteX: (relativeX: number) => fieldX + (relativeX * fieldWidth),
    toAbsoluteY: (relativeY: number) => fieldY + (relativeY * fieldHeight),
  }
}

export const ANIMATION_CONFIG = {
  BASE_SPEED: 100, // pixels per second at 100% speed
  DEFAULT_DURATION: 1000, // milliseconds
  LOOP_DELAY: 200, // milliseconds between loops
  PASS_DURATION: 300, // milliseconds for ball pass animation
  TRIPLE_CLICK_WINDOW: 300 // milliseconds for triple-click detection
} as const

export const COLORS = {
  ATTACKING: {
    PRIMARY: '#FF4444',
    SECONDARY: '#FF6B6B',
    LIGHT: '#FF8A8A'
  },
  DEFENSIVE: {
    PRIMARY: '#4444FF',
    SECONDARY: '#4D7CFF',
    LIGHT: '#6D9BFF'
  },
  BALL: {
    PRIMARY: '#FFB300',
    SECONDARY: '#FFC107',
    LIGHT: '#FFEB3B'
  },
  UI: {
    BACKGROUND: '#FFFFFF',
    BORDER: '#E0E0E0',
    SELECTED: '#FFD700',
    DANGER: '#F44336'
  }
} as const 