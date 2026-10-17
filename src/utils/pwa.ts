/**
 * PWA 安装能力探测 + `beforeinstallprompt` 捕获。
 *
 * ⚠️ 必须作为**副作用模块**放在 `main.ts` 的第一行 import。
 * `beforeinstallprompt` 整个会话只派发一次，而且可能早于 `load`；晚注册就永久丢失，
 * 并且**没有任何 API 能事后补查**（这正是"有的人能看到安装提示、有的人看不到"的常见原因）。
 *
 * 捕获到的 event 存在模块级变量里，**不放进 reactive** ——
 * Vue 的响应式代理会影响 `event.prompt()` 的调用上下文。
 */
import { reactive } from 'vue'

import { isMobile } from '@/utils/perf'

/** Chromium 的安装事件（未进 TS 标准库，做最小声明） */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt: () => Promise<void>
}

interface StandaloneNavigator extends Navigator {
  /** iOS Safari 专用：从主屏幕启动时为 true */
  standalone?: boolean
}

/** 供 UI 绑定安装状态 */
export const pwaState = reactive({
  /** 是否已捕获原生安装事件（Android / Chromium） */
  canPrompt: false,
  /** 是否已安装（含「从主屏幕启动」这种情形） */
  installed: false,
})

let deferredPrompt: BeforeInstallPromptEvent | null = null

function detectInstalled(): boolean {
  if (typeof window === 'undefined') return false
  // iOS 从主屏幕启动时，Safari 会给 navigator.standalone = true
  if ((navigator as StandaloneNavigator).standalone === true) return true
  if (typeof window.matchMedia !== 'function') return false
  // 其他平台：display-mode 为独立窗口即视为已安装
  return ['standalone', 'minimal-ui', 'fullscreen'].some(
    (mode) => window.matchMedia(`(display-mode: ${mode})`).matches,
  )
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    // 阻止 Chrome 自带的迷你信息条 —— 何时提示由我们自己的 UI 决定
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
    pwaState.canPrompt = true
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    pwaState.canPrompt = false
    pwaState.installed = true
  })

  if (typeof window.matchMedia === 'function') {
    const mq = window.matchMedia('(display-mode: standalone)')
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', () => {
        pwaState.installed = detectInstalled()
      })
    }
  }

  pwaState.installed = detectInstalled()
}

/* ───────────────────────────── 平台判定 ───────────────────────────── */

/**
 * iOS / iPadOS 判定。
 * ⚠️ iPadOS 13+ 的 UA 伪装成 macOS，只查 /iPad|iPhone|iPod/ 会漏掉，
 * 必须补 `platform === 'MacIntel' && maxTouchPoints > 1` 这条。
 */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return true
  return navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1
}

/** 是否移动端（复用 perf 的判定，避免两处各写一份 UA 正则） */
export function isMobileDevice(): boolean {
  return isMobile()
}

/** 当前环境是否"支持安装"：有原生事件，或 iOS 的手动路径 */
export function canInstall(): boolean {
  if (pwaState.installed) return false
  return pwaState.canPrompt || isIOS()
}

export type InstallResult = 'accepted' | 'dismissed' | 'installed' | 'manual-ios' | 'manual-other'

/**
 * 触发安装。
 * - 有原生事件 → 调用它，返回用户选择
 * - iOS（没有该事件）→ 返回 'manual-ios'，由调用方展示图文指引
 * - 其他（Chromium 但没捕获到事件）→ 'manual-other'，同样走指引
 */
export async function promptInstall(): Promise<InstallResult> {
  if (pwaState.installed) return 'installed'

  const event = deferredPrompt
  if (!event) return isIOS() ? 'manual-ios' : 'manual-other'

  // 事件只能消费一次：先取出来并清空，无论用户选什么都已失效
  deferredPrompt = null
  pwaState.canPrompt = false

  try {
    await event.prompt()
    const choice = await event.userChoice
    return choice.outcome === 'accepted' ? 'accepted' : 'dismissed'
  } catch {
    // prompt() 在部分环境会抛错（例如事件已失效）。此时仍按平台给对应文案，
    // 避免 iOS 用户读到"打开浏览器菜单"这种安卓说法。
    return isIOS() ? 'manual-ios' : 'manual-other'
  }
}
