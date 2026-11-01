<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import AppIcon from '@/components/common/AppIcon.vue'
import { downloadMedia } from '@/utils/image'
import { useFocusTrap, useScrollLock } from '@/utils/overlay'

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
const dialogEl = ref<HTMLElement | null>(null)

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

useScrollLock(() => props.open)
useFocusTrap(dialogEl, () => props.open, { onEscape: close })

/** 左右方向键翻页（Esc 与 Tab 交给焦点圈定） */
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowRight') next()
  if (e.key === 'ArrowLeft') prev()
}

watch(
  () => props.open,
  (open) => {
    if (open) window.addEventListener('keydown', onKeydown)
    else window.removeEventListener('keydown', onKeydown)
  },
  { immediate: true },
)

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

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
      ref="dialogEl"
      class="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="图片预览"
      @click.self="close"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    >
      <header class="lb-head">
        <span class="counter num">{{ index + 1 }} / {{ items.length }}</span>
        <div class="lb-actions">
          <button class="lb-btn" type="button" aria-label="下载图片" @click="download">
            <AppIcon name="download" :size="18" />
          </button>
          <button class="lb-btn" type="button" aria-label="关闭预览" @click="close">
            <AppIcon name="close" :size="18" />
          </button>
        </div>
      </header>

      <button class="lb-arrow lb-arrow--prev" type="button" aria-label="上一张" @click="prev">
        ‹
      </button>
      <figure class="stage" @click.self="close">
        <img :src="current.src" :alt="current.caption || '预览图片'" class="image" />
        <figcaption v-if="current.caption" class="lb-caption">{{ current.caption }}</figcaption>
      </figure>
      <button class="lb-arrow lb-arrow--next" type="button" aria-label="下一张" @click="next">
        ›
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
.lightbox {
  position: fixed;
  inset: 0;
  z-index: var(--z-lightbox);
  display: grid;
  grid-template-rows: auto 1fr;
  background: rgba(6, 10, 20, 0.94);
  animation: fade-in var(--dur) var(--ease);
}
@keyframes fade-in {
  from {
    opacity: 0;
  }
}
.lb-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  color: #e2e8f0;
}
.counter {
  font-weight: 600;
  letter-spacing: 1px;
}
.lb-actions {
  display: flex;
  gap: var(--space-2);
}
.lb-btn {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-xs);
  background: transparent;
  color: #fff;
  transition: background-color var(--dur-fast) var(--ease);
}
.lb-btn:hover {
  background: rgba(255, 255, 255, 0.16);
}
.stage {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: 0 var(--space-12) var(--space-6);
  min-height: 0;
}
.image {
  max-width: 100%;
  max-height: 78vh;
  object-fit: contain;
  border-radius: var(--radius-xs);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
}
.lb-caption {
  color: #cbd5e1;
  font-size: var(--fs-md);
  text-align: center;
}
.lb-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 1.7rem;
  line-height: 1;
  transition: background-color var(--dur-fast) var(--ease);
}
.lb-arrow:hover {
  background: rgba(255, 255, 255, 0.24);
}
.lb-arrow--prev {
  left: var(--space-3);
}
.lb-arrow--next {
  right: var(--space-3);
}
[data-style='brutal'] .lb-btn,
[data-style='brutal'] .lb-arrow {
  border-width: 3px;
  border-color: #fff;
  border-radius: 0;
}
[data-style='annual'] .lb-btn,
[data-style='annual'] .lb-arrow {
  border-radius: 2px;
}

@media (max-width: 640px) {
  .stage {
    padding: 0 var(--space-4) var(--space-4);
  }
  .lb-arrow {
    width: 38px;
    height: 38px;
    font-size: 1.4rem;
  }
}
</style>
