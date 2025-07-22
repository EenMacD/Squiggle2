import type { Play, CreatePlayRequest } from '../types/play'
import { usePlaysStore } from '../stores/playsStore'

export const playService = {
  async createPlay(play: CreatePlayRequest): Promise<Play> {
    const playsStore = usePlaysStore()
    
    try {
      const newPlay = playsStore.createPlay(play)
      return newPlay
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to create play')
    }
  },

  async listPlays(): Promise<Play[]> {
    const playsStore = usePlaysStore()
    
    try {
      return playsStore.listPlays()
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch plays')
    }
  },

  async getPlay(id: string): Promise<Play> {
    const playsStore = usePlaysStore()
    
    try {
      const play = playsStore.getPlay(id)
      if (!play) {
        throw new Error('Play not found')
      }
      return play
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch play')
    }
  },

  async deletePlay(id: string): Promise<void> {
    const playsStore = usePlaysStore()
    
    try {
      playsStore.deletePlay(id)
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to delete play')
    }
  },

  // Export all plays as JSON file
  async exportPlays(): Promise<void> {
    const playsStore = usePlaysStore()
    const plays = playsStore.listPlays()
    
    if (plays.length === 0) {
      throw new Error('No plays to export')
    }

    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      plays: plays,
      metadata: {
        totalPlays: plays.length,
        appName: 'Squiggle Rugby Play Designer'
      }
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    })
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `squiggle-plays-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },

  // Import plays from JSON file
  async importPlays(file: File): Promise<{ success: number; errors: string[] }> {
    const playsStore = usePlaysStore()
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string
          const importData = JSON.parse(content)
          
          // Validate import data structure
          if (!importData.plays || !Array.isArray(importData.plays)) {
            throw new Error('Invalid file format: missing plays array')
          }

          if (importData.plays.length === 0) {
            throw new Error('No plays found in the file')
          }

          let successCount = 0
          const errors: string[] = []

          importData.plays.forEach((play: any, index: number) => {
            try {
              // Validate play structure
              if (!play.name || typeof play.name !== 'string') {
                errors.push(`Play ${index + 1}: Missing or invalid name`)
                return
              }

              if (!play.playerStates || !Array.isArray(play.playerStates)) {
                errors.push(`Play ${index + 1}: Missing or invalid player states`)
                return
              }

              // Validate player states
              const validPlayerStates = play.playerStates.filter((state: any) => {
                return state && 
                       state.playerId && 
                       state.position && 
                       typeof state.position.x === 'number' && 
                       typeof state.position.y === 'number' &&
                       state.timestamp
              })

              if (validPlayerStates.length === 0) {
                errors.push(`Play ${index + 1}: No valid player states found`)
                return
              }

              // Create the play with validated data
              const newPlay: CreatePlayRequest = {
                name: play.name,
                playerStates: validPlayerStates
              }

              playsStore.createPlay(newPlay)
              successCount++
            } catch (error) {
              errors.push(`Play ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
            }
          })

          resolve({ success: successCount, errors })
        } catch (error) {
          reject(new Error(`Failed to parse JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`))
        }
      }

      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }

      reader.readAsText(file)
    })
  },

  // Clear all plays
  async clearAllPlays(): Promise<void> {
    const playsStore = usePlaysStore()
    playsStore.clearPlays()
  }
} 