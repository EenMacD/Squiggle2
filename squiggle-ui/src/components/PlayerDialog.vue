<template>
  <!-- Dialog Backdrop -->
  <div v-if="showDialog" class="dialog-backdrop" @click="closeDialog"></div>

  <!-- Player Count Dialog -->
  <div v-if="showDialog" class="dialog">
    <div class="dialog-content">
      <h3 class="dialog-title">
        {{ dialogType === 'attacking' ? 'Add Red Players' : 'Add Blue Players' }}
      </h3>
      
      <!-- Player Count Section -->
      <div class="number-input">
        <button class="number-btn" @click="decrementCount">-</button>
        <input 
          type="number" 
          :value="selectedCount"
          @input="validateCount"
          min="1" 
          max="16"
        >
        <button class="number-btn" @click="incrementCount">+</button>
      </div>
      
      <!-- NEW: Formation Selection Section -->
      <div class="formation-section">
        <h4 class="section-title">Formation</h4>
        <p class="section-description">
          Choose starting positions for new players
        </p>
        
        <!-- Formation Tabs -->
        <div class="formation-tabs">
          <button 
            @click="selectedFormationType = 'default'" 
            :class="{ active: selectedFormationType === 'default' }"
            class="formation-tab"
          >
            Default
          </button>
          <button 
            @click="selectedFormationType = 'custom'" 
            :class="{ active: selectedFormationType === 'custom' }"
            class="formation-tab"
          >
            Custom
          </button>
          <button 
            @click="selectedFormationType = 'saved'" 
            :class="{ active: selectedFormationType === 'saved' }"
            class="formation-tab"
            :disabled="true"
          >
            Saved
          </button>
        </div>
        
        <!-- Mini Field Preview -->
        <div class="formation-preview">
          <div class="preview-header">
            <span class="preview-title">Field Preview</span>
            <label class="show-existing-toggle">
              <input 
                type="checkbox" 
                v-model="showExistingPlayers"
                @change="drawPreview"
              >
              <span class="toggle-text">Show existing players</span>
            </label>
          </div>
          
          <canvas 
            ref="previewCanvas" 
            width="280" 
            height="200" 
            class="mini-field"
            @mousedown="handleCanvasMouseDown"
            @mousemove="handleCanvasMouseMove"
            @mouseup="handleCanvasMouseUp"
            @mouseleave="handleCanvasMouseUp"
            :style="{ cursor: selectedFormationType === 'custom' ? 'grab' : 'default' }"
          />
        </div>
        
        <!-- Saved Formations List -->
        <div v-if="selectedFormationType === 'saved'" class="saved-formations">
          <div v-if="savedFormations.length === 0" class="no-formations">
            <p>No saved formations yet.</p>
            <p class="hint">Create custom formations and save them to use here.</p>
          </div>
          <div v-else class="formations-list">
            <div 
              v-for="formation in savedFormations" 
              :key="formation.id"
              class="formation-item"
              :class="{ active: selectedSavedFormation?.id === formation.id }"
              @click="selectSavedFormation(formation)"
            >
              <div class="formation-info">
                <span class="formation-name">{{ formation.name }}</span>
                <span class="formation-details">{{ formation.playerCount }} players</span>
              </div>
              <button 
                @click.stop="deleteSavedFormation(formation.id)"
                class="delete-formation-btn"
                title="Delete formation"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
        
        <!-- Save Custom Formation -->
        <div v-if="hasCustomChanges" class="save-formation-section">
          <input 
            v-model="formationName"
            placeholder="Formation name (e.g., 'Attacking Line', 'Defensive Wall')"
            class="formation-name-input"
            @keyup.enter="saveFormation"
          />
          <button 
            @click="saveFormation" 
            class="save-formation-btn"
            :disabled="!canSaveFormation"
          >
            <span class="icon">💾</span>
            Save Formation
          </button>
        </div>
      </div>
      
      <!-- Dialog Actions -->
      <div class="dialog-actions">
        <button class="dialog-btn cancel" @click="closeDialog">Cancel</button>
        <button class="dialog-btn confirm" @click="confirmPlayerCount">
          Add {{ selectedCount }} Player{{ selectedCount > 1 ? 's' : '' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import type { Formation, FormationDialogState } from '../types/game'
import { calculatePreviewFieldDimensions, calculateFieldDimensions } from '../types/game'

interface Props {
  showAttackingCount: boolean
  showDefensiveCount: boolean
  selectedAttackingCount: number
  selectedDefensiveCount: number
  // NEW: Add existing players for context
  existingPlayers?: Array<{ x: number, y: number, type: 'attacking' | 'defensive', id: number }>
  canvasConfig?: { fieldWidth: number, fieldHeight: number, width: number, height: number }
}

interface Emits {
  (e: 'close-dialog'): void
  (e: 'confirm-player-count', data: { 
    type: 'attacking' | 'defensive', 
    count: number,
    formation: {
      type: 'default' | 'custom' | 'saved',
      positions: Array<{ x: number, y: number }>
    }
  }): void
  (e: 'update:selectedAttackingCount', count: number): void
  (e: 'update:selectedDefensiveCount', count: number): void
}

const props = withDefaults(defineProps<Props>(), {
  existingPlayers: () => [],
  canvasConfig: () => ({ fieldWidth: 1000, fieldHeight: 1428, width: 1400, height: 1428 })
})
const emit = defineEmits<Emits>()

// Existing reactive state
const showDialog = ref(false)
const dialogType = ref<'attacking' | 'defensive'>('attacking')
const selectedCount = ref(1)

// NEW: Formation state
const selectedFormationType = ref<'default' | 'custom' | 'saved'>('default')
const showExistingPlayers = ref(true)
const previewCanvas = ref<HTMLCanvasElement | null>(null)

// NEW: Custom formation state
const customPositions = ref<Array<{ x: number, y: number }>>([])
const isDragging = ref(false)
const dragPlayerIndex = ref(-1)
const formationName = ref('')
const savedFormations = ref<Formation[]>([])
const selectedSavedFormation = ref<Formation | null>(null)

// Constants for mini field
const PREVIEW_WIDTH = 280
const PREVIEW_HEIGHT = 200
const FIELD_PADDING = 20

// UNIFIED: Calculate field dimensions using the same method as main field
const getFieldDimensions = () => {
  return calculatePreviewFieldDimensions(PREVIEW_WIDTH, PREVIEW_HEIGHT, FIELD_PADDING)
}

// Computed properties
const existingPlayersOfType = computed(() => {
  return props.existingPlayers?.filter(p => p.type === dialogType.value) || []
})

const hasCustomChanges = computed(() => {
  return selectedFormationType.value === 'custom' && customPositions.value.length > 0
})

const canSaveFormation = computed(() => {
  return hasCustomChanges.value && formationName.value.trim().length > 0
})

// Watch for dialog state changes
watch(() => props.showAttackingCount, (newVal) => {
  if (newVal) {
    showDialog.value = true
    dialogType.value = 'attacking'
    selectedCount.value = props.selectedAttackingCount
  } else if (!props.showDefensiveCount) {
    showDialog.value = false
  }
})

watch(() => props.showDefensiveCount, (newVal) => {
  if (newVal) {
    showDialog.value = true
    dialogType.value = 'defensive'
    selectedCount.value = props.selectedDefensiveCount
  } else if (!props.showAttackingCount) {
    showDialog.value = false
  }
})

const incrementCount = () => {
  if (selectedCount.value < 16) {
    selectedCount.value++
    updateParentCount()
  }
}

const decrementCount = () => {
  if (selectedCount.value > 1) {
    selectedCount.value--
    updateParentCount()
  }
}

const validateCount = (event: Event) => {
  const input = event.target as HTMLInputElement
  let value = parseInt(input.value)
  
  if (isNaN(value)) value = 1
  if (value < 1) value = 1
  if (value > 16) value = 16
  
  selectedCount.value = value
  updateParentCount()
}

const updateParentCount = () => {
  if (dialogType.value === 'attacking') {
    emit('update:selectedAttackingCount', selectedCount.value)
  } else {
    emit('update:selectedDefensiveCount', selectedCount.value)
  }
  // Redraw preview when count changes
  nextTick(() => drawPreview())
}

// NEW: Formation logic
const generateDefaultFormationPositions = (): Array<{ x: number, y: number }> => {
  const positions: Array<{ x: number, y: number }> = []
  
  for (let i = 0; i < selectedCount.value; i++) {
    const existingOfType = existingPlayersOfType.value.length
    const totalExisting = existingOfType + i
    const row = Math.floor(totalExisting / 5)
    const col = totalExisting % 5
    
    const baseX = 0.5 // Center of field (relative)
    const baseY = dialogType.value === 'attacking' ? 0.75 : 0.25
    const horizontalSpacing = 0.08
    const verticalSpacing = 0.05
    
    positions.push({
      x: baseX + (col - 2) * horizontalSpacing,
      y: dialogType.value === 'attacking' 
        ? baseY + row * verticalSpacing 
        : baseY - row * verticalSpacing
    })
  }
  
  return positions
}

const getCurrentFormationPositions = (): Array<{ x: number, y: number }> => {
  switch (selectedFormationType.value) {
    case 'custom':
      return customPositions.value.length > 0 ? customPositions.value : generateDefaultFormationPositions()
    case 'saved':
      return selectedSavedFormation.value?.positions || generateDefaultFormationPositions()
    default:
      return generateDefaultFormationPositions()
  }
}

const initializeCustomPositions = () => {
  if (selectedFormationType.value === 'custom' && customPositions.value.length !== selectedCount.value) {
    customPositions.value = generateDefaultFormationPositions()
  }
}

// Formation management
const loadSavedFormations = () => {
  try {
    const saved = localStorage.getItem(`formations_${dialogType.value}`)
    savedFormations.value = saved ? JSON.parse(saved) : []
  } catch (error) {
    console.error('Failed to load saved formations:', error)
    savedFormations.value = []
  }
}

const saveFormation = () => {
  if (!canSaveFormation.value) return
  
  const formation: Formation = {
    id: Date.now().toString(),
    name: formationName.value.trim(),
    positions: [...customPositions.value],
    playerCount: selectedCount.value,
    type: dialogType.value,
    createdAt: new Date()
  }
  
  savedFormations.value.push(formation)
  
  try {
    localStorage.setItem(`formations_${dialogType.value}`, JSON.stringify(savedFormations.value))
    formationName.value = ''
    alert(`Formation "${formation.name}" saved successfully!`)
  } catch (error) {
    console.error('Failed to save formation:', error)
    alert('Failed to save formation. Please try again.')
  }
}

const selectSavedFormation = (formation: Formation) => {
  selectedSavedFormation.value = formation
  selectedCount.value = formation.playerCount
  updateParentCount()
}

const deleteSavedFormation = (formationId: string) => {
  const index = savedFormations.value.findIndex(f => f.id === formationId)
  if (index !== -1) {
    const formation = savedFormations.value[index]
    if (confirm(`Delete formation "${formation.name}"?`)) {
      savedFormations.value.splice(index, 1)
      localStorage.setItem(`formations_${dialogType.value}`, JSON.stringify(savedFormations.value))
      if (selectedSavedFormation.value?.id === formationId) {
        selectedSavedFormation.value = null
      }
    }
  }
}

// Mouse event handlers for custom formation
const handleCanvasMouseDown = (event: MouseEvent) => {
  if (selectedFormationType.value !== 'custom') return
  
  const canvas = previewCanvas.value
  if (!canvas) return
  
  const rect = canvas.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  // Check if clicking on a new player
  const playerIndex = getPlayerAtPosition(x, y)
  if (playerIndex !== -1) {
    isDragging.value = true
    dragPlayerIndex.value = playerIndex
    canvas.style.cursor = 'grabbing'
  }
}

const handleCanvasMouseMove = (event: MouseEvent) => {
  if (selectedFormationType.value !== 'custom') return
  
  const canvas = previewCanvas.value
  if (!canvas) return
  
  const rect = canvas.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  if (isDragging.value && dragPlayerIndex.value !== -1) {
    // Update player position
    const { fieldWidth, fieldHeight, fieldX, fieldY } = getFieldDimensions()
    const relativeX = Math.max(0, Math.min(1, (x - fieldX) / fieldWidth))
    const relativeY = Math.max(0, Math.min(1, (y - fieldY) / fieldHeight))
    
    customPositions.value[dragPlayerIndex.value] = { x: relativeX, y: relativeY }
    drawPreview()
  } else {
    // Update cursor based on hover
    const playerIndex = getPlayerAtPosition(x, y)
    canvas.style.cursor = playerIndex !== -1 ? 'grab' : 'default'
  }
}

const handleCanvasMouseUp = () => {
  isDragging.value = false
  dragPlayerIndex.value = -1
  if (previewCanvas.value) {
    previewCanvas.value.style.cursor = 'default'
  }
}

const getPlayerAtPosition = (x: number, y: number): number => {
  if (selectedFormationType.value !== 'custom') return -1
  
  const positions = getCurrentFormationPositions()
  
  for (let i = 0; i < positions.length; i++) {
    const coords = convertRelativeToCanvas(positions[i].x, positions[i].y)
    const distance = Math.sqrt(Math.pow(x - coords.x, 2) + Math.pow(y - coords.y, 2))
    if (distance <= 10) { // 10px click radius
      return i
    }
  }
  return -1
}

// Canvas drawing functions
const drawPreview = () => {
  if (!previewCanvas.value) return
  
  const canvas = previewCanvas.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  // Clear canvas
  ctx.clearRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT)
  
  // Draw mini field
  drawMiniField(ctx)
  
  // Draw existing players if enabled
  if (showExistingPlayers.value) {
    drawExistingPlayers(ctx)
  }
  
  // Draw new players in formation
  drawNewPlayers(ctx)
}

const drawMiniField = (ctx: CanvasRenderingContext2D) => {
  const { fieldWidth, fieldHeight, fieldX, fieldY } = getFieldDimensions()
  
  // Field background
  ctx.fillStyle = 'rgba(34, 139, 34, 0.15)'
  ctx.fillRect(fieldX, fieldY, fieldWidth, fieldHeight)
  
  // Field border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.lineWidth = 1
  ctx.strokeRect(fieldX, fieldY, fieldWidth, fieldHeight)
  
  // Center line
  ctx.beginPath()
  ctx.setLineDash([3, 2])
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
  ctx.moveTo(fieldX, fieldY + fieldHeight / 2)
  ctx.lineTo(fieldX + fieldWidth, fieldY + fieldHeight / 2)
  ctx.stroke()
  ctx.setLineDash([])
}

const drawExistingPlayers = (ctx: CanvasRenderingContext2D) => {
  props.existingPlayers?.forEach(player => {
    const coords = convertToCanvasCoords(0, 0, player.x, player.y)
    
    // Player shadow
    ctx.beginPath()
    ctx.arc(coords.x + 1, coords.y + 1, 5, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
    ctx.fill()
    
    // Player circle (muted)
    ctx.beginPath()
    ctx.arc(coords.x, coords.y, 5, 0, Math.PI * 2)
    ctx.fillStyle = player.type === 'attacking' ? 'rgba(255, 68, 68, 0.4)' : 'rgba(68, 68, 255, 0.4)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.lineWidth = 1
    ctx.stroke()
    
    // Player number
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.font = '8px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(player.id.toString(), coords.x, coords.y)
  })
}

const drawNewPlayers = (ctx: CanvasRenderingContext2D) => {
  const positions = getCurrentFormationPositions()
  
  positions.forEach((pos, index) => {
    const coords = convertRelativeToCanvas(pos.x, pos.y)
    const existingCount = existingPlayersOfType.value.length
    
    // Player shadow
    ctx.beginPath()
    ctx.arc(coords.x + 1, coords.y + 1, 7, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.fill()
    
    // Player circle (bright) - highlight if being dragged
    ctx.beginPath()
    ctx.arc(coords.x, coords.y, 7, 0, Math.PI * 2)
    const isBeingDragged = isDragging.value && dragPlayerIndex.value === index
    ctx.fillStyle = isBeingDragged 
      ? (dialogType.value === 'attacking' ? '#FF6666' : '#6666FF')
      : (dialogType.value === 'attacking' ? '#FF4444' : '#4444FF')
    ctx.fill()
    ctx.strokeStyle = 'white'
    ctx.lineWidth = isBeingDragged ? 3 : 2
    ctx.stroke()
    
    // Player number
    ctx.fillStyle = 'white'
    ctx.font = 'bold 9px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText((existingCount + index + 1).toString(), coords.x, coords.y)
    
    // Show drag hint for custom mode
    if (selectedFormationType.value === 'custom' && !isDragging.value) {
      ctx.font = '6px -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
      ctx.fillText('drag', coords.x, coords.y + 15)
    }
  })
}

// Watch for changes that require redraw
watch([selectedCount, selectedFormationType, showExistingPlayers, dialogType, customPositions, selectedSavedFormation], () => {
  // Initialize custom positions first if needed (before redraw)
  if (selectedFormationType.value === 'custom') {
    initializeCustomPositions()
  }
  nextTick(() => drawPreview())
}, { deep: true })

watch(showDialog, (newVal) => {
  if (newVal) {
    loadSavedFormations()
    nextTick(() => {
      initializeCustomPositions()
      drawPreview()
    })
  }
})

// Watch for formation type changes
watch(selectedFormationType, (newType) => {
  if (newType === 'custom') {
    initializeCustomPositions()
  } else if (newType === 'saved') {
    loadSavedFormations()
  }
})

const closeDialog = () => {
  // Reset state when closing
  customPositions.value = []
  selectedSavedFormation.value = null
  formationName.value = ''
  isDragging.value = false
  dragPlayerIndex.value = -1
  
  emit('close-dialog')
}

const confirmPlayerCount = () => {
  const formationPositions = getCurrentFormationPositions()
  
  emit('confirm-player-count', {
    type: dialogType.value,
    count: selectedCount.value,
    formation: {
      type: selectedFormationType.value,
      positions: formationPositions
    }
  })
  
  closeDialog()
}

// NEW: Canvas coordinate conversion functions
const convertRelativeToCanvas = (relativeX: number, relativeY: number): { x: number, y: number } => {
  const { fieldWidth, fieldHeight, fieldX, fieldY } = getFieldDimensions()
  return {
    x: fieldX + (relativeX * fieldWidth),
    y: fieldY + (relativeY * fieldHeight)
  }
}

const convertToCanvasCoords = (offsetX: number, offsetY: number, fieldX: number, fieldY: number): { x: number, y: number } => {
  // Convert from full field coordinates to mini canvas coordinates using unified method
  const mainFieldDimensions = calculateFieldDimensions(props.canvasConfig?.width || 1400, props.canvasConfig?.height || 1428)
  const relativeX = mainFieldDimensions.toRelativeX(fieldX)
  const relativeY = mainFieldDimensions.toRelativeY(fieldY)
  
  return convertRelativeToCanvas(relativeX, relativeY)
}
</script>

<style scoped>
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

.formation-section {
  margin-bottom: 1.5rem;
}

.section-title {
  color: white;
  font-size: 1rem;
  font-weight: 500;
  margin: 0 0 0.5rem 0;
}

.section-description {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
  margin: 0 0 1rem 0;
  line-height: 1.3;
}

.formation-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.formation-tab {
  flex: 1;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: white;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.formation-tab:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.2);
}

.formation-tab.active {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.formation-tab:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.formation-preview {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1rem;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.preview-title {
  color: white;
  font-size: 0.9rem;
  font-weight: 500;
}

.show-existing-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.show-existing-toggle input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #FF4444;
}

.toggle-text {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.8rem;
}

.mini-field {
  width: 100%;
  height: auto;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: border-color 0.2s ease;
}

.mini-field:hover {
  border-color: rgba(255, 255, 255, 0.2);
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

/* NEW: Save Formation Section */
.save-formation-section {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.formation-name-input {
  width: 100%;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: white;
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
}

.formation-name-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.formation-name-input:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.15);
}

.save-formation-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #4CAF50, #2E7D32);
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  justify-content: center;
}

.save-formation-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.save-formation-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* NEW: Saved Formations List */
.saved-formations {
  margin-top: 0.75rem;
}

.no-formations {
  text-align: center;
  padding: 2rem 1rem;
  color: rgba(255, 255, 255, 0.6);
}

.no-formations p {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
}

.no-formations .hint {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.4);
}

.formations-list {
  max-height: 150px;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.formation-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: all 0.2s ease;
}

.formation-item:last-child {
  border-bottom: none;
}

.formation-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.formation-item.active {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.2);
}

.formation-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.formation-name {
  color: white;
  font-weight: 500;
  font-size: 0.9rem;
}

.formation-details {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.8rem;
}

.delete-formation-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(255, 68, 68, 0.2);
  color: #ff4444;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-formation-btn:hover {
  background: rgba(255, 68, 68, 0.4);
  color: white;
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