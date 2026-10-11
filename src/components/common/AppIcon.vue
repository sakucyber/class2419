<script setup lang="ts">
import { computed } from 'vue'

import { ICON_PATHS, type IconName } from './icons'

const props = withDefaults(
  defineProps<{
    name: IconName
    /** 图标尺寸（px） */
    size?: number | string
    /** 描边粗细 */
    strokeWidth?: number | string
    /** 实心填充（点赞/收藏的选中态） */
    filled?: boolean
  }>(),
  { size: 20, strokeWidth: 1.8, filled: false },
)

const paths = computed<string[]>(() => [...ICON_PATHS[props.name]])
</script>

<template>
  <svg
    class="app-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    :fill="filled ? 'currentColor' : 'none'"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="(d, i) in paths" :key="i" :d="d" />
  </svg>
</template>

<style scoped>
.app-icon {
  display: block;
  flex: none;
}
</style>
