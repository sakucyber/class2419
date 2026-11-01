<script setup lang="ts">
import { computed } from 'vue'

import AppIcon from '@/components/common/AppIcon.vue'
import { THEME_BY_KEY } from '@/config/styles'
import { useSettingsStore } from '@/store/settings'

const settingsStore = useSettingsStore()
const current = computed(() => THEME_BY_KEY[settingsStore.settings.theme])
</script>

<template>
  <button
    class="icon-btn"
    type="button"
    :aria-label="current.title"
    :title="current.title"
    @click="settingsStore.cycleTheme()"
  >
    <AppIcon :name="current.icon" :size="17" :stroke-width="1.9" />
  </button>
</template>
