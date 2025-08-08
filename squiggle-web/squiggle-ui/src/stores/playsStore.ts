import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Play, CreatePlayRequest } from '../types/play'
import { useSessionStore } from './sessionStore'

export const usePlaysStore = defineStore('plays', () => {
  const plays = ref<Play[]>([])
  const sessionStore = useSessionStore()

  // Load from session storage on initialization
  const loadPlays = () => {
    try {
      const stored = sessionStorage.getItem('squiggle_plays')
      if (stored) {
        plays.value = JSON.parse(stored)
        console.log('Plays loaded from session storage:', plays.value.length)
      }
    } catch (error) {
      console.error('Failed to load plays from session storage:', error)
      plays.value = []
    }
  }

  // Save to session storage
  const savePlays = () => {
    try {
      sessionStorage.setItem('squiggle_plays', JSON.stringify(plays.value))
    } catch (error) {
      console.error('Failed to save plays to session storage:', error)
    }
  }

  // Create play with session check
  const createPlay = (playData: CreatePlayRequest): Play => {
    if (!sessionStore.isSessionValid) {
      clearPlays()
      throw new Error('Session expired')
    }

    sessionStore.updateActivity()

    const newPlay: Play = {
      id: `play_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: playData.name,
      createdAt: new Date().toISOString(),
      playerStates: playData.playerStates
    }

    plays.value.push(newPlay)
    savePlays()
    return newPlay
  }

  // List plays with session check
  const listPlays = (): Play[] => {
    if (!sessionStore.isSessionValid) {
      clearPlays()
      return []
    }

    sessionStore.updateActivity()
    return plays.value
  }

  // Get play with session check
  const getPlay = (id: string): Play | null => {
    if (!sessionStore.isSessionValid) {
      clearPlays()
      return null
    }

    sessionStore.updateActivity()
    return plays.value.find(play => play.id === id) || null
  }

  // Delete play with session check
  const deletePlay = (id: string): void => {
    if (!sessionStore.isSessionValid) {
      clearPlays()
      return
    }

    sessionStore.updateActivity()
    
    const index = plays.value.findIndex(play => play.id === id)
    if (index !== -1) {
      plays.value.splice(index, 1)
      savePlays()
    }
  }

  // Clear all plays
  const clearPlays = () => {
    plays.value = []
    sessionStorage.removeItem('squiggle_plays')
  }

  // Initialize store
  loadPlays()

  return {
    plays,
    createPlay,
    listPlays,
    getPlay,
    deletePlay,
    clearPlays
  }
}) 