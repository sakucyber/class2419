<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import type { IconName } from '@/components/common/icons'
import { useSettingsStore } from '@/store/settings'

const settingsStore = useSettingsStore()

const ICONS: Record<string, IconName> = { auto: 'monitor', light: 'sun', dark: 'moon' }
const LABELS: Record<string, string> = {
  auto: '主题：跟随系统',
  light: '主题：亮色',
  dark: '主题：暗色',
}
</script>

<template>
  <button
    class="icon-btn"
    type="button"
    :aria-label="LABELS[settingsStore.settings.theme]"
    :title="LABELS[settingsStore.settings.theme]"
    @click="settingsStore.cycleTheme()"
  >
    <AppIcon :name="ICONS[settingsStore.settings.theme]" :size="17" :stroke-width="1.9" />
  </button>
</template>
