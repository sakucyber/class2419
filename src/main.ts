// ⚠️ 必须是第一行：beforeinstallprompt 整个会话只派发一次且可能早于 load，
// 晚注册就永久丢失（这个模块靠 import 副作用注册监听）。
import './utils/pwa'

import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import { reveal } from './directives/reveal'
import router from './router'
import { useEffectsStore } from './store/effects'
import { useSettingsStore } from './store/settings'
import { applyBrowserClasses, detectBrowser } from './utils/browser'
import './styles/index.css'

/*
 * ─────────────────────── 兼容性闸门（必须在挂载前）───────────────────────
 *
 * 1) isUnsupported（无法运行 Vue 3）：public/compat.js（ES5，先于主包运行）
 *    已把页面替换成升级提示页，并摘掉了 module 脚本标签。这里只是双保险。
 * 2) isLegacy（能跑但引擎旧）：Vue 正常加载，<html> 上已挂 .is-legacy-browser，
 *    由样式做降级，特效层同时被压到 L0。
 */
const browser = detectBrowser()
applyBrowserClasses(browser)

if (browser.isUnsupported || window.__blockApp === true) {
  // 页面已由 compat.js 接管，这里不做任何事
} else {
  const app = createApp(App)
  app.use(createPinia())
  app.use(router)
  app.directive('reveal', reveal)

  // 挂载前应用外观设置，避免闪烁
  const settingsStore = useSettingsStore()
  settingsStore.initThemeWatcher()
  settingsStore.applyAll()

  // 设备性能探测：同步完成（<1ms），电池信息随后异步补齐。
  // 放在挂载前是为了让首屏组件按正确等级渲染，避免先按 L2 渲染再回退造成闪烁。
  const effectsStore = useEffectsStore()
  effectsStore.probe()

  app.mount('#app')

  // PWA：仅生产环境注册 Service Worker
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
        /* 用户拒绝或不支持时静默降级 */
      })
    })
  }
}
