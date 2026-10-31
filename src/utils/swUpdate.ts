/**
 * Service Worker 更新提示：让用户决定何时切到新版本。
 *
 * ── 为什么需要这个 ──
 * 旧实现是 SW install 完就 skipWaiting() + activate 时 clients.claim()，
 * 新版本会**静默接管**：用户正看着的内容突然被换掉，还没有任何提示。
 *
 * 现在改成协作式更新：
 *   1. 新的 SW 装好后，通过 message 通道告诉页面「有新版本」；
 *   2. 页面弹出提示条，用户点「立即更新」→ 发 SKIP_WAITING 给 SW；
 *   3. SW skipWaiting() → activate → clients.claim()；
 *   4. 页面收到 controllerchange → reload()，拿到新版本。
 *
 * ── 为什么还要监听 registration.updatefound ──
 * SW 发消息的前提是「页面已经在监听」。但新 SW 装好时，页面可能刚打开，
 * 消息会丢。所以除了听 message，还要盯住 registration 上新 SW 的状态迁移：
 * 一旦它进入 installed 且已有 controller 在跑，就说明有更新待生效。
 *
 * ⚠️ 只在生产环境有意义（开发环境不注册 SW）。
 */

import { shallowReactive } from 'vue'

/**
 * 页面上是否有待生效的新版本。
 *
 * ⚠️ 必须是响应式 —— 组件用 computed 读它，普通对象的属性变化不会触发
 * 重新渲染，提示条就永远不出现。
 * ⚠️ 用 shallowReactive 而不是 reactive：waiting 里装的是原生 ServiceWorker
 * 对象，深层代理会破坏它的内部槽（postMessage 会抛 Illegal invocation）。
 */
export const updateState = shallowReactive({
  /** 是否检测到新版本 */
  available: false,
  /** 新版本的 SW 句柄（用于发 SKIP_WAITING） */
  waiting: null as ServiceWorker | null,
})

/** 页面即将 reload 的标记：controllerchange 可能触发多次，只 reload 一次 */
let reloading = false

function isSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator
}

/**
 * 检测 registration 上是否有「装好但未接管」的 SW。
 * @param reg 当前 registration
 */
function checkForUpdate(reg: ServiceWorkerRegistration): void {
  // 已经装好待命
  if (reg.waiting) {
    showUpdate(reg.waiting)
    return
  }
  // 正在安装：等它进 installed
  if (reg.installing) {
    reg.installing.addEventListener('statechange', function onStateChange() {
      const sw = reg.installing
      if (!sw) return
      if (sw.state === 'installed' && navigator.serviceWorker.controller) {
        showUpdate(sw)
      }
    })
  }
}

function showUpdate(waiting: ServiceWorker): void {
  updateState.waiting = waiting
  updateState.available = true
}

/** 用户点了「立即更新」：让 SW 接管，然后重载页面 */
export function applyUpdate(): void {
  const waiting = updateState.waiting
  if (!waiting) {
    // 没有待命的新版本（比如提示条是旧状态残留）→ 直接刷新也能拿到新资源
    window.location.reload()
    return
  }
  waiting.postMessage({ type: 'SKIP_WAITING' })
  // 兜底：万一 SW 没响应（比如被浏览器回收），2 秒后自己刷新
  window.setTimeout(() => {
    if (!reloading) window.location.reload()
  }, 2000)
}

/**
 * 注册 SW 并接好更新检测。
 *
 * @param swUrl SW 的地址（带 base）
 */
export function setupServiceWorker(swUrl: string): void {
  if (!isSupported()) return

  navigator.serviceWorker.addEventListener('message', (event) => {
    const data = event.data
    if (!data || typeof data !== 'object') return
    if (data.type === 'SW_UPDATE_READY') {
      // SW 说有更新了：拿到 waiting 句柄显示提示
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) showUpdate(reg.waiting)
        else if (reg) checkForUpdate(reg)
      })
    }
  })

  // SW 接管后重新加载页面，拿到新版本的资源
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return
    reloading = true
    window.location.reload()
  })

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(swUrl)
      .then((reg) => {
        checkForUpdate(reg)
        // 每次页面加载都问一次有没有新版本（浏览器也会自动检查，这里是主动的）
        reg.update().catch(() => undefined)
      })
      .catch(() => {
        /* 用户拒绝或不支持时静默降级 */
      })
  })
}
