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
  current.value = (current.value + 1) % props.slides.length
}
function prev() {
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
  }, 5000)
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
            radius="var(--radius-lg)"
            eager
          />
          <div class="caption">
            <h2>{{ slides[current]?.title }}</h2>
            <p v-if="slides[current]?.subtitle">{{ slides[current]?.subtitle }}</p>
          </div>
        </RouterLink>
      </Transition>

      <template v-if="slides.length > 1">
        <button class="arrow arrow--prev" aria-label="上一张" @click.prevent="prev">‹</button>
        <button class="arrow arrow--next" aria-label="下一张" @click.prevent="next">›</button>

        <div class="dots" role="tablist" aria-label="轮播切换">
          <button
            v-for="(slide, i) in slides"
            :key="slide.id"
            class="dot"
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
  border-radius: var(--radius-lg);
  outline: none;
}
.carousel:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 3px;
}
.viewport {
  position: relative;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-2);
}
/* 宽屏下限制高度：16/6 的图在超宽容器里会变成一整屏的大色块。
   注意必须给 .viewport 确定高度（不能只给 max-height），
   否则 .slide/.lazy-image 会按图片固有比例撑高，底部（含标题字幕）被 overflow 裁掉。 */
@media (min-width: 1200px) {
  .viewport {
    height: clamp(340px, 26vw, 430px);
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
.caption {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: clamp(16px, 4vw, 36px);
  background: linear-gradient(transparent, rgba(8, 15, 30, 0.72));
  color: #fff;
}
.caption h2 {
  color: #fff;
  font-size: clamp(1.2rem, 3.4vw, 2rem);
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
.caption p {
  margin-top: 4px;
  opacity: 0.92;
  font-size: clamp(0.85rem, 2vw, 1rem);
}

.arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 42px;
  height: 42px;
  border: none;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.85);
  color: #1e293b;
  font-size: 1.5rem;
  line-height: 1;
  display: grid;
  place-items: center;
  box-shadow: var(--shadow-1);
  opacity: 0;
  transition: opacity var(--duration) var(--ease);
}
.carousel:hover .arrow,
.carousel:focus-within .arrow {
  opacity: 1;
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
  display: flex;
  gap: 6px;
}
.dot {
  width: 9px;
  height: 9px;
  padding: 0;
  border: none;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.5);
  transition: all var(--duration) var(--ease);
}
.dot.active {
  width: 24px;
  background: #fff;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--duration-slow) var(--ease);
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

/* 窄屏横幅只有 134px 高，42px 的箭头居中后（y 46–88）正好压住标题第一行，
   看起来像标题被糊了一块。触屏本来就能左右滑、右下角还有圆点，
   所以窄屏直接收起箭头；同时给字幕留出右侧位置，免得被圆点盖住。 */
@media (max-width: 600px) {
  .arrow {
    display: none;
  }
  .caption {
    padding-right: 88px;
  }
}
</style>
