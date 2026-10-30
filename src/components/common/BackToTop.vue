<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

import AppIcon from '@/components/common/AppIcon.vue'

const visible = ref(false)

function update() {
  visible.value = window.scrollY > 520
}

function toTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  update()
  window.addEventListener('scroll', update, { passive: true })
})
onBeforeUnmount(() => window.removeEventListener('scroll', update))
</script>

<template>
  <Teleport to="body">
    <Transition name="btt">
      <button
        v-if="visible"
        class="btt"
        type="button"
        aria-label="回到顶部"
        title="回到顶部"
        @click="toTop"
      >
        <AppIcon name="arrowUp" :size="18" :stroke-width="2.1" />
      </button>
    </Transition>
  </Teleport>
</template>

<style scoped>
.btt {
  position: fixed;
  right: clamp(16px, 3vw, 32px);
  bottom: clamp(16px, 3vw, 32px);
  z-index: 90;
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border: var(--card-bd-w) solid var(--line);
  border-radius: var(--radius-xs);
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--card-shadow);
  transition:
    transform var(--dur) var(--ease),
    box-shadow var(--dur) var(--ease);
}
.btt:hover {
  transform: translateY(-2px);
  box-shadow: var(--hover-shadow);
  color: var(--accent-ink);
  border-color: var(--line-hover);
}
[data-style='annual'] .btt {
  background: var(--text);
  color: var(--bg);
  border-color: var(--text);
}
[data-style='japandi'] .btt {
  border-radius: 50%;
  background: var(--sage);
  color: #fffefb;
  border-color: transparent;
}
[data-style='japandi'] .btt:hover {
  color: #fffefb;
}
[data-style='brutal'] .btt {
  border: 3px solid #111;
  background: var(--accent);
  color: #111;
  box-shadow: 4px 4px 0 #111;
}
[data-style='brutal'] .btt:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 #111;
}
[data-style='legacy'] .btt {
  border: none;
  border-radius: 999px;
  background: var(--accent-gradient);
  color: #fff;
  box-shadow: 0 6px 24px var(--glow);
}

@media (max-width: 767px) {
  .btt {
    bottom: calc(var(--bottom-nav-h) + 16px + env(safe-area-inset-bottom, 0px));
    width: 42px;
    height: 42px;
  }
}

.btt-enter-active,
.btt-leave-active {
  transition:
    opacity var(--dur) var(--ease),
    transform var(--dur) var(--ease);
}
.btt-enter-from,
.btt-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
