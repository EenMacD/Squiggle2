<template>
  <div class="canvas-container">
    <canvas
      ref="canvas"
      :width="canvasConfig.width"
      :height="canvasConfig.height"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseUp"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import type { 
  Player, 
  Ball, 
  CanvasConfig, 
  UIState, 
  PathPoint,
  CanvasInteractionEvents 
} from '../types/game'
import { COLORS, CANVAS_CONFIG } from '../types/game'

interface Props {
  players: Player[]
  ball: Ball
  canvasConfig: CanvasConfig
  uiState: UIState
  isSequenceMode: boolean
  isPlayRunning: boolean
  currentPath: PathPoint[]
  isDrawingPath: boolean
}

interface Emits {
  (e: 'player-click', player: Player, event: MouseEvent): void
  (e: 'player-triple-click', player: Player, event: MouseEvent): void
  (e: 'ball-click', ball: Ball, event: MouseEvent): void
  (e: 'canvas-click', position: { x: number, y: number }, event: MouseEvent): void
  (e: 'player-drag', player: Player, position: { x: number, y: number }): void
  (e: 'ball-drag', ball: Ball, position: { x: number, y: number }): void
  (e: 'path-draw', player: Player, path: PathPoint[]): void
}

const props = defineProps<Props>()

const emit = defineEmits<Emits>()

const canvas = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null

// Mouse interaction state
const mouseState = ref({
  isDown: false,
  lastPosition: { x: 0, y: 0 }
})

// Triple-click detection
const clickState = ref({
  count: 0,
  timer: null as number | null,
  lastPlayer: null as Player | null
})

onMounted(() => {
  if (canvas.value) {
    ctx = canvas.value.getContext('2d')
    drawPitch()
  }
})

onUnmounted(() => {
  if (clickState.value.timer) {
    clearTimeout(clickState.value.timer)
  }
})

// Watch for changes that require redrawing
watch([() => props.players, () => props.ball, () => props.currentPath], () => {
  nextTick(() => drawPitch())
}, { deep: true })

// Canvas drawing functions
const drawPitch = () => {
  if (!canvas.value || !ctx) return

  const { width, height } = props.canvasConfig
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height)

  // Calculate field dimensions
  const fieldWidth = width / 1.4
  const fieldHeight = height
  const fieldX = (width - fieldWidth) / 2
  const fieldY = (height - fieldHeight) / 2

  // Draw background
  drawBackground(ctx, width, height)
  
  // Draw field
  drawField(ctx, fieldX, fieldY, fieldWidth, fieldHeight)
  
  // Draw players
  drawPlayers(ctx)
  
  // Draw ball
  drawBall(ctx)
  
  // Draw paths if in sequence mode
  if (props.isSequenceMode) {
    drawPaths(ctx)
  }
}

const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  // Premium background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, '#FFFFFF')
  gradient.addColorStop(0.3, '#FAFBFC')
  gradient.addColorStop(0.7, '#F8F9FA')
  gradient.addColorStop(1, '#F5F7FA')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  // Subtle texture overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.01)'
  for (let i = 0; i < width; i += 8) {
    for (let j = 0; j < height; j += 8) {
      if ((i + j) % 16 === 0) {
        ctx.fillRect(i, j, 4, 4)
      }
    }
  }
}

const drawField = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => {
  // Calculate grid spacing
  const squareSize = Math.min(width / 70, height / 100)
  const actualFieldWidth = squareSize * 70
  const actualFieldHeight = squareSize * 100
  const fieldX = x + (width - actualFieldWidth) / 2
  const fieldY = y + (height - actualFieldHeight) / 2

  // Draw field border with shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.15)'
  ctx.shadowBlur = 15
  ctx.shadowOffsetY = 3
  
  const borderGradient = ctx.createLinearGradient(0, 0, 0, actualFieldHeight)
  borderGradient.addColorStop(0, 'rgba(0, 0, 0, 0.95)')
  borderGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.85)')
  borderGradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)')
  
  ctx.strokeStyle = borderGradient
  ctx.lineWidth = 3
  ctx.strokeRect(fieldX + 4, fieldY + 4, actualFieldWidth - 8, actualFieldHeight - 8)
  
  // Reset shadow
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0

  // Draw field markings
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)'
  ctx.lineWidth = 2

  // Center line
  ctx.beginPath()
  ctx.setLineDash([25, 15])
  ctx.moveTo(fieldX, fieldY + actualFieldHeight / 2)
  ctx.lineTo(fieldX + actualFieldWidth, fieldY + actualFieldHeight / 2)
  ctx.stroke()
  ctx.setLineDash([])

  // 22-meter lines
  const twentyTwoMeterLine = actualFieldHeight * 0.22
  ctx.beginPath()
  ctx.setLineDash([25, 15])
  ctx.moveTo(fieldX, fieldY + twentyTwoMeterLine)
  ctx.lineTo(fieldX + actualFieldWidth, fieldY + twentyTwoMeterLine)
  ctx.moveTo(fieldX, fieldY + actualFieldHeight - twentyTwoMeterLine)
  ctx.lineTo(fieldX + actualFieldWidth, fieldY + actualFieldHeight - twentyTwoMeterLine)
  ctx.stroke()
  ctx.setLineDash([])

  // Try lines
  ctx.beginPath()
  ctx.lineWidth = 3
  ctx.moveTo(fieldX, fieldY)
  ctx.lineTo(fieldX, fieldY + actualFieldHeight)
  ctx.moveTo(fieldX + actualFieldWidth, fieldY)
  ctx.lineTo(fieldX + actualFieldWidth, fieldY + actualFieldHeight)
  ctx.stroke()

  // Draw goal posts
  const postWidth = 12
  const postHeight = 30
  const rightPostX = fieldX + actualFieldWidth * 0.9

  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
  ctx.shadowBlur = 8
  ctx.shadowOffsetY = 3

  const postGradient = ctx.createLinearGradient(0, 0, 0, postHeight)
  postGradient.addColorStop(0, 'rgba(0, 0, 0, 0.98)')
  postGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.9)')
  postGradient.addColorStop(1, 'rgba(0, 0, 0, 0.85)')

  ctx.fillStyle = postGradient
  ctx.fillRect(rightPostX - postWidth/2, fieldY - postHeight/2, postWidth, postHeight)
  ctx.fillRect(rightPostX - postWidth/2, fieldY + actualFieldHeight - postHeight/2, postWidth, postHeight)

  // Reset shadow
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0

  // Draw grid
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)'
  ctx.lineWidth = 1

  // Vertical lines
  for (let gridX = fieldX; gridX <= fieldX + actualFieldWidth; gridX += squareSize) {
    ctx.beginPath()
    ctx.moveTo(gridX, fieldY)
    ctx.lineTo(gridX, fieldY + actualFieldHeight)
    ctx.stroke()
  }

  // Horizontal lines
  for (let gridY = fieldY; gridY <= fieldY + actualFieldHeight; gridY += squareSize) {
    ctx.beginPath()
    ctx.moveTo(fieldX, gridY)
    ctx.lineTo(fieldX + actualFieldWidth, gridY)
    ctx.stroke()
  }
}

const drawPlayers = (ctx: CanvasRenderingContext2D) => {
  const baseRadius = props.canvasConfig.playerRadius
  
  props.players.forEach(player => {
    const radius = player.isAnimating ? baseRadius * 1.15 : baseRadius
    
    // Draw shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)'
    ctx.shadowBlur = 12
    ctx.shadowOffsetY = 4
    ctx.beginPath()
    ctx.arc(player.x, player.y + 2, radius, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
    ctx.fill()

    // Draw player circle
    const colors = player.type === 'attacking' ? COLORS.ATTACKING : COLORS.DEFENSIVE
    const gradient = ctx.createRadialGradient(
      player.x - radius/2, player.y - radius/2, 0,
      player.x, player.y, radius
    )
    gradient.addColorStop(0, colors.LIGHT)
    gradient.addColorStop(0.3, colors.SECONDARY)
    gradient.addColorStop(0.7, colors.SECONDARY)
    gradient.addColorStop(1, colors.PRIMARY)
    
    ctx.shadowColor = 'transparent'
    ctx.beginPath()
    ctx.arc(player.x, player.y, radius, 0, Math.PI * 2)
    ctx.fillStyle = gradient
    ctx.fill()

    // Draw border
    if (player.isSelected || player === props.uiState.selectedPlayer) {
      ctx.strokeStyle = COLORS.UI.SELECTED
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
    
    // Reset shadow
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0

    // Draw player number
    ctx.fillStyle = 'rgba(255, 255, 255, 1)'
    const fontSize = Math.max(radius * 0.8, 12)
    ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)'
    ctx.shadowBlur = 2
    ctx.shadowOffsetY = 1
    
    const displayNumber = player.assignedNumber !== undefined ? 
      player.assignedNumber.toString() : player.id.toString()
    ctx.fillText(displayNumber, player.x, player.y)
    
    // Reset shadow
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0
    
    // Draw sequence inclusion indicator
    if (player.isLooping && props.isSequenceMode) {
      ctx.beginPath()
      ctx.arc(player.x, player.y, radius + 8, 0, Math.PI * 2)
      ctx.strokeStyle = player.type === 'attacking' ? 
        'rgba(255, 68, 68, 0.8)' : 'rgba(68, 68, 255, 0.8)'
      ctx.lineWidth = 3
      ctx.setLineDash([8, 4])
      ctx.stroke()
      ctx.setLineDash([])
      
      // Add "INCLUDED" text
      ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillStyle = player.type === 'attacking' ? 
        'rgba(255, 68, 68, 0.9)' : 'rgba(68, 68, 255, 0.9)'
      ctx.textAlign = 'center'
      ctx.fillText('INCLUDED', player.x, player.y - radius - 15)
    }
  })
}

const drawBall = (ctx: CanvasRenderingContext2D) => {
  const radius = props.canvasConfig.ballRadius
  
  // Draw shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.25)'
  ctx.shadowBlur = 12
  ctx.shadowOffsetY = 4
  ctx.beginPath()
  ctx.arc(props.ball.x, props.ball.y + 2, radius, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
  ctx.fill()

  // Draw ball gradient
  const gradient = ctx.createRadialGradient(
    props.ball.x - radius/2, props.ball.y - radius/2, 0,
    props.ball.x, props.ball.y, radius
  )
  gradient.addColorStop(0, COLORS.BALL.LIGHT)
  gradient.addColorStop(0.3, COLORS.BALL.SECONDARY)
  gradient.addColorStop(0.7, COLORS.BALL.SECONDARY)
  gradient.addColorStop(1, COLORS.BALL.PRIMARY)
  
  ctx.shadowColor = 'transparent'
  ctx.beginPath()
  ctx.arc(props.ball.x, props.ball.y, radius, 0, Math.PI * 2)
  ctx.fillStyle = gradient
  ctx.fill()

  // Draw border
  if (props.uiState.selectedBall) {
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 3
  } else {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.98)'
    ctx.lineWidth = 1.5
  }
  ctx.stroke()
}

const drawPaths = (ctx: CanvasRenderingContext2D) => {
  if (props.isPlayRunning) return

  // Draw player paths
  props.players.forEach(player => {
    if (player.path && player.path.length > 0 && player.pathVisible !== false) {
      const color = player.type === 'attacking' ? COLORS.ATTACKING.PRIMARY : COLORS.DEFENSIVE.PRIMARY
      
      // Draw path line
      ctx.beginPath()
      ctx.strokeStyle = color.replace(')', ', 0.7)')
      ctx.lineWidth = 3
      ctx.setLineDash([10, 5])
      
      // Start from original position
      const startX = player.originalPosition ? player.originalPosition.x : player.x
      const startY = player.originalPosition ? player.originalPosition.y : player.y
      
      ctx.moveTo(startX, startY)
      
      player.path.forEach(point => {
        ctx.lineTo(point.x, point.y)
      })
      
      ctx.stroke()
      ctx.setLineDash([])
      
      // Draw path points
      player.path.forEach(point => {
        ctx.beginPath()
        ctx.arc(point.x, point.y, 6, 0, Math.PI * 2)
        ctx.fillStyle = color.replace(')', ', 0.8)')
        ctx.fill()
        ctx.strokeStyle = 'white'
        ctx.lineWidth = 2
        ctx.stroke()
        
        // Inner circle
        ctx.beginPath()
        ctx.arc(point.x, point.y, 3, 0, Math.PI * 2)
        ctx.fillStyle = 'white'
        ctx.fill()
      })
      
      // Draw direction arrow
      if (player.path.length > 1) {
        const lastPoint = player.path[player.path.length - 1]
        const secondLastPoint = player.path[player.path.length - 2]
        
        const dx = lastPoint.x - secondLastPoint.x
        const dy = lastPoint.y - secondLastPoint.y
        const angle = Math.atan2(dy, dx)
        
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
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.stroke()
      }
      
      // Show speed indicator
      if (player.speed && player.speed !== 100) {
        ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        ctx.fillStyle = color
        ctx.textAlign = 'center'
        const playerRadius = player.isAnimating ? props.canvasConfig.playerRadius * 1.15 : props.canvasConfig.playerRadius
        ctx.fillText(`${player.speed}%`, player.x, player.y - playerRadius - 10)
      }
    }
  })
  
  // Draw current path being drawn
  if (props.isDrawingPath && props.currentPath.length > 1) {
    const player = props.uiState.selectedPlayer
    if (player) {
      const color = player.type === 'attacking' ? COLORS.ATTACKING.PRIMARY : COLORS.DEFENSIVE.PRIMARY
      
      ctx.beginPath()
      ctx.strokeStyle = color.replace(')', ', 0.9)')
      ctx.lineWidth = 4
      ctx.setLineDash([5, 5])
      
      ctx.moveTo(props.currentPath[0].x, props.currentPath[0].y)
      
      props.currentPath.slice(1).forEach(point => {
        ctx.lineTo(point.x, point.y)
      })
      
      ctx.stroke()
      ctx.setLineDash([])
      
      // Draw current path points
      props.currentPath.forEach((point, index) => {
        if (index > 0) {
          ctx.beginPath()
          ctx.arc(point.x, point.y, 4, 0, Math.PI * 2)
          ctx.fillStyle = color
          ctx.fill()
          ctx.strokeStyle = 'white'
          ctx.lineWidth = 1
          ctx.stroke()
        }
      })
    }
  }
}

// Mouse event handlers
const handleMouseDown = (event: MouseEvent) => {
  if (!canvas.value) return
  
  const position = getMousePosition(event)
  mouseState.value.isDown = true
  mouseState.value.lastPosition = position
  
  // Check for ball click
  if (isPointInBall(position)) {
    emit('ball-click', props.ball, event)
    return
  }
  
  // Check for existing path point drag
  if (props.isSequenceMode) {
    const pathPointHit = getPathPointAt(position)
    if (pathPointHit) {
      // Handle path point drag
      return
    }
  }
  
  // Check for player click
  const clickedPlayer = getPlayerAt(position)
  if (clickedPlayer) {
    handlePlayerClick(clickedPlayer, event)
    return
  }
  
  // Empty space click
  emit('canvas-click', position, event)
}

const handleMouseMove = (event: MouseEvent) => {
  if (!canvas.value || !mouseState.value.isDown) return
  
  const position = getMousePosition(event)
  
  if (props.uiState.selectedBall) {
    emit('ball-drag', props.ball, position)
  } else if (props.uiState.selectedPlayer) {
    emit('player-drag', props.uiState.selectedPlayer, position)
  }
  
  mouseState.value.lastPosition = position
}

const handleMouseUp = () => {
  mouseState.value.isDown = false
  
  if (props.isDrawingPath && props.uiState.selectedPlayer && props.currentPath.length > 1) {
    emit('path-draw', props.uiState.selectedPlayer, [...props.currentPath])
  }
}

const handlePlayerClick = (player: Player, event: MouseEvent) => {
  if (!props.isSequenceMode) {
    emit('player-click', player, event)
    return
  }
  
  // Handle triple-click detection for sequence mode
  if (clickState.value.lastPlayer === player) {
    clickState.value.count++
  } else {
    clickState.value.count = 1
  }
  
  clickState.value.lastPlayer = player
  
  if (clickState.value.timer) {
    clearTimeout(clickState.value.timer)
  }
  
  clickState.value.timer = window.setTimeout(() => {
    if (clickState.value.count === 3) {
      emit('player-triple-click', player, event)
    } else if (clickState.value.count === 1) {
      emit('player-click', player, event)
    }
    clickState.value.count = 0
  }, 300)
}

// Utility functions
const getMousePosition = (event: MouseEvent): { x: number, y: number } => {
  if (!canvas.value) return { x: 0, y: 0 }
  
  const rect = canvas.value.getBoundingClientRect()
  const scaleX = props.canvasConfig.width / rect.width
  const scaleY = props.canvasConfig.height / rect.height
  
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
  }
}

const isPointInBall = (point: { x: number, y: number }): boolean => {
  const dx = props.ball.x - point.x
  const dy = props.ball.y - point.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  return distance <= props.canvasConfig.ballRadius
}

const getPlayerAt = (point: { x: number, y: number }): Player | null => {
  return props.players.find(player => {
    const dx = player.x - point.x
    const dy = player.y - point.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance <= 20 // Click detection radius
  }) || null
}

const getPathPointAt = (point: { x: number, y: number }): { player: Player, pointIndex: number } | null => {
  for (const player of props.players) {
    if (player.path && player.path.length > 0) {
      for (let i = 0; i < player.path.length; i++) {
        const pathPoint = player.path[i]
        const dx = pathPoint.x - point.x
        const dy = pathPoint.y - point.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance <= 8) {
          return { player, pointIndex: i }
        }
      }
    }
  }
  return null
}

// Public method for external redraws
const redraw = () => {
  drawPitch()
}

defineExpose({
  redraw
})
</script>

<style scoped>
.canvas-container {
  position: relative;
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  background: white;
}

canvas {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 16px;
  cursor: crosshair;
}
</style> 