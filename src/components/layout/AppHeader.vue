<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'

import SearchOverlay from '@/components/common/SearchOverlay.vue'
import ThemeToggle from '@/components/common/ThemeToggle.vue'
import { mainNav, moreNav } from '@/router'
import { useAuthStore } from '@/store/auth'

const route = useRoute()
const auth = useAuthStore()

const drawerOpen = ref(false)
const searchOpen = ref(false)

function closeDrawer() {
  drawerOpen.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeDrawer()
}
</script>

<template>
  <header class="site-header" @keydown="onKeydown">
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
        <button class="icon-btn" aria-label="全站搜索" title="搜索" @click="searchOpen = true">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2" />
            <path d="M16.5 16.5 21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
        <ThemeToggle />
        <RouterLink
          to="/admin"
          class="btn btn--soft btn--sm admin-btn"
          :title="auth.isLoggedIn ? '进入管理' : '投稿 / 管理'"
        >
          ✏️ 投稿
        </RouterLink>
        <button
          class="icon-btn menu-toggle"
          aria-label="打开菜单"
          :aria-expanded="drawerOpen"
          @click="drawerOpen = !drawerOpen"
        >
          <svg v-if="!drawerOpen" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
          <svg v-else viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 移动端抽屉 -->
    <transition name="drawer">
      <div v-if="drawerOpen" class="drawer-mask" @click.self="closeDrawer">
        <nav class="drawer" aria-label="更多菜单" role="dialog" aria-modal="true">
          <div class="drawer-head">
            <div class="drawer-profile">
              <span class="drawer-avatar" aria-hidden="true">2419</span>
              <div>
                <strong>{{ auth.isLoggedIn ? auth.username : '新屋岭中学2419班' }}</strong>
                <small>{{ auth.isLoggedIn ? '已登录管理员' : '聚是一团火，散是满天星' }}</small>
              </div>
            </div>
            <button class="icon-btn" aria-label="关闭菜单" @click="closeDrawer">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
            </button>
          </div>

          <RouterLink
            v-for="item in mainNav"
            :key="item.path"
            :to="item.path"
            class="drawer-link"
            :class="{ active: route.meta.nav === item.path }"
            @click="closeDrawer"
          >
            <span class="drawer-icon" aria-hidden="true">{{ item.icon }}</span>
            {{ item.title }}
            <span class="arrow" aria-hidden="true">›</span>
          </RouterLink>

          <p class="drawer-divider">更多</p>

          <RouterLink
            v-for="item in moreNav"
            :key="item.path"
            :to="item.path"
            class="drawer-link"
            @click="closeDrawer"
          >
            <span class="drawer-icon" aria-hidden="true">{{ item.icon }}</span>
            {{ item.title }}
            <span class="arrow" aria-hidden="true">›</span>
          </RouterLink>
        </nav>
      </div>
    </transition>

    <SearchOverlay v-model:open="searchOpen" />
  </header>
</template>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: var(--z-header);
  background: color-mix(in srgb, var(--card) 82%, transparent);
  backdrop-filter: blur(14px) saturate(1.4);
  -webkit-backdrop-filter: blur(14px) saturate(1.4);
  border-bottom: 1px solid var(--border);
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
  font-weight: 800;
  font-size: 0.78rem;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--primary) 40%, transparent);
}
.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
  min-width: 0;
}
.brand-text strong {
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.brand-text small {
  color: var(--text-3);
  font-size: 0.7rem;
  letter-spacing: 1px;
}

.main-nav {
  display: none;
  gap: var(--space-1);
  margin-left: var(--space-5);
  flex: 1;
}
.nav-link {
  padding: 0.45em 1em;
  border-radius: var(--radius-full);
  color: var(--text-2);
  font-weight: 600;
  font-size: 0.93rem;
  transition: all var(--duration-fast) var(--ease);
}
.nav-link:hover {
  color: var(--primary);
  background: var(--primary-soft);
}
.nav-link.active {
  color: var(--primary);
  background: var(--primary-soft);
  box-shadow: inset 0 0 0 1px var(--primary-soft-2);
}

/* 右侧操作区：不压缩 */
.header-actions {
  margin-left: auto;
  flex: none;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 统一圆形图标按钮 */
.icon-btn {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border: 1px solid transparent;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--text-2);
  transition: all var(--duration-fast) var(--ease);
}
.icon-btn:hover {
  background: var(--primary-soft);
  color: var(--primary);
  border-color: var(--primary-soft-2);
}
.icon-btn:active {
  transform: scale(0.92);
}

.admin-btn {
  border-radius: var(--radius-full);
}
.menu-toggle {
  display: grid;
}

/* 抽屉 */
.drawer-mask {
  position: fixed;
  inset: 0;
  background: var(--overlay);
  z-index: var(--z-drawer);
}
.drawer {
  position: absolute;
  top: 0;
  right: 0;
  width: min(300px, 84vw);
  height: 100%;
  background: var(--card);
  border-left: 1px solid var(--border);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: 2px;
  box-shadow: var(--shadow-3);
  overflow-y: auto;
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
  border-radius: var(--radius-sm);
  color: var(--text);
  font-weight: 600;
  font-size: 0.95rem;
  transition: all var(--duration-fast) var(--ease);
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
  font-size: 1rem;
  flex: none;
  transition: background var(--duration-fast) var(--ease);
}
.drawer-link:hover .drawer-icon,
.drawer-link.active .drawer-icon {
  background: var(--card);
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
  .menu-toggle {
    display: none;
  }
  .brand-text strong {
    font-size: 1.02rem;
  }
}
</style>
