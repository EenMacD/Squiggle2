<template>
  <div class="app-container">
    <nav class="navbar">
      <div class="navbar-brand">
        <span class="logo">Squiggle</span>
      </div>
      
      <button class="hamburger" @click="toggleMenu" :class="{ 'active': isMenuOpen }">
        <span></span>
        <span></span>
        <span></span>
      </button>

      <div class="navbar-menu" :class="{ 'active': isMenuOpen }">
        <div class="player-controls">
          <div class="control-group">
            <button class="nav-btn attacking" @click="showPlayerCount('attacking')">
              <span class="icon">🏉</span>
              Add Attack
            </button>
            <div v-if="showAttackingCount" class="count-selector">
              <span class="count-label">Select number of players:</span>
              <div class="count-buttons">
                <button 
                  v-for="n in 16" 
                  :key="n"
                  class="count-btn"
                  :class="{ 'active': selectedAttackingCount === n }"
                  @click="selectPlayerCount('attacking', n)"
                >
                  {{ n }}
                </button>
              </div>
            </div>
          </div>

          <div class="control-group">
            <button class="nav-btn defensive" @click="showPlayerCount('defensive')">
              <span class="icon">🏉</span>
              Add Defense
            </button>
            <div v-if="showDefensiveCount" class="count-selector">
              <span class="count-label">Select number of players:</span>
              <div class="count-buttons">
                <button 
                  v-for="n in 16" 
                  :key="n"
                  class="count-btn"
                  :class="{ 'active': selectedDefensiveCount === n }"
                  @click="selectPlayerCount('defensive', n)"
                >
                  {{ n }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="navbar-end" :class="{ 'active': isMenuOpen }">
        <button class="nav-btn">
          <span class="icon">👤</span>
          Profile
        </button>
      </div>
    </nav>

    <main class="main-content">
      <RugbyPitch />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import RugbyPitch from './components/RugbyPitch.vue'

const isMenuOpen = ref(false)
const showAttackingCount = ref(false)
const showDefensiveCount = ref(false)
const selectedAttackingCount = ref(0)
const selectedDefensiveCount = ref(0)

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
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

const selectPlayerCount = (type: 'attacking' | 'defensive', count: number) => {
  if (type === 'attacking') {
    selectedAttackingCount.value = count
    showAttackingCount.value = false
  } else {
    selectedDefensiveCount.value = count
    showDefensiveCount.value = false
  }
  // Here you would trigger the actual player addition
}
</script>

<style>
.app-container {
  min-height: 100vh;
  background: #000000;
}

.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 2rem;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(20px);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  position: sticky;
  top: 0;
  z-index: 1000;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.navbar-brand {
  display: flex;
  align-items: center;
}

.logo {
  font-size: 1.5rem;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: -0.5px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.hamburger {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 28px;
  height: 20px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  z-index: 1001;
  margin-left: 1rem;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.hamburger:hover {
  transform: scale(1.05);
}

.hamburger span {
  width: 100%;
  height: 2px;
  background: #ffffff;
  border-radius: 2px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: block;
  transform-origin: center;
}

.hamburger.active span:nth-child(1) {
  transform: translateY(9px) rotate(45deg);
  background: #ffffff;
}

.hamburger.active span:nth-child(2) {
  opacity: 0;
  transform: scale(0);
}

.hamburger.active span:nth-child(3) {
  transform: translateY(-9px) rotate(-45deg);
  background: #ffffff;
}

.navbar-menu {
  position: fixed;
  top: 0;
  right: -100%;
  width: 300px;
  height: 100vh;
  background: rgba(0, 0, 0, 0.98);
  backdrop-filter: blur(20px);
  display: flex;
  flex-direction: column;
  padding: 5rem 1.5rem 1.5rem;
  margin: 0;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.navbar-menu.active {
  right: 0;
}

.navbar-end {
  position: fixed;
  bottom: 0;
  right: -100%;
  width: 300px;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.98);
  backdrop-filter: blur(20px);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 1000;
}

.navbar-end.active {
  right: 0;
}

.nav-btn {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 1rem 1.25rem;
  margin-bottom: 0.5rem;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  transform: translateX(4px);
}

.nav-btn.active {
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
  font-weight: 600;
}

.nav-btn .icon {
  font-size: 1.3rem;
  margin-right: 1rem;
  opacity: 0.9;
}

.main-content {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .navbar {
    padding: 1rem;
  }
}

.player-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.control-group {
  position: relative;
  width: 100%;
}

.nav-btn.attacking {
  background: linear-gradient(135deg, #FF4444, #FF6B6B);
  color: white;
  font-weight: 600;
}

.nav-btn.defensive {
  background: linear-gradient(135deg, #4444FF, #6D9BFF);
  color: white;
  font-weight: 600;
}

.count-selector {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1rem;
  margin-top: 0.5rem;
  z-index: 1002;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.count-label {
  display: block;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
}

.count-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

.count-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  padding: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.count-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.count-btn.active {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-color: rgba(255, 255, 255, 0.3);
}
</style> 