<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import type { IconName } from '@/components/common/icons'
import { useSettingsStore } from '@/store/settings'

const settingsStore = useSettingsStore()

const ORDER = ['auto', 'light', 'dark'] as const

function cycle() {
  const idx = ORDER.indexOf(settingsStore.settings.theme)
  settingsStore.settings.theme = ORDER[(idx + 1) % ORDER.length]
}

const ICONS: Record<string, IconName> = { auto: 'monitor', light: 'sun', dark: 'moon' }
const LABELS: Record<string, string> = {
  auto: '主题：跟随系统',
  light: '主题：亮色',
  dark: '主题：暗色',
}
</script>

<template>
  <button
    class="theme-btn"
    :aria-label="LABELS[settingsStore.settings.theme]"
    :title="LABELS[settingsStore.settings.theme]"
    @click="cycle"
  >
    <AppIcon :name="ICONS[settingsStore.settings.theme]" :size="17" :stroke-width="1.9" />
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

@media (max-width: 420px) {
  .theme-btn {
    width: 34px;
    height: 34px;
  }
}
</style>
