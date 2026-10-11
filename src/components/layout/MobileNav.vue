<script setup lang="ts">
import { useRoute } from 'vue-router'

import { bottomNav } from '@/router'
import { useUiStore } from '@/store/ui'

const route = useRoute()
const ui = useUiStore()
</script>

<template>
  <nav class="bottom-nav" aria-label="底部导航">
    <template v-for="item in bottomNav" :key="item.path">
      <!-- 「更多」不再跳转 /about，而是打开右侧抽屉菜单 -->
      <button
        v-if="item.action === 'drawer'"
        type="button"
        class="bottom-link"
        :class="{ active: ui.drawerOpen }"
        aria-haspopup="dialog"
        :aria-expanded="ui.drawerOpen"
        @click="ui.toggleDrawer()"
      >
        <span class="bottom-icon" aria-hidden="true">{{ ui.drawerOpen ? '✕' : item.icon }}</span>
        <span class="bottom-label">{{ item.title }}</span>
      </button>

      <RouterLink
        v-else
        :to="item.path"
        class="bottom-link"
        :class="{ active: route.meta.nav === item.path }"
        :aria-current="route.meta.nav === item.path ? 'page' : undefined"
      >
        <span class="bottom-icon" aria-hidden="true">{{ item.icon }}</span>
        <span class="bottom-label">{{ item.title }}</span>
      </RouterLink>
    </template>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: var(--z-header);
  display: flex;
  background: color-mix(in srgb, var(--card) 90%, transparent);
  backdrop-filter: blur(14px) saturate(1.4);
  -webkit-backdrop-filter: blur(14px) saturate(1.4);
  border-top: 1px solid var(--border);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.bottom-link {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-height: var(--bottom-nav-h);
  color: var(--text-3);
  font-size: 0.68rem;
  font-weight: 600;
  font-family: inherit;
  /* button 复位 */
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: color var(--duration-fast) var(--ease);
}
.bottom-icon {
  font-size: 1.2rem;
  line-height: 1;
  transition: transform var(--duration-fast) var(--ease);
}
.bottom-link::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%) scaleX(0);
  width: 28px;
  height: 3px;
  border-radius: 0 0 var(--radius-full) var(--radius-full);
  background: var(--primary-gradient);
  transition: transform var(--duration) var(--ease);
}
.bottom-link.active {
  color: var(--primary);
}
.bottom-link.active::before {
  transform: translateX(-50%) scaleX(1);
}
.bottom-link.active .bottom-icon {
  transform: translateY(-2px) scale(1.12);
}

@media (min-width: 768px) {
  .bottom-nav {
    display: none;
  }
}
</style>
