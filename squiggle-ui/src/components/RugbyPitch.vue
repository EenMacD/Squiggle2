<template>
  <div class="rugby-pitch-container" :class="{ 'minimized': isMinimized, 'fullscreen': isFullscreen }">
    <div class="controls" v-if="!isFullscreen">
      <div class="control-group">
        <button @click="showPlayerCount('attacking')" class="control-btn attacking">
          <span class="icon">+</span>
          Add Attack
        </button>

        <button @click="showPlayerCount('defensive')" class="control-btn defensive">
          <span class="icon">+</span>
          Add Defense
        </button>
      </div>
    </div>

    <!-- Dialog Backdrop -->
    <div v-if="showAttackingCount || showDefensiveCount" class="dialog-backdrop" @click="closeDialog"></div>

    <!-- Dialog -->
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

    <button @click="toggleFullscreen" class="control-btn minimize" :class="{ 'fullscreen-btn': isFullscreen }">
      <span class="icon">{{ isFullscreen ? '⤢' : '⤡' }}</span>
      {{ isFullscreen ? 'Exit Fullscreen' : 'Fullscreen' }}
    </button>
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
import { ref, onMounted, watch, onUnmounted } from 'vue'
import type { PlayerState } from '../types/play'

interface Player {
  x: number
  y: number
  type: 'attacking' | 'defensive'
  id: number
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
const dragOffset = ref({ x: 0, y: 0 })
let nextPlayerId = 1

const showAttackingCount = ref(false)
const showDefensiveCount = ref(false)
const selectedAttackingCount = ref(1)
const selectedDefensiveCount = ref(1)

const recordingInterval = ref<number | null>(null)
const playbackInterval = ref<number | null>(null)
const currentPlaybackIndex = ref(0)

const calculateFullscreenDimensions = () => {
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight
  const fieldRatio = 70/100 // Standard rugby field ratio (width/height)

  // Use 90% of the window height for the field
  const targetHeight = windowHeight * 0.9
  const targetWidth = targetHeight * fieldRatio

  // Add extra width for substitutes (20% on each side)
  const totalWidth = targetWidth * 1.4 // 40% extra width total

  // If the total width is too wide for the window, scale down
  if (totalWidth > windowWidth * 0.9) {
    const scaledWidth = windowWidth * 0.9
    return {
      width: scaledWidth,
      height: scaledWidth / fieldRatio / 1.4
    }
  }

  return {
    width: totalWidth,
    height: targetHeight
  }
}

const updateCanvasSize = () => {
  if (isFullscreen.value) {
    const dimensions = calculateFullscreenDimensions()
    canvasWidth.value = dimensions.width
    canvasHeight.value = dimensions.height
  } else {
    // Use the same ratio for minimized mode
    const baseWidth = 1000
    const fieldRatio = 70/100
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
  
  players.value.push({
    x: x,
    y: y,
    type: 'attacking',
    id: attackingPlayers.length + 1 // Start from 1 for attacking team
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
  
  players.value.push({
    x: x,
    y: y,
    type: 'defensive',
    id: defensivePlayers.length + 1 // Start from 1 for defensive team
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
  const ballRadius = Math.min(canvasWidth.value, canvasHeight.value) * 0.015 // Slightly smaller than player radius
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
  
  // Check if we clicked on a player
  const clickedPlayer = players.value.find(player => {
    const dx = player.x - x
    const dy = player.y - y
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance <= 20 // Player radius for click detection
  })

  if (clickedPlayer) {
    // Only select if we're not already dragging
    if (!isDragging.value) {
      selectedPlayer.value = clickedPlayer
      selectedBall.value = false
      isDragging.value = true
      dragOffset.value = {
        x: x - clickedPlayer.x,
        y: y - clickedPlayer.y
      }
    }
  } else {
    // Only deselect if we're not dragging
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
        type: closestPlayer.type,
        id: closestPlayer.id
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
  
  // Record the new position if recording
  if (props.isRecording) {
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
  
  drawPitch()
}

const handleCanvasMouseUp = () => {
  isDragging.value = false
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
  const playerRadius = Math.min(actualFieldWidth, actualFieldHeight) * 0.02
  players.value.forEach(player => {
    // Draw player at its exact position
    const adjustedX = player.x
    const adjustedY = player.y
    
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
    if (player === selectedPlayer.value) {
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 3
    } else {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.98)'
      ctx.lineWidth = 1.5
    }
    ctx.stroke()

    // Draw premium player number with improved rendering
    ctx.textRendering = 'geometricPrecision'
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.fillStyle = 'rgba(255, 255, 255, 1)'
    const fontSize = Math.max(playerRadius * 0.8, 12) // Ensure minimum font size
    ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    // Add subtle text shadow for better readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)'
    ctx.shadowBlur = 2
    ctx.shadowOffsetY = 1
    ctx.fillText(player.id.toString(), adjustedX, adjustedY)
    
    // Reset shadow
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0
  })

  // Draw the ball
  const ballRadius = playerRadius * 0.75 // Slightly smaller than player radius
  
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
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  if (pitchCanvas.value) {
    pitchCanvas.value.addEventListener('mousemove', handleCanvasMouseMove)
    pitchCanvas.value.addEventListener('mouseup', handleCanvasMouseUp)
    pitchCanvas.value.addEventListener('mouseleave', handleCanvasMouseUp)
  }
  
  // Initialize ball position in center of pitch
  const fieldWidth = canvasWidth.value / 1.4
  const fieldHeight = canvasHeight.value
  ball.value = {
    x: fieldWidth * 0.5,
    y: fieldHeight * 0.5,
    attachedTo: null
  }
  
  drawPitch()

  // Watch for recording state changes
  watch(() => props.isRecording, (newValue) => {
    if (newValue) {
      startRecording()
    }
  }, { immediate: true })

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
  if (pitchCanvas.value) {
    pitchCanvas.value.removeEventListener('mousemove', handleCanvasMouseMove)
    pitchCanvas.value.removeEventListener('mouseup', handleCanvasMouseUp)
    pitchCanvas.value.removeEventListener('mouseleave', handleCanvasMouseUp)
  }
  stopRecording()
  stopPlayback()
})

watch(players, () => {
  requestAnimationFrame(drawPitch)
}, { deep: true })

const startRecording = () => {
  // Initialize recording with current player positions
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

const stopRecording = () => {
  // No cleanup needed since we're not using intervals
}

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
</style> 