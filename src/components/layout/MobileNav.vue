<script setup lang="ts">
import { useRoute } from 'vue-router'

import AppIcon from '@/components/common/AppIcon.vue'
import { bottomNav } from '@/router'
import { useUiStore } from '@/store/ui'

const route = useRoute()
const ui = useUiStore()
</script>

<template>
  <nav class="bottom-nav" aria-label="底部导航">
    <template v-for="item in bottomNav" :key="item.path">
      <button
        v-if="item.action === 'drawer'"
        type="button"
        class="bottom-link"
        :class="{ active: ui.drawerOpen }"
        aria-haspopup="dialog"
        :aria-expanded="ui.drawerOpen"
        @click="ui.toggleDrawer()"
      >
        <AppIcon class="bottom-icon" :name="ui.drawerOpen ? 'close' : item.icon" :size="21" />
        <span class="bottom-label">{{ item.title }}</span>
      </button>

      <RouterLink
        v-else
        :to="item.path"
        class="bottom-link"
        :class="{ active: route.meta.nav === item.path }"
        :aria-current="route.meta.nav === item.path ? 'page' : undefined"
      >
        <AppIcon class="bottom-icon" :name="item.icon" :size="21" />
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
  background: var(--header-bg);
  border-top: var(--header-bd-w) solid var(--line);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  backdrop-filter: var(--header-blur);
  -webkit-backdrop-filter: var(--header-blur);
}
[data-style='brutal'] .bottom-nav {
  border-top: 3px solid #111;
  background: #fffdf7;
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
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-3);
  font-family: inherit;
  font-size: 0.68rem;
  font-weight: 600;
  -webkit-tap-highlight-color: transparent;
  transition: color var(--dur-fast) var(--ease);
}
.bottom-icon {
  transition: transform var(--dur) var(--ease);
}
.bottom-link::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  width: 26px;
  height: 2px;
  transform: translateX(-50%) scaleX(0);
  background: var(--accent);
  transition: transform var(--dur) var(--ease);
}
.bottom-link.active {
  color: var(--accent-ink);
}
.bottom-link.active::before {
  transform: translateX(-50%) scaleX(1);
}
.bottom-link.active .bottom-icon {
  transform: translateY(-1px);
}

[data-style='japandi'] .bottom-link.active::before {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
}
[data-style='brutal'] .bottom-link.active {
  background: var(--accent);
  color: #111;
  font-weight: 900;
}
[data-style='brutal'] .bottom-link::before {
  display: none;
}
[data-style='legacy'] .bottom-link.active::before {
  height: 3px;
  width: 28px;
  border-radius: 0 0 999px 999px;
}

/* 校园：悬浮胶囊底栏，当前项是一块浅蓝圆角块 */
[data-style='campus'] .bottom-nav {
  left: 10px;
  right: 10px;
  bottom: calc(8px + env(safe-area-inset-bottom, 0px));
  padding-bottom: 0;
  border: 1.5px solid var(--campus-blue-l);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 10px 24px -12px rgba(47, 111, 168, 0.5);
  backdrop-filter: blur(10px) saturate(1.1);
  -webkit-backdrop-filter: blur(10px) saturate(1.1);
  overflow: hidden;
}
[data-style='campus'][data-theme='dark'] .bottom-nav {
  border-color: var(--line-2);
  background: rgba(24, 36, 48, 0.94);
  box-shadow: 0 10px 24px -10px rgba(0, 0, 0, 0.7);
}
[data-style='campus'] .bottom-link {
  margin: 6px 3px;
  min-height: calc(var(--bottom-nav-h) - 12px);
  border-radius: 999px;
  font-weight: 500;
}
[data-style='campus'] .bottom-link.active {
  background: var(--accent-soft);
  color: var(--campus-blue-d);
  font-weight: 700;
}
[data-style='campus'] .bottom-link.active::before {
  display: none;
}
[data-style='campus'][data-theme='dark'] .bottom-link.active {
  background: var(--accent-soft);
  color: var(--accent-ink);
}

@media (min-width: 768px) {
  .bottom-nav {
    display: none;
  }
}
</style>
