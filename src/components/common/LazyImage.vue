<script setup lang="ts">
/**
 * 基于 IntersectionObserver 的懒加载图片，自带骨架与错误态。
 *
 * 观察的是**容器**而不是 <img>：图片在加载完成前是 display:none，
 * 而 display:none 的元素没有盒子，观察器永远不会判定它进入视口 —— 会死锁。
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

import AppIcon from '@/components/common/AppIcon.vue'

const props = withDefaults(
  defineProps<{
    src: string
    alt?: string
    srcset?: string
    sizes?: string
    aspect?: string
    radius?: string
    eager?: boolean
  }>(),
  { alt: '', aspect: '4 / 3', radius: 'var(--radius-sm)', srcset: '', sizes: '' },
)

const el = ref<HTMLImageElement | null>(null)
const root = ref<HTMLDivElement | null>(null)
const loaded = ref(false)
const failed = ref(false)
let entered = false
let observer: IntersectionObserver | null = null

function load() {
  if (loaded.value || failed.value) return
  const probe = new Image()
  if (props.srcset) probe.srcset = props.srcset
  probe.src = props.src
  probe.onload = () => {
    loaded.value = true
    if (el.value) {
      el.value.src = props.src
      if (props.srcset) el.value.srcset = props.srcset
      if (props.sizes) el.value.sizes = props.sizes
    }
  }
  probe.onerror = () => {
    failed.value = true
  }
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
    <img v-show="loaded && !failed" ref="el" class="img" :alt="alt" decoding="async" />
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
