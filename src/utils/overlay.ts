/**
 * 弹层通用能力：**焦点圈定** + **引用计数的 body 滚动锁**。
 *
 * 为什么需要：
 * - 无障碍：dialog 打开后焦点必须进入弹层，Tab 要在弹层内循环，关闭后焦点回到
 *   触发元素。之前灯箱/抽屉/搜索浮层都没做，键盘和读屏用户可以 Tab 到背景内容。
 * - 滚动锁：之前 ui store / Lightbox / PolaroidModal / InstallGuide 四处各自修改
 *   `document.body.style.overflow`，两个弹层叠加时关掉一个会把另一个的锁解掉。
 *   改成引用计数后，只有最后一个弹层关闭时才真正解锁。
 */
import { nextTick, onBeforeUnmount, watch, type Ref } from 'vue'

let scrollLockCount = 0

export function lockBodyScroll(): void {
  if (typeof document === 'undefined') return
  scrollLockCount += 1
  if (scrollLockCount === 1) document.body.style.overflow = 'hidden'
}

export function unlockBodyScroll(): void {
  if (typeof document === 'undefined') return
  scrollLockCount = Math.max(0, scrollLockCount - 1)
  if (scrollLockCount === 0) document.body.style.overflow = ''
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/** 弹层内当前可聚焦的元素（过滤掉不可见的） */
export function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  )
}

export interface FocusTrapOptions {
  /** 按 Esc 时触发（一般传关闭函数） */
  onEscape?: () => void
}

/**
 * 在 `isOpen()` 为 true 期间：
 * 1. 记住当前焦点 → 移到弹层内第一个可聚焦元素（没有则给容器加 tabindex=-1 并聚焦容器）
 * 2. 捕获阶段拦截 Tab / Shift+Tab，在弹层内循环
 * 3. 关闭后把焦点还给触发元素
 *
 * 用法：`useFocusTrap(containerRef, () => props.open, { onEscape: close })`
 * 注意容器必须是 DOM 里真实存在的元素（Teleport 的内容在 nextTick 后才有）。
 */
export function useFocusTrap(
  container: Ref<HTMLElement | null>,
  isOpen: () => boolean,
  options: FocusTrapOptions = {},
): void {
  let previous: HTMLElement | null = null

  function onKeydown(event: KeyboardEvent): void {
    if (!isOpen()) return
    if (event.key === 'Escape' && options.onEscape) {
      event.preventDefault()
      options.onEscape()
      return
    }
    if (event.key !== 'Tab') return
    const root = container.value
    if (!root) return
    const items = getFocusable(root)
    if (items.length === 0) {
      event.preventDefault()
      root.focus()
      return
    }
    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement as HTMLElement | null
    if (!active || !root.contains(active)) {
      event.preventDefault()
      first.focus()
      return
    }
    if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    } else if (event.shiftKey && active === first) {
      event.preventDefault()
      last.focus()
    }
  }

  watch(isOpen, async (open) => {
    if (open) {
      previous = (document.activeElement as HTMLElement | null) ?? null
      await nextTick()
      const root = container.value
      if (!root) return
      if (!root.hasAttribute('tabindex')) root.setAttribute('tabindex', '-1')
      const target = getFocusable(root)[0] ?? root
      target.focus()
      document.addEventListener('keydown', onKeydown, true)
    } else {
      document.removeEventListener('keydown', onKeydown, true)
      previous?.focus?.()
      previous = null
    }
  })

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeydown, true)
    previous = null
  })
}
