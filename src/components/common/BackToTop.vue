<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const visible = ref(false)

function update() {
  visible.value = window.scrollY > 500
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
    <transition name="btt">
      <button
        v-if="visible"
        class="btt"
        type="button"
        aria-label="回到顶部"
        title="回到顶部"
        @click="toTop"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            d="M12 19V5M6 11l6-6 6 6"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </transition>
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
  border: none;
  border-radius: var(--radius-full);
  background: var(--primary-gradient);
  color: #fff;
  box-shadow: 0 6px 24px var(--glow);
  transition:
    transform var(--duration) var(--ease-spring),
    box-shadow var(--duration) var(--ease-out-quart);
}
.btt:hover {
  transform: translateY(-5px) scale(1.08);
  box-shadow: 0 10px 30px var(--glow);
}
.btt:active {
  transform: scale(0.94);
}

/* 移动端避开底部导航 */
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
    opacity var(--duration) var(--ease-out-quart),
    transform var(--duration) var(--ease-spring);
}
.btt-enter-from,
.btt-leave-to {
  opacity: 0;
  transform: translateY(24px) scale(0.9);
}
</style>
