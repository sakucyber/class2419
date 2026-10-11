<script setup lang="ts">
import { useSettingsStore } from '@/store/settings'

const settingsStore = useSettingsStore()

function cycle() {
  const order = ['auto', 'light', 'dark'] as const
  const idx = order.indexOf(settingsStore.settings.theme)
  settingsStore.settings.theme = order[(idx + 1) % order.length]
}

const label = () =>
  ({ auto: '主题：跟随系统', light: '主题：亮色', dark: '主题：暗色' })[settingsStore.settings.theme]
</script>

<template>
  <button class="theme-btn" :aria-label="label()" :title="label()" @click="cycle">
    <span aria-hidden="true" class="icon">
      {{ settingsStore.settings.theme === 'dark' ? '🌙' : settingsStore.settings.theme === 'light' ? '☀️' : '🖥️' }}
    </span>
  </button>
</template>

<style scoped>
.theme-btn {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  background: var(--bg-soft);
  color: var(--text-2);
  transition: all var(--duration) var(--ease-spring);
}
.theme-btn:hover {
  background: var(--primary-soft);
  border-color: var(--primary-soft-2);
  color: var(--primary);
  transform: scale(1.12) rotate(20deg);
}
.theme-btn:active {
  transform: scale(0.92);
}
.icon {
  font-size: 1rem;
  line-height: 1;
}

@media (max-width: 420px) {
  .theme-btn {
    width: 34px;
    height: 34px;
  }
}
</style>
