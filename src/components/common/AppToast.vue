<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { toastState } from '@/utils/toast'
</script>

<template>
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="toastState.message" class="toast" role="status" aria-live="polite">
        <AppIcon class="icon" name="checkCircle" :size="16" :stroke-width="2" />
        <span>{{ toastState.message }}</span>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.toast {
  position: fixed;
  left: 50%;
  bottom: calc(var(--space-8) + env(safe-area-inset-bottom, 0px));
  z-index: var(--z-lightbox);
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  /* 水平居中靠 translateX(-50%)，但定位元素的可用宽度只有「50% 到右边缘」那一截，
     不加 max-content 会被挤成两行 */
  width: max-content;
  max-width: min(90vw, 460px);
  padding: 9px var(--space-4);
  border: var(--card-bd-w) solid var(--line);
  border-radius: var(--radius-pill);
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-3);
  font-size: var(--fs-sm);
  line-height: 1.5;
  transform: translateX(-50%);
  backdrop-filter: var(--surface-blur);
  -webkit-backdrop-filter: var(--surface-blur);
}
.icon {
  flex: none;
  color: var(--accent-ink);
}
@media (max-width: 767px) {
  .toast {
    bottom: calc(var(--bottom-nav-h) + 20px + env(safe-area-inset-bottom, 0px));
  }
}
[data-style='brutal'] .toast {
  border-width: 3px;
  border-color: #111;
  border-radius: 0;
  box-shadow: 5px 5px 0 #111;
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity var(--dur) var(--ease),
    transform var(--dur) var(--ease);
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 10px);
}
</style>
