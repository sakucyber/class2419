<script setup lang="ts">
/**
 * 基于 IntersectionObserver 的懒加载图片，自带骨架与错误态。
 *
 * 观察的是**容器**而不是 <img>：图片在加载完成前是 display:none，
 * 而 display:none 的元素没有盒子，观察器永远不会判定它进入视口 —— 会死锁。
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import AppIcon from '@/components/common/AppIcon.vue'
import { getImageSize } from '@/utils/image'

const props = withDefaults(
  defineProps<{
    src: string
    alt?: string
    srcset?: string
    sizes?: string
    aspect?: string
    radius?: string
    eager?: boolean
    /** LCP 图：加 fetchpriority="high"，让浏览器优先排这个请求 */
    priority?: boolean
    /** 固有宽高（px）：给 <img> 带上 width/height 属性。
     *  浏览器据此在图片解码前就预留好位置，避免加载完成时的布局跳动。 */
    width?: number
    height?: number
  }>(),
  {
    alt: '',
    aspect: '4 / 3',
    radius: 'var(--radius-sm)',
    srcset: '',
    sizes: '',
    width: undefined,
    height: undefined,
  },
)

const el = ref<HTMLImageElement | null>(null)
const root = ref<HTMLDivElement | null>(null)
const loaded = ref(false)
const failed = ref(false)
let entered = false
let observer: IntersectionObserver | null = null

/**
 * 固有尺寸：显式传入优先，否则查尺寸表。
 *
 * 有了 width/height，浏览器在图片解码前就能按比例预留空间，
 * 图片加载完成时容器不会跳动（CLS）。
 */
const intrinsic = computed(() => {
  if (props.width && props.height) return { width: props.width, height: props.height }
  const found = getImageSize(props.src)
  return found ?? { width: undefined, height: undefined }
})

function applySrc(target: HTMLImageElement) {
  if (props.srcset) target.srcset = props.srcset
  target.src = props.src
  if (props.sizes) target.sizes = props.sizes
}

/**
 * eager 图不走「探测 → 再赋真 src」的绕路：直接把 URL 交给 <img>，
 * 浏览器立刻知道请求目标与优先级（配 priority 时 fetchpriority=high），
 * LCP 不必等探测图转一圈。懒加载仍走探测，避免不可见元素抢带宽。
 */
function load() {
  if (loaded.value || failed.value) return
  if (props.eager && el.value) {
    applySrc(el.value)
    return
  }
  const probe = new Image()
  if (props.srcset) probe.srcset = props.srcset
  probe.src = props.src
  probe.onload = () => {
    loaded.value = true
    if (el.value) applySrc(el.value)
  }
  probe.onerror = () => {
    failed.value = true
  }
}

/** eager 路径：真 <img> 的 load / error 事件负责翻转状态 */
function onImgLoad() {
  loaded.value = true
}
function onImgError() {
  if (props.eager) failed.value = true
}

onMounted(() => {
  if (props.eager || !('IntersectionObserver' in window)) {
    entered = true
    load()
    return
  }
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        entered = true
        load()
        observer?.disconnect()
        observer = null
      }
    },
    { rootMargin: '220px' },
  )
  if (root.value) observer.observe(root.value)
})

watch(
  () => props.src,
  () => {
    loaded.value = false
    failed.value = false
    if (entered || props.eager) load()
  },
)

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div ref="root" class="lazy-image" :style="{ aspectRatio: aspect, borderRadius: radius }">
    <img
      v-show="loaded && !failed"
      ref="el"
      class="img"
      :alt="alt"
      :width="intrinsic.width"
      :height="intrinsic.height"
      decoding="async"
      :fetchpriority="priority ? 'high' : undefined"
      @load="onImgLoad"
      @error="onImgError"
    />
    <div v-if="!loaded && !failed" class="lazy-skeleton skeleton" aria-hidden="true"></div>
    <div v-if="failed" class="lazy-fail" role="img" :aria-label="`${alt || '图片'}加载失败`">
      <AppIcon name="image" :size="24" :stroke-width="1.35" />
      <small>图片加载失败</small>
    </div>
  </div>
</template>

<style scoped>
.lazy-image {
  position: relative;
  overflow: hidden;
  width: 100%;
  background: var(--bg-soft);
}
.img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition:
    transform var(--dur-slow) var(--ease),
    opacity var(--dur) var(--ease);
}
.img {
  animation: img-fade var(--dur) var(--ease);
}
@keyframes img-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.lazy-skeleton,
.lazy-fail {
  position: absolute;
  inset: 0;
  border-radius: inherit;
}
.lazy-fail {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--text-3);
  background: var(--bg-soft);
  font-size: var(--fs-2xs);
}
</style>
