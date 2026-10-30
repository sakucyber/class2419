<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

import LazyImage from '@/components/common/LazyImage.vue'
import { useSettingsStore } from '@/store/settings'
import type { Slide } from '@/types'

const props = defineProps<{ slides: Slide[] }>()

const current = ref(0)
const paused = ref(false)
const settingsStore = useSettingsStore()
let timer: ReturnType<typeof setInterval> | null = null
let touchStartX = 0

function next() {
  if (!props.slides.length) return
  current.value = (current.value + 1) % props.slides.length
}
function prev() {
  if (!props.slides.length) return
  current.value = (current.value - 1 + props.slides.length) % props.slides.length
}
function go(i: number) {
  current.value = i
}

function startAuto() {
  stopAuto()
  if (!settingsStore.settings.animations || props.slides.length < 2) return
  timer = setInterval(() => {
    if (!paused.value) next()
  }, 6000)
}
function stopAuto() {
  if (timer) clearInterval(timer)
  timer = null
}

onMounted(startAuto)
onBeforeUnmount(stopAuto)

function onTouchStart(e: TouchEvent) {
  touchStartX = e.changedTouches[0].clientX
}
function onTouchEnd(e: TouchEvent) {
  const dx = e.changedTouches[0].clientX - touchStartX
  if (Math.abs(dx) < 40) return
  if (dx < 0) next()
  else prev()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowRight') next()
  if (e.key === 'ArrowLeft') prev()
}
</script>

<template>
  <section
    class="carousel"
    aria-roledescription="carousel"
    aria-label="班级风采轮播"
    tabindex="0"
    @mouseenter="paused = true"
    @mouseleave="paused = false"
    @focusin="paused = true"
    @focusout="paused = false"
    @keydown="onKeydown"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
  >
    <div class="viewport">
      <Transition name="fade" mode="out-in">
        <RouterLink :key="slides[current]?.id" :to="slides[current]?.link || '/'" class="slide">
          <LazyImage
            :src="slides[current]?.image || ''"
            :alt="slides[current]?.title || ''"
            aspect="16 / 6"
            radius="0"
            eager
          />
          <div class="caption">
            <p class="caption-index num">
              {{ String(current + 1).padStart(2, '0') }} / {{ String(slides.length).padStart(2, '0') }}
            </p>
            <h2>{{ slides[current]?.title }}</h2>
            <p v-if="slides[current]?.subtitle" class="caption-sub">
              {{ slides[current]?.subtitle }}
            </p>
          </div>
        </RouterLink>
      </Transition>

      <template v-if="slides.length > 1">
        <button class="arrow arrow--prev" type="button" aria-label="上一张" @click.prevent="prev">
          <span aria-hidden="true">‹</span>
        </button>
        <button class="arrow arrow--next" type="button" aria-label="下一张" @click.prevent="next">
          <span aria-hidden="true">›</span>
        </button>

        <div class="dots" role="tablist" aria-label="轮播切换">
          <button
            v-for="(slide, i) in slides"
            :key="slide.id"
            class="dot"
            type="button"
            :class="{ active: i === current }"
            role="tab"
            :aria-selected="i === current"
            :aria-label="`第 ${i + 1} 张：${slide.title}`"
            @click="go(i)"
          ></button>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.carousel {
  position: relative;
  outline: none;
}
.viewport {
  position: relative;
  overflow: hidden;
  border: var(--card-bd-w) solid var(--line);
  border-radius: var(--card-radius);
  background: var(--surface);
  box-shadow: var(--card-shadow);
}
@media (min-width: 1200px) {
  .viewport {
    height: clamp(360px, 27vw, 440px);
  }
  .slide {
    height: 100%;
  }
  .viewport :deep(.lazy-image) {
    height: 100%;
    aspect-ratio: auto !important;
  }
}
.slide {
  display: block;
  position: relative;
}
.slide::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--scrim);
  pointer-events: none;
}
.caption {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  padding: clamp(16px, 3.6vw, 36px);
  color: #fff;
}
.caption-index {
  font-size: var(--fs-2xs);
  letter-spacing: 3px;
  opacity: 0.7;
  margin-bottom: 8px;
}
.caption h2 {
  color: #fff;
  font-size: clamp(1.15rem, 3vw, 1.9rem);
  font-weight: var(--display-weight);
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
}
.caption-sub {
  margin-top: 4px;
  font-size: clamp(0.82rem, 1.8vw, 0.95rem);
  color: rgba(255, 255, 255, 0.9);
  max-width: 56ch;
}

.arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: var(--radius-xs);
  background: rgba(10, 14, 20, 0.28);
  color: #fff;
  font-size: 1.5rem;
  line-height: 1;
  opacity: 0;
  backdrop-filter: blur(4px);
  transition:
    opacity var(--dur) var(--ease),
    background-color var(--dur-fast) var(--ease);
}
.carousel:hover .arrow,
.carousel:focus-within .arrow {
  opacity: 1;
}
.arrow:hover {
  background: rgba(10, 14, 20, 0.5);
}
.arrow--prev {
  left: var(--space-3);
}
.arrow--next {
  right: var(--space-3);
}

.dots {
  position: absolute;
  bottom: var(--space-3);
  right: var(--space-4);
  z-index: 1;
  display: flex;
  gap: 6px;
}
.dot {
  width: 16px;
  height: 3px;
  padding: 0;
  border: none;
  background: rgba(255, 255, 255, 0.45);
  transition:
    width var(--dur) var(--ease),
    background-color var(--dur) var(--ease);
}
.dot.active {
  width: 30px;
  background: #fff;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--dur-slow) var(--ease);
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (hover: none) {
  .arrow {
    opacity: 0.85;
  }
}
@media (max-width: 600px) {
  .arrow {
    display: none;
  }
  .caption {
    padding-right: 88px;
  }
}

/* ---- 风格 ---- */
[data-style='japandi'] .viewport {
  border-color: transparent;
  box-shadow: var(--shadow-2);
}
[data-style='japandi'] .arrow {
  border-radius: 50%;
  background: rgba(255, 254, 251, 0.9);
  color: var(--text);
  border-color: transparent;
}
[data-style='japandi'] .dot {
  border-radius: 999px;
}

[data-style='brutal'] .viewport {
  border: 3px solid #111;
  box-shadow: 8px 8px 0 #111;
}
[data-style='brutal'] .arrow {
  border: 3px solid #111;
  background: var(--accent);
  color: #111;
  font-weight: 900;
  box-shadow: 3px 3px 0 #111;
}
[data-style='brutal'] .dot {
  height: 10px;
  width: 10px;
  border: 2px solid #fff;
  background: transparent;
}
[data-style='brutal'] .dot.active {
  background: var(--accent);
  width: 22px;
}

[data-style='legacy'] .viewport {
  border: none;
  box-shadow: var(--shadow-2);
}
[data-style='legacy'] .arrow {
  border-radius: 999px;
  border: none;
  background: rgba(255, 255, 255, 0.85);
  color: #1e293b;
}
[data-style='legacy'] .dot {
  height: 8px;
  width: 8px;
  border-radius: 999px;
}
[data-style='legacy'] .dot.active {
  width: 24px;
}
</style>
