<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const progress = ref(0)

function update() {
  const doc = document.documentElement
  const max = doc.scrollHeight - doc.clientHeight
  progress.value = max > 0 ? Math.min(1, doc.scrollTop / max) : 0
}

onMounted(() => {
  update()
  window.addEventListener('scroll', update, { passive: true })
  window.addEventListener('resize', update)
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', update)
  window.removeEventListener('resize', update)
})
</script>

<template>
  <Teleport to="body">
    <div class="scroll-progress" aria-hidden="true">
      <div class="bar" :style="{ transform: `scaleX(${progress})` }"></div>
    </div>
  </Teleport>
</template>

<style scoped>
.scroll-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  z-index: 200;
  pointer-events: none;
}
.bar {
  height: 100%;
  transform-origin: left center;
  background: var(--primary-gradient);
  box-shadow: 0 0 12px var(--glow);
  transition: transform 0.1s linear;
}
</style>
