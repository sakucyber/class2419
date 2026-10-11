/** 站点设置：主题 / 强调色 / 字号 / 动画开关 */
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

import type { SiteSettings } from '@/types'
import { getJSON, setJSON } from '@/utils/storage'

const DEFAULTS: SiteSettings = {
  theme: 'auto',
  accent: 'blue',
  fontSize: 'md',
  animations: true,
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<SiteSettings>({
    ...DEFAULTS,
    ...getJSON<Partial<SiteSettings>>('settings', {}),
  })

  function applyTheme() {
    const { theme } = settings.value
    const prefersDark =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    const resolved = theme === 'auto' ? (prefersDark ? 'dark' : 'light') : theme
    document.documentElement.dataset.theme = resolved
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', resolved === 'dark' ? '#0d1420' : '#2563eb')
  }

  function applyAll() {
    applyTheme()
    document.documentElement.dataset.accent = settings.value.accent
    document.documentElement.dataset.fontSize = settings.value.fontSize
    document.documentElement.classList.toggle('no-animations', !settings.value.animations)
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

  return { settings, applyAll, initThemeWatcher, reset }
})
