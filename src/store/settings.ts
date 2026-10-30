/**
 * 站点设置：风格 / 主题 / 强调色 / 字号 / 动效 / 玻璃质感
 *
 * 与 effects store 的分工不变：
 * - 本 store 管「外观偏好」；
 * - effects store 管「渲染负载」（特效等级、3D 开关、自动降级）。
 */
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

import type { AccentKey, SiteSettings, StyleKey, ThemeMode } from '@/types'
import { getJSON, setJSON } from '@/utils/storage'

/** 浏览器 UI 着色（theme-color）：按风格 + 明暗取一个与页面顶部一致的颜色 */
const THEME_COLOR: Record<StyleKey, { light: string; dark: string }> = {
  annual: { light: '#faf9f6', dark: '#14161a' },
  japandi: { light: '#f7f5f0', dark: '#1f231f' },
  // 粗野风的顶栏是一整块亮黄，状态栏跟着顶栏走
  brutal: { light: '#ffd23f', dark: '#1c1c1c' },
  legacy: { light: '#2563eb', dark: '#08080f' },
}

/** 原版风格的强调色要反映到浏览器 UI 上（与改动前一致） */
const LEGACY_ACCENT_HEX: Record<Exclude<AccentKey, 'auto'>, string> = {
  blue: '#2563eb',
  pink: '#e879b0',
  green: '#0d9488',
  orange: '#ea580c',
}

const DEFAULTS: SiteSettings = {
  style: 'annual',
  theme: 'auto',
  accent: 'auto',
  fontSize: 'md',
  animations: true,
  glass: true,
}

/**
 * 读取本地设置。
 *
 * 迁移规则（老用户）：`style` 字段是这次重写才有的，缺失说明是旧版本存档。
 * 此时把旧默认强调色 `blue` 一并归为 `auto`，让年鉴风展示自己的铁锈橙；
 * 若用户明确选过粉/绿/橙，则原样保留。
 */
function loadSettings(): SiteSettings {
  const raw = getJSON<Partial<SiteSettings>>('settings', {})
  const merged: SiteSettings = { ...DEFAULTS, ...raw }
  if (!raw.style) {
    merged.style = DEFAULTS.style
    if (!raw.accent || raw.accent === 'blue') merged.accent = 'auto'
  }
  return merged
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<SiteSettings>(loadSettings())

  function resolvedTheme(): 'light' | 'dark' {
    const { theme } = settings.value
    const prefersDark =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    return theme === 'auto' ? (prefersDark ? 'dark' : 'light') : theme
  }

  function applyTheme() {
    const resolved = resolvedTheme()
    document.documentElement.dataset.theme = resolved
    const meta = document.querySelector('meta[name="theme-color"]')
    if (!meta) return
    const { style, accent } = settings.value
    const legacyAccent =
      style === 'legacy' && accent !== 'auto' ? LEGACY_ACCENT_HEX[accent] : null
    meta.setAttribute(
      'content',
      legacyAccent && resolved === 'light'
        ? legacyAccent
        : (THEME_COLOR[style] ?? THEME_COLOR.annual)[resolved],
    )
  }

  function applyAll() {
    document.documentElement.dataset.style = settings.value.style
    document.documentElement.dataset.accent = settings.value.accent
    document.documentElement.dataset.fontSize = settings.value.fontSize
    document.documentElement.classList.toggle('no-animations', !settings.value.animations)
    document.documentElement.classList.toggle('no-glass', !settings.value.glass)
    applyTheme()
  }

  watch(
    settings,
    () => {
      setJSON('settings', settings.value)
      applyAll()
    },
    { deep: true },
  )

  /** 监听系统主题变化（theme=auto 时生效） */
  function initThemeWatcher() {
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (settings.value.theme === 'auto') applyTheme()
    }
    if (mq.addEventListener) mq.addEventListener('change', handler)
    else if (mq.addListener) mq.addListener(handler)
  }

  function reset() {
    settings.value = { ...DEFAULTS }
    applyAll()
  }

  /** 亮 / 暗 / 跟随系统 三态轮换（头部按钮与设置页共用） */
  const THEME_ORDER: ThemeMode[] = ['auto', 'light', 'dark']
  function cycleTheme() {
    const idx = THEME_ORDER.indexOf(settings.value.theme)
    settings.value.theme = THEME_ORDER[(idx + 1) % THEME_ORDER.length]
  }

  return { settings, applyAll, initThemeWatcher, reset, cycleTheme }
})
