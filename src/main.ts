import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import { reveal } from './directives/reveal'
import router from './router'
import { useEffectsStore } from './store/effects'
import { useSettingsStore } from './store/settings'
import { applyBrowserClasses, detectBrowser } from './utils/browser'
import './styles/base.css'
import './styles/variables.css'

/*
 * ─────────────────────── 兼容性闸门（必须在挂载前）───────────────────────
 *
 * 1) isUnsupported（无法运行 Vue 3）：`public/compat.js`（ES5，先于主包运行）
 *    已把页面替换成升级提示页，并摘掉了 module 脚本标签。这里只是**双保险**：
 *    直接跳过，不创建应用、不初始化 store、不注册 Service Worker。
 *
 *    补充：被拦截的浏览器恰好都是「不支持 ES module」的（IE / WebView 39 等），
 *    它们本来就不会下载这个 module 脚本；摘标签是兜底，防止将来出现
 *    「支持 module 却缺关键能力」的浏览器白白下载一份跑不起来的主包。
 *
 * 2) isLegacy（能跑但引擎旧）：Vue 正常加载，但 <html> 上已挂 .is-legacy-browser，
 *    由 CSS 做降级（去毛玻璃 / 去动画 / 补 gap 等），特效层同时被压到 L0。
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

  // 挂载前应用主题设置，避免闪烁
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
