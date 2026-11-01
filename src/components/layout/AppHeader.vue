<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import AppIcon from '@/components/common/AppIcon.vue'
import SearchOverlay from '@/components/common/SearchOverlay.vue'
import ThemeToggle from '@/components/common/ThemeToggle.vue'
import AppDrawer from '@/components/layout/AppDrawer.vue'
import StyleSwitcher from '@/components/layout/StyleSwitcher.vue'
import { classMark } from '@/config/styles'
import { mainNav } from '@/router'
import { useSettingsStore } from '@/store/settings'
import { useUiStore } from '@/store/ui'

const route = useRoute()
const settings = useSettingsStore()
const ui = useUiStore()

/** 徽标文字随风格变化：年鉴/日式/校园用「叁」，粗野用「19」，原版保留「2419」 */
const brandMark = computed(() => classMark(settings.settings.style))

/* 向下滚动时收起导航栏，向上滚动时立刻出现 */
const navHidden = ref(false)
let lastY = 0

function onScroll() {
  const y = window.scrollY
  navHidden.value = y > lastY && y > 140 && !ui.drawerOpen
  lastY = y
}

onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <header class="site-header" :class="{ hide: navHidden }">
    <div class="container header-inner">
      <RouterLink to="/" class="brand" aria-label="返回首页">
        <span class="brand-mark" aria-hidden="true">{{ brandMark }}</span>
        <span class="brand-text">
          <strong>新屋岭中学2419班</strong>
          <small>班级空间 · Class of 2027</small>
        </span>
      </RouterLink>

      <nav class="main-nav" aria-label="主导航">
        <RouterLink
          v-for="item in mainNav"
          :key="item.path"
          :to="item.path"
          class="nav-link"
          :class="{ active: route.meta.nav === item.path }"
          :aria-current="route.meta.nav === item.path ? 'page' : undefined"
        >
          {{ item.title }}
        </RouterLink>
      </nav>

      <div class="header-actions">
        <StyleSwitcher />
        <button
          class="icon-btn"
          type="button"
          aria-label="全站搜索"
          title="搜索"
          @click="ui.openSearch()"
        >
          <AppIcon name="search" :size="18" :stroke-width="1.9" />
        </button>
        <ThemeToggle />
        <button
          class="icon-btn menu-btn"
          type="button"
          aria-label="更多菜单"
          title="更多菜单"
          aria-haspopup="dialog"
          :aria-expanded="ui.drawerOpen"
          @click="ui.toggleDrawer()"
        >
          <AppIcon :name="ui.drawerOpen ? 'close' : 'menu'" :size="18" :stroke-width="1.9" />
        </button>
      </div>
    </div>
  </header>

  <AppDrawer />
  <SearchOverlay v-model:open="ui.searchOpen" />
</template>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: var(--z-header);
  background: var(--header-bg);
  border-bottom: var(--header-bd-w) solid var(--line);
  backdrop-filter: var(--header-blur);
  -webkit-backdrop-filter: var(--header-blur);
  transition:
    transform 0.45s var(--ease-out),
    background-color var(--dur) var(--ease);
}
.site-header.hide {
  transform: translateY(-100%);
}
[data-style='annual'] .site-header {
  box-shadow: 0 1px 0 rgba(22, 40, 61, 0.04);
}
[data-style='brutal'] .site-header {
  border-bottom: 3px solid #111;
}

.header-inner {
  height: var(--header-h);
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 0 1 auto;
  color: var(--text);
  overflow: hidden;
}
.brand:hover {
  color: var(--text);
}
.brand-mark {
  flex: none;
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border: var(--badge-bd-w) solid var(--line-2);
  border-radius: var(--radius-xs);
  background: var(--badge-bg);
  color: var(--badge-color);
  font-family: var(--font-display);
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  line-height: 1;
}
.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
  min-width: 0;
}
.brand-text strong {
  font-family: var(--font-display);
  font-size: 0.98rem;
  font-weight: var(--display-weight);
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.brand-text small {
  color: var(--text-3);
  font-size: 0.66rem;
  letter-spacing: 1.4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.main-nav {
  display: none;
  gap: 2px;
  margin-left: var(--space-5);
  flex: 1;
}
.nav-link {
  position: relative;
  padding: 0.5em 0.9em;
  border-radius: var(--radius-xs);
  color: var(--text-2);
  font-size: var(--fs-sm);
  font-weight: 600;
  letter-spacing: 0.3px;
  white-space: nowrap;
  transition:
    color var(--dur-fast) var(--ease),
    background-color var(--dur-fast) var(--ease);
}
.nav-link:hover {
  color: var(--accent-ink);
  background: var(--accent-soft);
}
.nav-link.active {
  color: var(--text);
}
.nav-link.active::after {
  content: '';
  position: absolute;
  left: 0.9em;
  right: 0.9em;
  bottom: 2px;
  height: 2px;
  background: var(--accent);
}

.header-actions {
  margin-left: auto;
  flex: none;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* ---------- 各风格的顶栏细节 ---------- */
[data-style='annual'] .brand-mark {
  border-color: var(--text);
  font-size: 1.15rem;
}
[data-style='annual'] .nav-link {
  border-radius: 0;
  letter-spacing: 0.8px;
}
[data-style='annual'] .nav-link.active::after {
  left: 0.9em;
  right: auto;
  width: 18px;
  height: 1px;
  background: var(--accent);
}

[data-style='japandi'] .brand-mark {
  border-radius: 50%;
  border-color: transparent;
  background: var(--sage);
  color: #fffefb;
}
[data-style='japandi'] .nav-link {
  border-radius: 999px;
}
[data-style='japandi'] .nav-link.active {
  color: var(--accent-ink);
  background: var(--accent-soft);
}
[data-style='japandi'] .nav-link.active::after {
  display: none;
}

[data-style='brutal'] .site-header {
  color: #111;
}
[data-style='brutal'][data-theme='dark'] .site-header,
[data-style='brutal'][data-theme='dark'] .brand-text strong,
[data-style='brutal'][data-theme='dark'] .brand-text small,
[data-style='brutal'][data-theme='dark'] .nav-link {
  /* 暗色主题的顶栏是深色，墨字会看不见；激活项仍是黑底黄字，保持撞色 */
  color: #f5f0e1;
}
[data-style='brutal'] .brand-text strong,
[data-style='brutal'] .brand-text small {
  color: #111;
}
[data-style='brutal'] .brand-mark {
  background: #111;
  color: var(--accent);
  border: 3px solid #111;
  box-shadow: 3px 3px 0 var(--accent-2);
  font-family: var(--font-display);
  font-weight: 900;
}
[data-style='brutal'] .nav-link {
  border: 3px solid transparent;
  border-radius: 0;
  font-weight: 900;
  color: #111;
}
[data-style='brutal'] .nav-link:hover {
  background: #111;
  color: var(--accent);
  border-color: #111;
}
[data-style='brutal'] .nav-link.active {
  background: #111;
  color: var(--accent);
  border-color: #111;
  box-shadow: 3px 3px 0 var(--accent-2);
}
[data-style='brutal'] .nav-link.active::after {
  display: none;
}
[data-style='brutal'] :deep(.icon-btn) {
  background: #fffdf7;
  border: 3px solid #111;
  color: #111;
  box-shadow: 2px 2px 0 #111;
}
[data-style='brutal'] :deep(.icon-btn:hover) {
  background: #111;
  color: var(--accent);
}

[data-style='legacy'] .nav-link {
  border-radius: 999px;
}
[data-style='legacy'] .nav-link.active {
  color: var(--accent-ink);
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 1px var(--accent-soft-2);
}
[data-style='legacy'] .nav-link.active::after {
  left: 50%;
  right: auto;
  bottom: 0;
  width: 18px;
  height: 2px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: var(--accent);
}

/* ---------- 校园：悬浮胶囊导航（示例网页的 .nav）----------
   顶栏自身透明，胶囊画在 .header-inner 上；这样滚动时内容从胶囊两侧穿过，
   视觉上是「浮在页面上的一颗胶囊」，而不是一条压边的横条。 */
[data-style='campus'] .site-header {
  padding-top: 10px;
  border-bottom: none;
}
[data-style='campus'] .header-inner {
  height: 62px;
  max-width: min(calc(var(--container-w) - 6px), 94%);
  padding: 0 14px;
  background: rgba(255, 255, 255, 0.92);
  border: 1.5px solid var(--campus-blue-l);
  border-radius: 999px;
  box-shadow: 0 6px 18px rgba(63, 125, 187, 0.1);
  backdrop-filter: blur(10px) saturate(1.1);
  -webkit-backdrop-filter: blur(10px) saturate(1.1);
  transition: box-shadow var(--dur) var(--ease);
}
[data-style='campus'][data-theme='dark'] .header-inner {
  background: rgba(24, 36, 48, 0.9);
  border-color: var(--line-2);
  box-shadow: 0 8px 22px -12px rgba(0, 0, 0, 0.72);
}
[data-style='campus'] .brand-mark {
  width: 40px;
  height: 40px;
  border-color: var(--campus-sun);
  font-family: var(--font-display);
  font-size: 1.05rem;
  letter-spacing: 0;
}
[data-style='campus'] .brand-text strong {
  font-family: var(--font-display);
  font-weight: 400;
  letter-spacing: 0.5px;
}
[data-style='campus'] .brand-text small {
  letter-spacing: 1.1px;
  color: var(--text-3);
}
[data-style='campus'] .nav-link {
  border-radius: 999px;
  font-weight: 500;
  color: var(--text-3);
}
[data-style='campus'] .nav-link:hover {
  color: var(--campus-blue-d);
  background: var(--campus-sky-1);
  transform: translateY(-1px);
}
[data-style='campus'] .nav-link.active {
  color: #fff;
  background: var(--campus-blue);
}
[data-style='campus'] .nav-link.active::after {
  display: none;
}
[data-style='campus'][data-theme='dark'] .nav-link:hover {
  color: var(--accent-ink);
  background: var(--accent-soft);
}
[data-style='campus'][data-theme='dark'] .nav-link.active {
  background: var(--accent);
  color: #0c1620;
}
[data-style='campus'] :deep(.icon-btn) {
  background: var(--surface);
  border-color: var(--campus-blue-l);
  color: var(--text-2);
}
[data-style='campus'] :deep(.icon-btn:hover) {
  background: var(--accent-soft);
  border-color: var(--campus-blue);
  color: var(--campus-blue-d);
}

@media (max-width: 420px) {
  .brand-mark {
    width: 34px;
    height: 34px;
  }
  .brand-text small {
    display: none;
  }
  .header-actions .icon-btn {
    width: 34px;
    height: 34px;
  }
}
@media (max-width: 380px) {
  .header-actions {
    gap: 4px;
  }
  .header-actions .icon-btn {
    width: 30px;
    height: 30px;
  }
  .brand-text strong {
    font-size: 0.88rem;
  }
}

@media (min-width: 900px) {
  .main-nav {
    display: flex;
  }
  .brand-text strong {
    font-size: 1.02rem;
  }
}

/* 校园的胶囊比通栏顶栏更吃水平空间：窄屏收紧内边距与字号，避免班名被省略号截断 */
@media (max-width: 520px) {
  [data-style='campus'] .header-inner {
    padding: 0 10px;
    gap: 6px;
  }
  [data-style='campus'] .brand-mark {
    width: 34px;
    height: 34px;
    font-size: 0.95rem;
  }
  [data-style='campus'] .brand-text strong {
    font-size: 0.92rem;
    letter-spacing: 0;
  }
}
/* 320px 级小屏（iPhone SE 一代等）：胶囊里实在放不下班名，只留「叁」徽章 */
@media (max-width: 340px) {
  [data-style='campus'] .brand-text {
    display: none;
  }
}
</style>
