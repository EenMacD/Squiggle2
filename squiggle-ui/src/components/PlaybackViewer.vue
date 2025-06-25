<template>
  <div class="playback-viewer" :class="{ 'minimized': isMinimized, 'fullscreen': isFullscreen }">
    <div class="playback-controls">
      <div class="control-group">
        <button @click="toggleFullscreen" class="control-btn minimize" :class="{ 'fullscreen-btn': isFullscreen }">
          <span class="icon">{{ isFullscreen ? '⤢' : '⤡' }}</span>
          {{ isFullscreen ? 'Exit Fullscreen' : 'Fullscreen' }}
        </button>
        <button @click="runSequence" class="control-btn run-sequence" :disabled="isRunning || props.playbackData.length === 0">
          <span class="icon">{{ isRunning ? '⏳' : '▶️' }}</span>
          {{ isRunning ? 'Running...' : 'Run Sequence' }}
        </button>
        <button @click="downloadPlayback" class="control-btn download">
          <span class="icon">⬇️</span>
          Download
        </button>
      </div>
    </div>
    <div class="canvas-container">
      <canvas
        ref="pitchCanvas"
        :width="canvasWidth"
        :height="canvasHeight"
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
  playbackData: PlayerState[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'sequenceComplete'): void
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
const playbackInterval = ref<number | null>(null)
const currentPlaybackIndex = ref(0)
const isRunning = ref(false)

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
  requestAnimationFrame(drawPitch)
}

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
  updateCanvasSize()
}

const handleResize = () => {
  if (isFullscreen.value) {
    updateCanvasSize()
  }
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
    // Draw player at its exact position (matching RugbyPitch.vue)
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

    // Draw premium player border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.98)'
    ctx.lineWidth = 1.5
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

  // Draw ball border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.98)'
  ctx.lineWidth = 1.5
  ctx.stroke()
}

const runSequence = () => {
  if (props.playbackData.length === 0 || isRunning.value) return

  isRunning.value = true
  
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

  // Get unique player IDs from all states, excluding the ball
  const uniquePlayerIds = new Set(
    props.playbackData
      .filter(state => state.playerId !== 'ball')
      .map(state => state.playerId)
  )
  
  // Initialize players from the first state
  uniquePlayerIds.forEach(playerId => {
    const [type, id] = playerId.split('-')
    const firstState = props.playbackData.find(state => state.playerId === playerId)
    if (firstState) {
      players.value.push({
        x: firstState.position.x,
        y: firstState.position.y,
        type: type as 'attacking' | 'defensive',
        id: parseInt(id)
      })
    }
  })

  currentPlaybackIndex.value = 0
  playbackInterval.value = window.setInterval(() => {
    if (currentPlaybackIndex.value >= props.playbackData.length) {
      stopSequence()
      emit('sequenceComplete')
      return
    }

    // Get all states for the current timestamp
    const currentTimestamp = props.playbackData[currentPlaybackIndex.value].timestamp
    const currentStates = props.playbackData.filter(state => state.timestamp === currentTimestamp)
    
    // First update ball state if present
    const ballState = currentStates.find(state => state.playerId === 'ball')
    if (ballState?.ballState) {
      ball.value.x = ballState.ballState.position.x
      ball.value.y = ballState.ballState.position.y
      ball.value.attachedTo = ballState.ballState.attachedTo
    }
    
    // Then update player states
    currentStates.forEach(state => {
      if (state.playerId !== 'ball') {
        const [type, id] = state.playerId.split('-')
        const player = players.value.find(p => p.type === type && p.id === parseInt(id))
        if (player) {
          player.x = state.position.x
          player.y = state.position.y
        }
      }
    })
    
    requestAnimationFrame(drawPitch)
    currentPlaybackIndex.value++
  }, 100) // Play back at the same rate as recording
}

const stopSequence = () => {
  if (playbackInterval.value) {
    clearInterval(playbackInterval.value)
    playbackInterval.value = null
  }
  isRunning.value = false
  currentPlaybackIndex.value = 0
}

const downloadPlayback = () => {
  const playbackData = {
    playerStates: props.playbackData,
    timestamp: new Date().toISOString()
  }
  
  const blob = new Blob([JSON.stringify(playbackData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `playback-${new Date().toISOString()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  
  // Initialize ball position in center of pitch
  const fieldWidth = canvasWidth.value / 1.4
  const fieldHeight = canvasHeight.value
  ball.value = {
    x: fieldWidth * 0.5,
    y: fieldHeight * 0.5,
    attachedTo: null
  }
  
  drawPitch()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  stopSequence()
})

watch(players, () => {
  requestAnimationFrame(drawPitch)
}, { deep: true })
</script>

<style scoped>
.playback-viewer {
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

.playback-viewer.fullscreen {
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

.playback-viewer.minimized {
  max-width: 500px;
}

.playback-controls {
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

.control-btn.run-sequence {
  background: linear-gradient(135deg, #2196F3, #1976D2);
  color: white;
}

.control-btn.run-sequence:disabled {
  background: linear-gradient(135deg, #B0BEC5, #90A4AE);
  color: rgba(255, 255, 255, 0.7);
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.control-btn.run-sequence:disabled:hover {
  transform: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.control-btn.download {
  background: linear-gradient(135deg, #4CAF50, #45a049);
  color: white;
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
  .playback-controls {
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
</style> 