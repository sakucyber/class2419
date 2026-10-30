<script setup lang="ts">
/**
 * 风格切换器：顶栏右侧的调色板按钮 + 浮层。
 *
 * 四种风格共用同一份组件树，切换只改 <html data-style>，
 * 不触发路由或数据层的任何变化 —— 所以切换是瞬时的、无副作用的。
 */
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

import AppIcon from '@/components/common/AppIcon.vue'
import { STYLE_OPTIONS } from '@/config/styles'
import { useSettingsStore } from '@/store/settings'
import type { StyleKey } from '@/types'

const settings = useSettingsStore()
const open = ref(false)
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)

function toggle() {
  open.value = !open.value
}

async function pick(style: StyleKey) {
  settings.settings.style = style
  open.value = false
  await nextTick()
  trigger.value?.focus()
}

function onPointerDown(event: PointerEvent) {
  if (!open.value) return
  const target = event.target as Node | null
  if (target && root.value && !root.value.contains(target)) open.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) {
    open.value = false
    trigger.value?.focus()
  }
}

watch(open, (value) => {
  if (value) {
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeydown)
  } else {
    document.removeEventListener('pointerdown', onPointerDown)
    document.removeEventListener('keydown', onKeydown)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div ref="root" class="style-switcher">
    <button
      ref="trigger"
      class="icon-btn"
      type="button"
      aria-label="切换视觉风格"
      title="切换视觉风格"
      aria-haspopup="dialog"
      :aria-expanded="open"
      @click="toggle"
    >
      <AppIcon name="palette" :size="18" :stroke-width="1.8" />
    </button>

    <Transition name="pop">
      <div v-if="open" class="panel" role="dialog" aria-label="选择视觉风格">
        <p class="panel-title">视觉风格</p>
        <ul class="list">
          <li v-for="option in STYLE_OPTIONS" :key="option.key">
            <button
              type="button"
              class="style-item"
              :class="{ active: settings.settings.style === option.key }"
              :aria-pressed="settings.settings.style === option.key"
              @click="pick(option.key)"
            >
              <span class="swatches" aria-hidden="true">
                <i v-for="(color, i) in option.swatches" :key="i" :style="{ background: color }" />
              </span>
              <span class="meta">
                <strong>{{ option.label }}</strong>
                <small>{{ option.en }}</small>
              </span>
              <AppIcon
                v-if="settings.settings.style === option.key"
                class="tick"
                name="check"
                :size="16"
                :stroke-width="2.4"
              />
            </button>
          </li>
        </ul>
        <p class="panel-note">风格与明暗可自由组合，设置会保存在本机。</p>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.style-switcher {
  position: relative;
}

.panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: var(--z-overlay);
  width: min(310px, calc(100vw - 24px));
  padding: var(--space-3);
  background: var(--surface);
  border: var(--card-bd-w) solid var(--line);
  border-radius: var(--card-radius);
  box-shadow: var(--shadow-3);
}
[data-style='annual'] .panel {
  background: #fff;
}
[data-style='brutal'] .panel {
  border-width: 3px;
  box-shadow: 8px 8px 0 #111;
}
.panel-title {
  font-size: var(--fs-2xs);
  font-weight: 700;
  letter-spacing: 2px;
  color: var(--text-3);
  text-transform: uppercase;
  padding: 2px 6px var(--space-2);
}
.list {
  display: grid;
  gap: 2px;
}
.style-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 8px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  text-align: left;
  transition:
    background-color var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease);
}
.style-item:hover {
  background: var(--bg-soft);
}
.style-item.active {
  background: var(--accent-soft);
  border-color: var(--accent-soft-2);
}
.swatches {
  flex: none;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  width: 34px;
  height: 34px;
  border: 1px solid var(--line);
  border-radius: var(--radius-xs);
  overflow: hidden;
}
.swatches i {
  display: block;
}
[data-style='brutal'] .swatches {
  border-width: 2px;
  border-color: #111;
}
.meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  line-height: 1.35;
}
.meta strong {
  font-size: var(--fs-sm);
  font-family: var(--font-display);
  font-weight: 600;
}
.meta small {
  font-size: var(--fs-2xs);
  color: var(--text-3);
  letter-spacing: 1px;
}
.tick {
  flex: none;
  color: var(--accent-ink);
}
.panel-note {
  margin-top: var(--space-2);
  padding: var(--space-2) 6px 0;
  border-top: 1px solid var(--line);
  font-size: var(--fs-2xs);
  color: var(--text-3);
  line-height: 1.6;
}

.pop-enter-active,
.pop-leave-active {
  transition:
    opacity var(--dur-fast) var(--ease),
    transform var(--dur-fast) var(--ease);
}
.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
