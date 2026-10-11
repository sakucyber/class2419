<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'

import AppIcon from '@/components/common/AppIcon.vue'
import { downloadMedia } from '@/utils/image'

export interface LightboxItem {
  src: string
  caption?: string
}

const props = defineProps<{
  items: LightboxItem[]
  index: number
  open: boolean
}>()
const emit = defineEmits<{ 'update:index': [i: number]; 'update:open': [v: boolean] }>()

const current = computed(() => props.items[props.index])

function close() {
  emit('update:open', false)
}
function next() {
  if (!props.items.length) return
  emit('update:index', (props.index + 1) % props.items.length)
}
function prev() {
  if (!props.items.length) return
  emit('update:index', (props.index - 1 + props.items.length) % props.items.length)
}

function onKeydown(e: KeyboardEvent) {
  if (!props.open) return
  if (e.key === 'Escape') close()
  if (e.key === 'ArrowRight') next()
  if (e.key === 'ArrowLeft') prev()
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', onKeydown)
    } else {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeydown)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKeydown)
})

async function download() {
  if (!current.value) return
  const name = current.value.caption
    ? `${current.value.caption}.jpg`
    : `photo-${props.index + 1}.jpg`
  await downloadMedia(current.value.src, name)
}

let touchX = 0
function onTouchStart(e: TouchEvent) {
  touchX = e.changedTouches[0].clientX
}
function onTouchEnd(e: TouchEvent) {
  const dx = e.changedTouches[0].clientX - touchX
  if (Math.abs(dx) < 50) return
  if (dx < 0) next()
  else prev()
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open && current"
      class="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="图片预览"
      @click.self="close"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    >
      <header class="lb-header">
        <span class="counter">{{ index + 1 }} / {{ items.length }}</span>
        <div class="lb-actions">
          <button class="lb-btn" aria-label="下载图片" @click="download"><AppIcon name="download" :size="18" /></button>
          <button class="lb-btn" aria-label="关闭预览" @click="close"><AppIcon name="close" :size="18" /></button>
        </div>
      </header>

      <button class="lb-arrow lb-arrow--prev" aria-label="上一张" @click="prev">‹</button>
      <figure class="lb-stage" @click.self="close">
        <img :src="current.src" :alt="current.caption || '预览图片'" class="lb-img" />
        <figcaption v-if="current.caption" class="lb-caption">{{ current.caption }}</figcaption>
      </figure>
      <button class="lb-arrow lb-arrow--next" aria-label="下一张" @click="next">›</button>
    </div>
  </Teleport>
</template>

<style scoped>
.lightbox {
  position: fixed;
  inset: 0;
  z-index: var(--z-lightbox);
  background: rgba(6, 10, 20, 0.92);
  display: grid;
  grid-template-rows: auto 1fr;
  animation: fadeIn var(--duration) var(--ease);
}
@keyframes fadeIn {
  from {
    opacity: 0;
  }
}
.lb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  color: #e2e8f0;
}
.counter {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
.lb-actions {
  display: flex;
  gap: var(--space-2);
}
.lb-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 1.1rem;
  display: grid;
  place-items: center;
  transition: background var(--duration-fast) var(--ease);
}
.lb-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}
.lb-stage {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: 0 var(--space-12) var(--space-6);
  min-height: 0;
}
.lb-img {
  max-width: 100%;
  max-height: 78vh;
  object-fit: contain;
  border-radius: var(--radius-sm);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
}
.lb-caption {
  color: #cbd5e1;
  font-size: 0.95rem;
  text-align: center;
}
.lb-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  border: none;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 1.8rem;
  line-height: 1;
  display: grid;
  place-items: center;
  transition: background var(--duration-fast) var(--ease);
  z-index: 1;
}
.lb-arrow:hover {
  background: rgba(255, 255, 255, 0.28);
}
.lb-arrow--prev {
  left: var(--space-3);
}
.lb-arrow--next {
  right: var(--space-3);
}

@media (max-width: 640px) {
  .lb-stage {
    padding: 0 var(--space-4) var(--space-4);
  }
  .lb-arrow {
    width: 40px;
    height: 40px;
    font-size: 1.4rem;
  }
}
</style>
