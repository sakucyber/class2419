<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import AppIcon from '@/components/common/AppIcon.vue'
import SearchOverlay from '@/components/common/SearchOverlay.vue'
import ThemeToggle from '@/components/common/ThemeToggle.vue'
import { mainNav, moreNav } from '@/router'
import { useAuthStore } from '@/store/auth'
import { useSettingsStore } from '@/store/settings'
import { useUiStore } from '@/store/ui'

const route = useRoute()
const auth = useAuthStore()
const settings = useSettingsStore()
const ui = useUiStore()

const drawerEl = ref<HTMLElement | null>(null)
let lastFocused: HTMLElement | null = null

const THEME_ORDER = ['auto', 'light', 'dark'] as const
const themeIcon = () =>
  ({ auto: 'monitor', light: 'sun', dark: 'moon' })[settings.settings.theme] as
    | 'monitor'
    | 'sun'
    | 'moon'

function closeDrawer() {
  ui.closeDrawer()
}

function cycleTheme() {
  const idx = THEME_ORDER.indexOf(settings.settings.theme)
  settings.settings.theme = THEME_ORDER[(idx + 1) % THEME_ORDER.length]
}

function scrollTop() {
  closeDrawer()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function openSearch() {
  closeDrawer()
  ui.openSearch()
}

/* Escape 关闭：挂在 window 上，抽屉打开时即使焦点在链接上也能生效 */
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && ui.drawerOpen) closeDrawer()
}

/* 抽屉展开时锁定滚动、移入焦点；关闭时把焦点还给触发按钮 */
watch(
  () => ui.drawerOpen,
  async (open) => {
    if (open) {
      lastFocused = (document.activeElement as HTMLElement) ?? null
      await nextTick()
      drawerEl.value?.focus()
    } else {
      lastFocused?.focus?.()
      lastFocused = null
    }
  },
)

/* 路由变化时自动收起抽屉 */
watch(
  () => route.fullPath,
  () => closeDrawer(),
)

/* 向下滚动时收起导航栏，向上滚动时立刻出现 */
const navHidden = ref(false)
let lastY = 0
function onScroll() {
  const y = window.scrollY
  navHidden.value = y > lastY && y > 120 && !ui.drawerOpen
  lastY = y
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <header class="site-header" :class="{ hide: navHidden }">
    <div class="container header-inner">
      <RouterLink to="/" class="brand" aria-label="返回首页">
        <span class="brand-badge" aria-hidden="true">2419</span>
        <span class="brand-text">
          <strong>新屋岭中学2419班</strong>
          <small>班级空间</small>
        </span>
      </RouterLink>

      <nav class="main-nav" aria-label="主导航">
        <RouterLink
          v-for="item in mainNav"
          :key="item.path"
          :to="item.path"
          class="nav-link"
          :class="{ active: route.meta.nav === item.path }"
        >
          {{ item.title }}
        </RouterLink>
      </nav>

      <div class="header-actions">
        <button class="icon-btn" aria-label="全站搜索" title="搜索" @click="ui.openSearch()">
          <AppIcon name="search" :size="18" :stroke-width="2" />
        </button>
        <ThemeToggle />
        <button
          class="icon-btn menu-toggle"
          aria-label="更多菜单"
          title="更多菜单"
          aria-haspopup="dialog"
          :aria-expanded="ui.drawerOpen"
          @click="ui.toggleDrawer()"
        >
          <AppIcon :name="ui.drawerOpen ? 'close' : 'menu'" :size="18" :stroke-width="2" />
        </button>
      </div>
    </div>
  </header>

  <!--
    注意：抽屉必须 Teleport 到 body。
    .site-header 用了 backdrop-filter，它会让 position:fixed 的子孙以 header 为包含块，
    抽屉留在 header 内会只剩 60px 高，菜单项全部被裁掉。
  -->
  <Teleport to="body">
    <transition name="drawer">
      <div v-if="ui.drawerOpen" class="drawer-mask" @click.self="closeDrawer">
        <nav
          ref="drawerEl"
          class="drawer"
          tabindex="-1"
          role="dialog"
          aria-modal="true"
          aria-label="更多菜单"
        >
          <div class="drawer-head">
            <div class="drawer-profile">
              <span class="drawer-avatar" aria-hidden="true">2419</span>
              <div class="drawer-profile-text">
                <strong>{{ auth.isLoggedIn ? auth.username : '新屋岭中学2419班' }}</strong>
                <small>{{ auth.isLoggedIn ? '已登录管理员' : '聚是一团火，散是满天星' }}</small>
              </div>
            </div>
            <button class="icon-btn" aria-label="关闭菜单" @click="closeDrawer">
              <AppIcon name="close" :size="18" :stroke-width="2" />
            </button>
          </div>

          <p class="drawer-divider">浏览</p>
          <RouterLink
            v-for="item in mainNav"
            :key="item.path"
            :to="item.path"
            class="drawer-link"
            :class="{ active: route.meta.nav === item.path }"
            @click="closeDrawer"
          >
            <span class="drawer-icon" aria-hidden="true">
              <AppIcon :name="item.icon" :size="18" />
            </span>
            {{ item.title }}
            <span class="arrow" aria-hidden="true">›</span>
          </RouterLink>

          <p class="drawer-divider">更多</p>
          <RouterLink
            v-for="item in moreNav"
            :key="item.path"
            :to="item.path"
            class="drawer-link"
            :class="{ active: route.meta.nav === item.path }"
            @click="closeDrawer"
          >
            <span class="drawer-icon" aria-hidden="true">
              <AppIcon :name="item.icon" :size="18" />
            </span>
            {{ item.title }}
            <span class="arrow" aria-hidden="true">›</span>
          </RouterLink>

          <p class="drawer-divider">快捷操作</p>
          <div class="drawer-quick">
            <button type="button" class="quick-btn" @click="openSearch">
              <AppIcon class="q-icon" name="search" :size="19" />
              全站搜索
            </button>
            <button type="button" class="quick-btn" @click="cycleTheme">
              <AppIcon class="q-icon" :name="themeIcon()" :size="19" />
              切换主题
            </button>
            <button type="button" class="quick-btn" @click="scrollTop">
              <AppIcon class="q-icon" name="arrowUp" :size="19" />
              回到顶部
            </button>
          </div>

          <p class="drawer-foot">新屋岭中学2419班 · 班级空间</p>
        </nav>
      </div>
    </transition>
  </Teleport>

  <SearchOverlay v-model:open="ui.searchOpen" />
</template>

<style scoped>
/* 用 sticky 而非 fixed：隐藏时只是 transform 移出视口，不改变文档流，内容不会跳动 */
.site-header {
  position: sticky;
  top: 0;
  z-index: var(--z-header);
  background: color-mix(in srgb, var(--bg) 55%, transparent);
  backdrop-filter: blur(30px) saturate(1.8);
  -webkit-backdrop-filter: blur(30px) saturate(1.8);
  border-bottom: 1px solid var(--border);
  transition:
    transform 0.5s var(--ease-out-expo),
    background-color var(--duration) var(--ease-out-quart);
}
.site-header.hide {
  transform: translateY(-100%);
}

.header-inner {
  height: var(--header-h);
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

/* 品牌：可收缩，防止小屏溢出 */
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text);
  min-width: 0;
  flex: 0 1 auto;
  overflow: hidden;
}
.brand:hover {
  color: var(--text);
}
.brand-badge {
  flex: none;
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: var(--primary-gradient);
  color: #fff;
  font-weight: 900;
  font-size: 0.76rem;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 14px var(--glow);
  transition: transform var(--duration) var(--ease-spring);
}
.brand:hover .brand-badge {
  transform: scale(1.08) rotate(-6deg);
}
.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
  min-width: 0;
}
.brand-text strong {
  font-family: var(--font-display);
  font-size: 1rem;
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.brand-text small {
  color: var(--text-3);
  font-size: 0.68rem;
  letter-spacing: 2px;
}

.main-nav {
  display: none;
  gap: var(--space-1);
  margin-left: var(--space-5);
  flex: 1;
}
.nav-link {
  position: relative;
  padding: 0.45em 1.05em;
  border-radius: var(--radius-full);
  color: var(--text-2);
  font-weight: 700;
  font-size: 0.84rem;
  letter-spacing: 0.3px;
  transition: all var(--duration) var(--ease-spring);
}
.nav-link:hover {
  color: var(--primary);
  background: var(--primary-soft);
  transform: translateY(-2px);
}
.nav-link.active {
  color: var(--primary);
  background: var(--primary-soft);
  box-shadow: inset 0 0 0 1px var(--primary-soft-2);
}
.nav-link.active::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -1px;
  width: 18px;
  height: 2px;
  border-radius: var(--radius-full);
  background: var(--primary-gradient);
  transform: translateX(-50%);
}

/* 右侧操作区：不压缩 */
.header-actions {
  margin-left: auto;
  flex: none;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 统一圆形图标按钮：玻璃底 + spring 反馈 */
.icon-btn {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  background: var(--bg-soft);
  color: var(--text-2);
  transition: all var(--duration) var(--ease-spring);
}
.icon-btn:hover {
  background: var(--primary-soft);
  color: var(--primary);
  border-color: var(--primary-soft-2);
  transform: scale(1.1) rotate(-8deg);
}
.icon-btn:active {
  transform: scale(0.92);
}

.menu-toggle {
  display: grid;
}

/* ---------- 抽屉（Teleport 到 body） ---------- */
.drawer-mask {
  position: fixed;
  inset: 0;
  z-index: var(--z-drawer);
  background: var(--overlay);
  overscroll-behavior: contain;
}
.drawer {
  position: absolute;
  top: 0;
  right: 0;
  width: min(320px, 86vw);
  height: 100%;
  max-height: 100%;
  background: color-mix(in srgb, var(--bg) 78%, transparent);
  backdrop-filter: blur(30px) saturate(1.8);
  -webkit-backdrop-filter: blur(30px) saturate(1.8);
  border-left: 1px solid var(--border);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: 2px;
  box-shadow: var(--shadow-3);
  overflow-y: auto;
  overscroll-behavior: contain;
  outline: none;
  padding-bottom: calc(var(--space-6) + env(safe-area-inset-bottom, 0px));
}
.drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding-bottom: var(--space-4);
  margin-bottom: var(--space-2);
  border-bottom: 1px solid var(--border);
}
.drawer-profile {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}
.drawer-profile-text {
  min-width: 0;
}
.drawer-profile-text strong {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.95rem;
}
.drawer-profile small {
  display: block;
  color: var(--text-3);
  font-size: 0.72rem;
  margin-top: 2px;
}
.drawer-avatar {
  flex: none;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: var(--primary-gradient);
  color: #fff;
  font-weight: 800;
  font-size: 0.72rem;
}
.drawer-link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 12px 12px;
  border-radius: var(--radius-md);
  color: var(--text);
  font-weight: 600;
  font-size: 0.95rem;
  transition: all var(--duration) var(--ease-spring);
}
.drawer-link:hover {
  transform: translateX(4px);
}
.drawer-link:hover,
.drawer-link.active {
  background: var(--primary-soft);
  color: var(--primary);
}
.drawer-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: var(--bg-soft);
  color: var(--text-2);
  flex: none;
  transition: all var(--duration) var(--ease-out-quart);
}
.drawer-link:hover .drawer-icon,
.drawer-link.active .drawer-icon {
  background: var(--primary-soft);
  color: var(--primary);
}
.arrow {
  margin-left: auto;
  color: var(--text-3);
  font-size: 1.1rem;
}
.drawer-divider {
  margin: var(--space-3) 12px 4px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 2px;
  color: var(--text-3);
}

/* 快捷操作 */
.drawer-quick {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);
  margin-top: var(--space-1);
}
.quick-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 4px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-soft);
  color: var(--text-2);
  font-size: 0.74rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease);
}
.quick-btn:hover {
  background: var(--primary-soft);
  border-color: var(--primary-soft-2);
  color: var(--primary);
}
.quick-btn:active {
  transform: scale(0.96);
}
.q-icon {
  color: var(--text-2);
  transition: color var(--duration) var(--ease-out-quart);
}
.quick-btn:hover .q-icon {
  color: var(--primary);
}

.drawer-foot {
  margin: auto 0 0;
  padding-top: var(--space-5);
  text-align: center;
  color: var(--text-3);
  font-size: 0.72rem;
}

.drawer-enter-active,
.drawer-leave-active {
  transition: opacity var(--duration) var(--ease);
}
.drawer-enter-active .drawer,
.drawer-leave-active .drawer {
  transition: transform var(--duration) var(--ease);
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}
.drawer-enter-from .drawer,
.drawer-leave-to .drawer {
  transform: translateX(40px);
}

@media (max-width: 420px) {
  .brand-badge {
    width: 34px;
    height: 34px;
    font-size: 0.7rem;
    border-radius: 10px;
  }
  .brand-text small {
    display: none;
  }
  .icon-btn {
    width: 34px;
    height: 34px;
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
</style>
