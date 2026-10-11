import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import { reveal } from './directives/reveal'
import router from './router'
import { useSettingsStore } from './store/settings'
import './styles/base.css'
import './styles/variables.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.directive('reveal', reveal)

// 挂载前应用主题设置，避免闪烁
const settingsStore = useSettingsStore()
settingsStore.initThemeWatcher()
settingsStore.applyAll()

app.mount('#app')

// PWA：仅生产环境注册 Service Worker
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* 用户拒绝或不支持时静默降级 */
    })
  })
}
