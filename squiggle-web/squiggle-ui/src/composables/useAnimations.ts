import { ref, computed, reactive, type Ref } from 'vue'
import type { 
  Player, 
  Ball, 
  Sequence, 
  AnimationState, 
  PathPoint,
  CanvasConfig
} from '../types/game'
import type { PlayerState } from '../types/play'
import { ANIMATION_CONFIG } from '../types/game'

export function useAnimations(
  players: Ref<Player[]>,
  ball: Ref<Ball>,
  canvasConfig: Ref<CanvasConfig>,
  emit: (event: string, ...args: any[]) => void,
  setBallCarrier: (player: Player | null) => void
) {
  // Simplified animation state
  const animationState = ref({
    isRunning: false,
    type: 'none' as 'none' | 'sequence' | 'phase' | 'fullPlay',
    currentStep: 0,
    totalSteps: 0
  })
  
  // Legacy compatibility (can be removed later)
  const isPlayRunning = computed(() => animationState.value.isRunning)
  const isRunningCurrentPhase = computed(() => animationState.value.type === 'phase')
  const isRunningFullPlay = computed(() => animationState.value.type === 'fullPlay')
  
  const activeLoopingPlayers = ref<Map<number, number>>(new Map())
  const playAnimations = ref<Map<number, number>>(new Map())
  
  // Animation frame tracking
  let animationFrameId: number | null = null
  
  // Path calculation utilities
  const calculatePathLength = (path: PathPoint[]): number => {
    let length = 0
    for (let i = 1; i < path.length; i++) {
      const dx = path[i].x - path[i-1].x
      const dy = path[i].y - path[i-1].y
      length += Math.sqrt(dx * dx + dy * dy)
    }
    return length
  }
  
  const createInterpolatedPath = (path: PathPoint[], duration: number): PathPoint[] => {
    const interpolatedPath: PathPoint[] = []
    let accumulatedDistance = 0
    
    // Add starting point
    interpolatedPath.push({ ...path[0], timestamp: 0 })
    
    for (let i = 1; i < path.length; i++) {
      const prev = path[i-1]
      const curr = path[i]
      const dx = curr.x - prev.x
      const dy = curr.y - prev.y
      const segmentLength = Math.sqrt(dx * dx + dy * dy)
      
      accumulatedDistance += segmentLength
      const pathLength = calculatePathLength(path)
      const timestamp = (accumulatedDistance / pathLength) * duration
      
      interpolatedPath.push({ x: curr.x, y: curr.y, timestamp })
    }
    
    return interpolatedPath
  }
  
  // Individual player animation
  const animatePlayerPath = (player: Player, totalDuration: number): Promise<void> => {
    return new Promise((resolve) => {
      if (!player.path || player.path.length === 0 || !player.originalPosition || !player.speed) {
        resolve()
        return
      }
      
      player.isAnimating = true
      
      const startTime = Date.now()
      const pathLength = calculatePathLength(player.path)
      const actualSpeed = (ANIMATION_CONFIG.BASE_SPEED * player.speed!) / 100
      const playerDuration = (pathLength / actualSpeed) * 1000
      
      const interpolatedPath = createInterpolatedPath(player.path, playerDuration)
      let currentSegment = 0
      
      const animate = () => {
        const elapsed = Date.now() - startTime
        
        if (elapsed >= playerDuration || currentSegment >= interpolatedPath.length - 1) {
          // Animation complete
          player.isAnimating = false
          const lastPoint = interpolatedPath[interpolatedPath.length - 1]
          player.x = lastPoint.x
          player.y = lastPoint.y
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
          }
        }
        
        requestAnimationFrame(animate)
      }
      
      animate()
    })
  }
  
  // Recording-enabled version of animatePlayerPath
  const animatePlayerPathRecording = (player: Player, totalDuration: number, isRecording: boolean): Promise<void> => {
    return new Promise((resolve) => {
      if (!player.path || player.path.length === 0 || !player.originalPosition || !player.speed) {
        resolve()
        return
      }
      
      player.isAnimating = true
      
      const startTime = Date.now()
      const pathLength = calculatePathLength(player.path)
      const actualSpeed = (ANIMATION_CONFIG.BASE_SPEED * player.speed!) / 100
      const playerDuration = (pathLength / actualSpeed) * 1000
      
      const interpolatedPath = createInterpolatedPath(player.path, playerDuration)
      let currentSegment = 0
      let lastEmitTime = startTime
      
      const animate = () => {
        const elapsed = Date.now() - startTime
        
        if (elapsed >= playerDuration || currentSegment >= interpolatedPath.length - 1) {
          // Animation complete
          player.isAnimating = false
          const lastPoint = interpolatedPath[interpolatedPath.length - 1]
          player.x = lastPoint.x
          player.y = lastPoint.y
          
          // Emit final state if recording
          if (isRecording) {
            emitPlayerStates(true)
          }
          
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
          }
        }
        
        // Emit states during animation for recording (throttled to every 100ms)
        if (isRecording && Date.now() - lastEmitTime > 100) {
          emitPlayerStates(true)
          lastEmitTime = Date.now()
        }
        
        requestAnimationFrame(animate)
      }
      
      animate()
    })
  }
  
  // Enhanced player animation with ball carrying
  const animatePlayerPathWithBall = (player: Player, totalDuration: number): Promise<void> => {
    return new Promise((resolve) => {
      if (!player.path || player.path.length === 0 || !player.originalPosition || !player.speed) {
        resolve()
        return
      }
      
      player.isAnimating = true
      
      const startTime = Date.now()
      const pathLength = calculatePathLength(player.path)
      const actualSpeed = (ANIMATION_CONFIG.BASE_SPEED * player.speed!) / 100
      const playerDuration = (pathLength / actualSpeed) * 1000
      
      const interpolatedPath = createInterpolatedPath(player.path, playerDuration)
      let currentSegment = 0
      const playerRadius = canvasConfig.value.playerRadius
      
      const animate = () => {
        const elapsed = Date.now() - startTime
        
        if (elapsed >= playerDuration || currentSegment >= interpolatedPath.length - 1) {
          // Animation complete
          player.isAnimating = false
          const lastPoint = interpolatedPath[interpolatedPath.length - 1]
          player.x = lastPoint.x
          player.y = lastPoint.y
          
          // Ensure ball follows to final position if player is carrying it
          if (player.isCarryingBall) {
            ball.value.x = player.x + playerRadius * 0.8
            ball.value.y = player.y + playerRadius * 0.4
          }
          
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
            
            // FIXED: Always move ball with player if they're carrying it
            if (player.isCarryingBall) {
              ball.value.x = player.x + playerRadius * 0.8
              ball.value.y = player.y + playerRadius * 0.4
            }
          }
        }
        
        requestAnimationFrame(animate)
      }
      
      animate()
    })
  }
  
  // Recording-enabled version of animatePlayerPathWithBall
  const animatePlayerPathWithBallRecording = (player: Player, totalDuration: number, isRecording: boolean): Promise<void> => {
    return new Promise((resolve) => {
      if (!player.path || player.path.length === 0 || !player.originalPosition || !player.speed) {
        resolve()
        return
      }
      
      player.isAnimating = true
      
      const startTime = Date.now()
      const pathLength = calculatePathLength(player.path)
      const actualSpeed = (ANIMATION_CONFIG.BASE_SPEED * player.speed!) / 100
      const playerDuration = (pathLength / actualSpeed) * 1000
      
      const interpolatedPath = createInterpolatedPath(player.path, playerDuration)
      let currentSegment = 0
      let lastEmitTime = startTime
      const playerRadius = canvasConfig.value.playerRadius
      
      const animate = () => {
        const elapsed = Date.now() - startTime
        
        if (elapsed >= playerDuration || currentSegment >= interpolatedPath.length - 1) {
          // Animation complete
          player.isAnimating = false
          const lastPoint = interpolatedPath[interpolatedPath.length - 1]
          player.x = lastPoint.x
          player.y = lastPoint.y
          
          // Ensure ball follows to final position if player is carrying it
          if (player.isCarryingBall) {
            ball.value.x = player.x + playerRadius * 0.8
            ball.value.y = player.y + playerRadius * 0.4
          }
          
          // Emit final state if recording
          if (isRecording) {
            emitPlayerStates(true)
          }
          
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
            
            // Always move ball with player if they're carrying it
            if (player.isCarryingBall) {
              ball.value.x = player.x + playerRadius * 0.8
              ball.value.y = player.y + playerRadius * 0.4
            }
          }
        }
        
        // Emit states during animation for recording (throttled to every 100ms)
        if (isRecording && Date.now() - lastEmitTime > 100) {
          emitPlayerStates(true)
          lastEmitTime = Date.now()
        }
        
        requestAnimationFrame(animate)
      }
      
      animate()
    })
  }
  
  // Simple ball passing animation - direct line from one player to another
  const animateBallPass = (fromPos: { x: number, y: number }, toPlayer: Player): Promise<void> => {
    return new Promise((resolve) => {
      const startTime = Date.now()
      const duration = 600 // Slower animation - 600ms instead of 300ms
      
      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        
        // Simple easing - same as key press animation
        const easeProgress = 1 - Math.pow(1 - progress, 3)
        
        // Direct linear interpolation - no arc
        ball.value.x = fromPos.x + (toPlayer.x - fromPos.x) * easeProgress
        ball.value.y = fromPos.y + (toPlayer.y - fromPos.y) * easeProgress
        
        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          // Use unified ball-carrier system
          setBallCarrier(toPlayer)
          resolve()
        }
      }
      
      animate()
    })
  }
  
  const getHandPos = (player: Player) => ({
    x: player.x + canvasConfig.value.playerRadius * 0.8,
    y: player.y + canvasConfig.value.playerRadius * 0.4
  })
  
  // Simple ball transition for sequence starts (use same speed as key pass)
  const animateBallToPlayer = async (targetPlayer: Player): Promise<void> => {
    // If ball already attached to another player, animate real pass between them
    if (ball.value.attachedTo) {
      const fromPlayer = players.value.find(p => 
        p.type === ball.value.attachedTo!.type &&
        p.id === ball.value.attachedTo!.id
      )
      if (fromPlayer && fromPlayer !== targetPlayer) {
        await animateBallPass(getHandPos(fromPlayer), targetPlayer)
        return
      }
    }
    
    const currentPos = { x: ball.value.x, y: ball.value.y }
    const targetPos = getHandPos(targetPlayer)
    
    const distance = Math.hypot(targetPos.x - currentPos.x, targetPos.y - currentPos.y)
    if (distance < 5) { setBallCarrier(targetPlayer); return }
    
    return new Promise((resolve) => {
      const startTime = Date.now()
      const duration = 600 // same 600ms as animateBallPass
      
      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const easeProgress = 1 - Math.pow(1 - progress, 3)
        
        ball.value.x = currentPos.x + (targetPos.x - currentPos.x) * easeProgress
        ball.value.y = currentPos.y + (targetPos.y - currentPos.y) * easeProgress
        
        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          setBallCarrier(targetPlayer)
          resolve()
        }
      }
      animate()
    })
  }
  
  // Player looping animation
  const startPlayerLoop = (player: Player) => {
    if (!player.path || player.path.length === 0 || !player.originalPosition || !player.speed) {
      return
    }
    
    player.isLooping = true
    player.loopStartTime = Date.now()
    
    const pathLength = calculatePathLength(player.path)
    const actualSpeed = (ANIMATION_CONFIG.BASE_SPEED * player.speed) / 100
    const duration = (pathLength / actualSpeed) * 1000
    const delay = player.sequenceDelay || 0
    
    const loop = async () => {
      while (player.isLooping) {
        // Reset to original position
        if (player.originalPosition) {
          player.x = player.originalPosition.x
          player.y = player.originalPosition.y
          
          // Move ball if player is carrying it using unified system
          if (player.isCarryingBall) {
            setBallCarrier(player)
          }
        }
        
        // Apply delay
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay))
        }
        
        // Animate if still looping
        if (player.isLooping) {
          if (player.isCarryingBall) {
            await animatePlayerPathWithBall(player, duration)
          } else {
            await animatePlayerPath(player, duration)
          }
        }
        
        // Brief pause before next loop
        if (player.isLooping) {
          await new Promise(resolve => setTimeout(resolve, ANIMATION_CONFIG.LOOP_DELAY))
        }
      }
    }
    
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
  
  // Synchronized player animation
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
    
    const runSynchronizedCycle = async () => {
      while (playersWithPaths.some(p => p.isLooping)) {
        // Reset all players to starting positions
        playersWithPaths.forEach(player => {
          if (player.isLooping && player.originalPosition) {
            player.x = player.originalPosition.x
            player.y = player.originalPosition.y
            
            // Move ball with ball carrier using unified system
            if (ballCarrier && player === ballCarrier && player.isCarryingBall) {
              setBallCarrier(player)
            }
          }
        })
        
        // Calculate timings
        const playerTimings = playersWithPaths.map(player => {
          const pathLength = calculatePathLength(player.path!)
          const actualSpeed = (ANIMATION_CONFIG.BASE_SPEED * player.speed!) / 100
          const pathDuration = (pathLength / actualSpeed) * 1000
          const delay = player.sequenceDelay || 0
          return { player, pathDuration, delay }
        })
        
        // Start all players' journeys
        const playerPromises = playerTimings.map(async ({ player, pathDuration, delay }) => {
          if (!player.isLooping) return
          
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay))
          }
          
          if (player.isLooping) {
            const hasBall = ballCarrier && player === ballCarrier
            if (hasBall) {
              await animatePlayerPathWithBall(player, pathDuration)
            } else {
              await animatePlayerPath(player, pathDuration)
            }
          }
        })
        
        // Wait for all players to complete
        await Promise.all(playerPromises)
        
        // Brief pause before next cycle
        if (playersWithPaths.some(p => p.isLooping)) {
          await new Promise(resolve => setTimeout(resolve, ANIMATION_CONFIG.LOOP_DELAY))
        }
      }
    }
    
    runSynchronizedCycle()
  }
  
  // Enhanced sequence execution with ball transitions and proper state management
  const executeSequence = async (
    sequence: Sequence, 
    playersInSequence: Player[], 
    redrawCallback?: () => void,
    isMultiSequenceExecution: boolean = false,
    isRecording: boolean = false
  ): Promise<void> => {
    // Check if sequence has either active players OR ball events
    const hasActivePlayerMovement = sequence.activePlayerIds.length > 0
    const hasBallEvents = sequence.ballEvents && sequence.ballEvents.length > 0
    
    if (!hasActivePlayerMovement && !hasBallEvents) {
      return // Nothing to execute
    }

    animationState.value.isRunning = true
    
    // Emit initial state if recording
    if (isRecording) {
      emitPlayerStates(true)
    }
    
    // REFINED: Handle ball state restoration based on execution context
    if (sequence.ballState && sequence.ballState.attachedTo) {
      const savedBallCarrier = playersInSequence.find(p => 
        p.type === sequence.ballState.attachedTo?.type && 
        p.id === sequence.ballState.attachedTo?.id
      )
      
      const currentBallCarrier = ball.value.attachedTo ? 
        playersInSequence.find(p => 
          p.type === ball.value.attachedTo?.type && 
          p.id === ball.value.attachedTo?.id
        ) : null
      
      // Restore ball state in these scenarios:
      // 1. Multi-sequence execution (designed ball flow)
      // 2. No current ball carrier in this sequence
      // 3. Current ball carrier is not in this sequence
      if (savedBallCarrier && (
        isMultiSequenceExecution || 
        !currentBallCarrier ||
        !ball.value.attachedTo
      )) {
        await animateBallToPlayer(savedBallCarrier)
        setBallCarrier(savedBallCarrier)
        
        // Emit state after ball move if recording
        if (isRecording) {
          emitPlayerStates(true)
        }
      }
    }
    
    // Handle ball-only sequences (just ball passes, no player movement)
    if (!hasActivePlayerMovement && hasBallEvents) {
      for (const ballEvent of sequence.ballEvents) {
        const fromPlayer = playersInSequence.find(p => p.id === ballEvent.fromPlayerId)
        const toPlayer = playersInSequence.find(p => p.id === ballEvent.toPlayerId)
        
        if (fromPlayer && toPlayer) {
          const fromPos = ball.value.attachedTo && 
            ball.value.attachedTo.type === fromPlayer.type && 
            ball.value.attachedTo.id === fromPlayer.id
            ? { x: fromPlayer.x, y: fromPlayer.y }
            : ballEvent.ballPosition
          
          await animateBallPass(fromPos, toPlayer)
          
          // Emit state after ball pass if recording
          if (isRecording) {
            emitPlayerStates(true)
          }
          
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
      
      sequence.ballState = JSON.parse(JSON.stringify(ball.value))
      animationState.value.isRunning = false
      return
    }
    
    // Find active players (those with paths in the sequence)
    const activePlayers = playersInSequence.filter(player => 
      sequence.activePlayerIds.includes(player.id) && 
      player.path && 
      player.path.length > 0
    )
    
    if (activePlayers.length === 0) {
      animationState.value.isRunning = false
      return
    }
    
    // Reset players to starting positions
    activePlayers.forEach(player => {
      if (player.originalPosition) {
        player.x = player.originalPosition.x
        player.y = player.originalPosition.y
      }
    })
    
    // Clear all carrying flags - we'll set them during animation
    playersInSequence.forEach(p => {
      p.isCarryingBall = false
    })
    
    // Execute animations - ball follows carrier ONLY during path animation
    const playerAnimations = activePlayers.map(async (player) => {
      const delay = player.sequenceDelay || 0
      
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
      
      const pathLength = calculatePathLength(player.path!)
      const actualSpeed = (ANIMATION_CONFIG.BASE_SPEED * (player.speed || 100)) / 100
      const duration = (pathLength / actualSpeed) * 1000
      
      // Check if this player has the ball
      const hasBall = ball.value.attachedTo?.type === player.type && 
                      ball.value.attachedTo?.id === player.id
      
      if (hasBall) {
        player.isCarryingBall = true // Set flag for animation
        return animatePlayerPathWithBallRecording(player, duration, isRecording)
      } else {
        return animatePlayerPathRecording(player, duration, isRecording)
      }
    })
    
    // Wait for all animations to complete
    await Promise.all(playerAnimations)
    
    // Update final positions
    activePlayers.forEach(player => {
      if (player.path && player.path.length > 0) {
        const endPoint = player.path[player.path.length - 1]
        player.x = endPoint.x
        player.y = endPoint.y
      }
    })
    
    // Emit final state if recording
    if (isRecording) {
      emitPlayerStates(true)
    }
    
    // Save ball state at end of sequence
    sequence.ballState = JSON.parse(JSON.stringify(ball.value))
    
    animationState.value.isRunning = false
  }
  
  // Emit player states for recording
  const emitPlayerStates = (isRecording: boolean) => {
    if (!isRecording) return
    
    const timestamp = Date.now()
    const states: PlayerState[] = [
      {
        playerId: 'ball',
        position: { x: ball.value.x, y: ball.value.y },
        timestamp,
        ballState: {
          position: { x: ball.value.x, y: ball.value.y },
          attachedTo: ball.value.attachedTo ? { ...ball.value.attachedTo } : null
        }
      },
      ...players.value.map(player => ({
        playerId: `${player.type}-${player.id}`,
        position: { x: player.x, y: player.y },
        timestamp
      }))
    ]
    
    emit('update:playerStates', states)
  }
  
  // Continuous redraw for looping animations
  const startContinuousRedraw = (drawCallback: () => void) => {
    const redraw = () => {
      const hasLoopingPlayers = players.value.some(player => player.isLooping)
      if (hasLoopingPlayers) {
        drawCallback()
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
  
  return {
    // State
    animationState,
    isPlayRunning,
    isRunningCurrentPhase,
    isRunningFullPlay,
    
    // Animation methods
    animatePlayerPath,
    animatePlayerPathRecording,
    animatePlayerPathWithBall,
    animatePlayerPathWithBallRecording,
    animateBallPass,
    animateBallToPlayer,
    startPlayerLoop,
    stopPlayerLoop,
    stopAllPlayerLoops,
    startSynchronizedLoop,
    executeSequence,
    
    // Utilities
    calculatePathLength,
    emitPlayerStates,
    startContinuousRedraw,
    stopContinuousRedraw
  }
} 