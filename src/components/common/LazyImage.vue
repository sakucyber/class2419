<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

/** 基于 IntersectionObserver 的懒加载图片，自带骨架与错误态 */
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
const loaded = ref(false)
const failed = ref(false)
let observer: IntersectionObserver | null = null

function load() {
  if (loaded.value || failed.value) return
  const img = new Image()
  if (props.srcset) img.srcset = props.srcset
  img.src = props.src
  img.onload = () => {
    loaded.value = true
    if (el.value) {
      el.value.src = props.src
      if (props.srcset) el.value.srcset = props.srcset
      if (props.sizes) el.value.sizes = props.sizes
    }
  }
  img.onerror = () => {
    failed.value = true
  }
}

onMounted(() => {
  if (props.eager) {
    load()
    return
  }
  if (!('IntersectionObserver' in window)) {
    load()
    return
  }
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        load()
        observer?.disconnect()
        observer = null
      }
    },
    { rootMargin: '200px' },
  )
  if (el.value) observer.observe(el.value)
})

watch(
  () => props.src,
  () => {
    loaded.value = false
    failed.value = false
    if (props.eager) load()
  },
)

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div class="lazy-image" :style="{ aspectRatio: aspect, borderRadius: radius }">
    <img
      v-show="loaded && !failed"
      ref="el"
      class="img"
      :alt="alt"
      :aria-label="alt"
      decoding="async"
    />
    <div v-if="!loaded && !failed" class="lazy-skeleton skeleton" aria-hidden="true"></div>
    <div v-if="failed" class="lazy-fail" role="img" :aria-label="`${alt || '图片'}加载失败`">
      <span aria-hidden="true">🖼️</span>
      <small>图片加载失败</small>
    </div>
  </div>
</template>

<style scoped>
.lazy-image {
  position: relative;
  overflow: hidden;
  background: var(--bg-soft);
  width: 100%;
}
.img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition:
    transform var(--duration-slow) var(--ease),
    opacity var(--duration) var(--ease);
}
.lazy-skeleton,
.lazy-fail {
  position: absolute;
  inset: 0;
}
.lazy-fail {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--text-3);
  background: var(--bg-soft);
  font-size: 0.8rem;
}
</style>
