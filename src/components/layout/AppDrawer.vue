<script setup lang="ts">
/**
 * 右侧抽屉「更多」。
 *
 * 必须 Teleport 到 body：.site-header 使用了 backdrop-filter，
 * 它会让 position:fixed 的子孙以 header 为包含块，抽屉留在 header 内会被裁成 60px 高。
 */
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import AppIcon from '@/components/common/AppIcon.vue'
import { classMark, STYLE_OPTIONS, THEME_BY_KEY } from '@/config/styles'
import { mainNav, moreNav } from '@/router'
import { useSettingsStore } from '@/store/settings'
import { useUiStore } from '@/store/ui'
import { useFocusTrap } from '@/utils/overlay'

const route = useRoute()
const ui = useUiStore()
const settings = useSettingsStore()
const drawerEl = ref<HTMLElement | null>(null)

useFocusTrap(drawerEl, () => ui.drawerOpen, { onEscape: () => ui.closeDrawer() })

const theme = computed(() => THEME_BY_KEY[settings.settings.theme])
const mark = computed(() => classMark(settings.settings.style))

/** 抽屉里的两组导航：浏览（主菜单）与更多（收藏 / 设置） */
const navGroups = [
  { label: '浏览', items: mainNav },
  { label: '更多', items: moreNav },
]

watch(
  () => route.fullPath,
  () => ui.closeDrawer(),
)

function scrollTop() {
  ui.closeDrawer()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function openSearch() {
  ui.closeDrawer()
  ui.openSearch()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="ui.drawerOpen" class="mask" @click.self="ui.closeDrawer()">
        <nav
          ref="drawerEl"
          class="drawer"
          tabindex="-1"
          role="dialog"
          aria-modal="true"
          aria-label="更多菜单"
        >
          <header class="head">
            <div class="profile">
              <span class="avatar" aria-hidden="true">{{ mark }}</span>
              <div class="profile-text">
                <strong>新屋岭中学2419班</strong>
                <small>聚是一团火，散是满天星</small>
              </div>
            </div>
            <button class="icon-btn" type="button" aria-label="关闭菜单" @click="ui.closeDrawer()">
              <AppIcon name="close" :size="18" :stroke-width="2" />
            </button>
          </header>

          <template v-for="group in navGroups" :key="group.label">
            <p class="group-label">{{ group.label }}</p>
            <RouterLink
              v-for="item in group.items"
              :key="item.path"
              :to="item.path"
              class="link"
              :class="{ active: route.meta.nav === item.path }"
              :aria-current="route.meta.nav === item.path ? 'page' : undefined"
              @click="ui.closeDrawer()"
            >
              <span class="link-icon" aria-hidden="true">
                <AppIcon :name="item.icon" :size="18" />
              </span>
              {{ item.title }}
              <AppIcon class="arrow" name="chevronRight" :size="15" />
            </RouterLink>
          </template>

          <p class="group-label">视觉风格</p>
          <div class="styles" role="group" aria-label="视觉风格">
            <button
              v-for="option in STYLE_OPTIONS"
              :key="option.key"
              type="button"
              class="style-chip"
              :class="{ active: settings.settings.style === option.key }"
              :aria-pressed="settings.settings.style === option.key"
              @click="settings.settings.style = option.key"
            >
              <span class="dots" aria-hidden="true">
                <i v-for="(color, i) in option.swatches" :key="i" :style="{ background: color }" />
              </span>
              {{ option.label }}
            </button>
          </div>

          <p class="group-label">快捷操作</p>
          <div class="quick">
            <button type="button" class="quick-btn" @click="openSearch">
              <AppIcon name="search" :size="19" />
              全站搜索
            </button>
            <button type="button" class="quick-btn" @click="settings.cycleTheme()">
              <AppIcon :name="theme.icon" :size="19" />
              {{ theme.label }}
            </button>
            <button type="button" class="quick-btn" @click="scrollTop">
              <AppIcon name="arrowUp" :size="19" />
              回到顶部
            </button>
          </div>

          <p class="foot">新屋岭中学2419班 · 班级空间</p>
        </nav>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.mask {
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
  width: min(336px, 88vw);
  height: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-4);
  padding-bottom: calc(var(--space-6) + env(safe-area-inset-bottom, 0px));
  background: var(--surface);
  border-left: var(--card-bd-w) solid var(--line);
  box-shadow: var(--shadow-3);
  backdrop-filter: var(--surface-blur);
  -webkit-backdrop-filter: var(--surface-blur);
  overflow-y: auto;
  overscroll-behavior: contain;
  outline: none;
}
[data-style='legacy'] .drawer {
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(30px) saturate(1.8);
  -webkit-backdrop-filter: blur(30px) saturate(1.8);
}
[data-style='legacy'][data-theme='dark'] .drawer {
  background: rgba(18, 18, 26, 0.88);
}
[data-style='brutal'] .drawer {
  border-left-width: 3px;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding-bottom: var(--space-4);
  margin-bottom: var(--space-2);
  border-bottom: 1px solid var(--line);
}
.profile {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}
.avatar {
  flex: none;
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent-ink);
  border: 1px solid var(--accent-soft-2);
  border-radius: var(--radius-xs);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.82rem;
  letter-spacing: 0.5px;
}
[data-style='japandi'] .avatar {
  border-radius: 50%;
  background: var(--sage);
  color: #fffefb;
  border-color: transparent;
}
[data-style='brutal'] .avatar {
  background: #111;
  color: var(--accent-ink);
  border: 3px solid #111;
  box-shadow: 3px 3px 0 var(--accent-2);
}
.profile-text {
  min-width: 0;
}
.profile-text strong {
  display: block;
  font-family: var(--font-display);
  font-size: var(--fs-md);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.profile-text small {
  display: block;
  margin-top: 2px;
  color: var(--text-3);
  font-size: var(--fs-2xs);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.group-label {
  margin: var(--space-3) 10px 4px;
  font-size: var(--fs-2xs);
  font-weight: 700;
  letter-spacing: 2px;
  color: var(--text-3);
  text-transform: uppercase;
}
.link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 10px 10px;
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: var(--fs-md);
  font-weight: 500;
  transition:
    background-color var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease);
}
.link:hover {
  background: var(--bg-soft);
}
.link.active {
  background: var(--accent-soft);
  color: var(--accent-ink);
}
.link-icon {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  flex: none;
  border: 1px solid var(--line);
  border-radius: var(--icon-btn-radius, 999px);
  color: var(--text-2);
}
.link.active .link-icon {
  border-color: var(--accent-soft-2);
  color: var(--accent-ink);
}
.arrow {
  margin-left: auto;
  color: var(--text-3);
}

.styles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
  padding: 0 2px;
}
.style-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border: 1px solid var(--line);
  border-radius: var(--radius-xs);
  background: transparent;
  color: var(--text-2);
  font-size: var(--fs-2xs);
  font-weight: 600;
  text-align: left;
}
.style-chip.active {
  border-color: var(--accent-ink);
  color: var(--text);
  background: var(--accent-soft);
}
.dots {
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: 18px;
  height: 18px;
  flex: none;
  overflow: hidden;
  border: 1px solid var(--line);
}
.dots i {
  display: block;
}
[data-style='brutal'] .style-chip {
  border-width: 2px;
}

.quick {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);
  margin-top: 2px;
}
.quick-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 4px;
  border: 1px solid var(--line);
  border-radius: var(--radius-xs);
  background: var(--surface-2);
  color: var(--text-2);
  font-size: var(--fs-2xs);
  font-weight: 600;
}
.quick-btn:hover {
  background: var(--accent-soft);
  border-color: var(--accent-soft-2);
  color: var(--accent-ink);
}
[data-style='brutal'] .quick-btn {
  border-width: 3px;
}

.foot {
  margin: auto 0 0;
  padding-top: var(--space-5);
  text-align: center;
  color: var(--text-3);
  font-size: var(--fs-2xs);
}

.drawer-enter-active,
.drawer-leave-active {
  transition: opacity var(--dur) var(--ease);
}
.drawer-enter-active .drawer,
.drawer-leave-active .drawer {
  transition: transform var(--dur) var(--ease);
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}
.drawer-enter-from .drawer,
.drawer-leave-to .drawer {
  transform: translateX(40px);
}
</style>
