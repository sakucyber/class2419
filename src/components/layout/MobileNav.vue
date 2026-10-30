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

@media (min-width: 768px) {
  .bottom-nav {
    display: none;
  }
}
</style>
