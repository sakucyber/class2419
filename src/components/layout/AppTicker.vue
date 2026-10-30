<script setup lang="ts">
/**
 * 滚动公告条。
 *
 * 设计规范要求三条风格各自有一条公告条（墨蓝底白字 / 浅陶土底陶土字 / 黑底黄字），
 * 所以它被做成独立组件：内容只有一份，配色由皮肤令牌决定。
 *
 * 关键行为：**只有内容宽度超过视口时才滚动**。
 * 早先无条件复制一份用于无缝循环，结果宽屏下（两条短公告）第一组和副本同时可见，
 * 看起来像公告重复了三遍。现在先量宽度：装得下就静态展示，装不下才复制并动画。
 *
 * 无障碍：副本整体 aria-hidden；悬停、键盘聚焦、关闭动效或系统「减少动效」时暂停。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import AppIcon from '@/components/common/AppIcon.vue'
import { useContentStore } from '@/store/content'

const content = useContentStore()
const items = computed(() => content.publicAnnouncements.slice(0, 5))

const viewport = ref<HTMLElement | null>(null)
const group = ref<HTMLElement | null>(null)
const looping = ref(false)
const duration = ref(30)
let observer: ResizeObserver | null = null

function measure() {
  const vp = viewport.value
  const gp = group.value
  if (!vp || !gp) return
  // +2px 容差：亚像素取整会让「刚好装下」误判为溢出
  const overflow = gp.scrollWidth > vp.clientWidth + 2
  looping.value = overflow
  // 速度约 55px/s，短内容不至于一闪而过，长内容也不会太慢
  duration.value = Math.min(70, Math.max(18, Math.round(gp.scrollWidth / 55)))
}

async function refresh() {
  await nextTick()
  measure()
}

onMounted(() => {
  void refresh()
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(() => measure())
    if (viewport.value) observer.observe(viewport.value)
    if (group.value) observer.observe(group.value)
  }
})

watch(items, () => void refresh())

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div v-if="items.length" class="ticker" role="region" aria-label="班级公告滚动条">
    <span class="ticker__label">
      <AppIcon name="pin" :size="12" :stroke-width="2" aria-hidden="true" />
      公告
    </span>
    <div ref="viewport" class="ticker__viewport">
      <div
        class="ticker__track"
        :class="{ 'is-looping': looping }"
        :style="looping ? { animationDuration: `${duration}s` } : undefined"
      >
        <div ref="group" class="ticker__group">
          <RouterLink v-for="n in items" :key="n.id" class="ticker__item" to="/#notices">
            {{ n.title }}
            <span class="ticker__dot" aria-hidden="true">·</span>
          </RouterLink>
        </div>
        <div v-if="looping" class="ticker__group" aria-hidden="true">
          <RouterLink
            v-for="n in items"
            :key="`dup-${n.id}`"
            class="ticker__item"
            to="/#notices"
            tabindex="-1"
          >
            {{ n.title }}
            <span class="ticker__dot" aria-hidden="true">·</span>
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ticker {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: stretch;
  height: 30px;
  overflow: hidden;
  background: var(--text);
  color: var(--bg);
  border-bottom: 1px solid var(--line);
}
.ticker__label {
  flex: none;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 12px;
  background: rgba(255, 255, 255, 0.1);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 1.5px;
}
.ticker__viewport {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}
.ticker__track {
  display: flex;
  width: max-content;
  height: 100%;
}
.ticker__track.is-looping {
  animation: ticker-scroll linear infinite;
}
.ticker:hover .ticker__track,
.ticker:focus-within .ticker__track {
  animation-play-state: paused;
}
.ticker__group {
  display: flex;
  align-items: center;
  flex: none;
}
.ticker__item {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  color: inherit;
  font-size: 0.72rem;
  letter-spacing: 1px;
  white-space: nowrap;
  opacity: 0.92;
}
.ticker__item:hover {
  color: inherit;
  opacity: 1;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.ticker__dot {
  opacity: 0.45;
}

@keyframes ticker-scroll {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}

/* 关闭动效：不位移，改成可横向滚动的静态条 */
html.no-animations .ticker__track.is-looping {
  animation: none;
}
html.no-animations .ticker__viewport {
  overflow-x: auto;
}
html.no-animations .ticker__group[aria-hidden='true'] {
  display: none;
}
@media (prefers-reduced-motion: reduce) {
  .ticker__track.is-looping {
    animation: none;
  }
  .ticker__viewport {
    overflow-x: auto;
  }
  .ticker__group[aria-hidden='true'] {
    display: none;
  }
}

/* 年鉴暗色：不做成亮色反白条（夜里太刺眼），改用略亮的墨面 + 米色字 */
[data-style='annual'][data-theme='dark'] .ticker {
  background: #23272e;
  color: #ece7dd;
  border-bottom-color: #3d434c;
}

/* ---- 风格：日式浅陶土底 ---- */
[data-style='japandi'] .ticker {
  background: var(--accent-soft);
  color: var(--accent-ink);
  border-bottom-color: transparent;
}
[data-style='japandi'] .ticker__label {
  background: rgba(168, 95, 67, 0.12);
  letter-spacing: 1px;
}
[data-style='japandi'] .ticker__item {
  font-weight: 500;
  letter-spacing: 0.8px;
}

/* ---- 风格：粗野黑底黄字 ---- */
[data-style='brutal'] .ticker {
  background: #111;
  color: var(--accent);
  border-bottom: 3px solid #111;
  height: 32px;
}
[data-style='brutal'] .ticker__label {
  background: var(--accent);
  color: #111;
  font-weight: 900;
}
[data-style='brutal'] .ticker__item {
  font-weight: 900;
  letter-spacing: 0.5px;
  opacity: 1;
}

/* ---- 风格：原版浅底主色字 ---- */
[data-style='legacy'] .ticker {
  background: var(--accent-soft);
  color: var(--accent-ink);
  border-bottom-color: transparent;
}
[data-style='legacy'] .ticker__label {
  background: var(--accent-soft-2);
}
[data-style='legacy'] .ticker__item {
  font-weight: 600;
  letter-spacing: 0.5px;
}
</style>
