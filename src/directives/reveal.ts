/**
 * v-reveal：滚动进入视口时做入场动画（IntersectionObserver）。
 * 用法：v-reveal  /  v-reveal="'scale'"  /  v-reveal="{ type: 'up', delay: 2 }"
 * 样式见 base.css 的 [data-reveal]。
 */
import type { Directive } from 'vue'

export interface RevealOptions {
  type?: 'up' | 'down' | 'left' | 'right' | 'scale'
  delay?: number
}

let observer: IntersectionObserver | null = null

/** 每个元素的兜底定时器，卸载时清理 */
const timers = new WeakMap<Element, number>()

function ensureObserver(): IntersectionObserver {
  if (observer) return observer
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('reveal-in')
        observer?.unobserve(entry.target)
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
  )
  return observer
}

export const reveal: Directive<HTMLElement, string | RevealOptions | undefined> = {
  mounted(el, binding) {
    const value = binding.value
    const type = typeof value === 'string' ? value : (value?.type ?? 'up')
    const delay = typeof value === 'object' ? (value.delay ?? 0) : 0

    el.setAttribute('data-reveal', type)
    if (delay) el.style.setProperty('--reveal-delay', String(delay))

    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('reveal-in')
      return
    }

    ensureObserver().observe(el)

    /**
     * 兜底：内容默认是 opacity:0，万一观察器回调没送达（部分内嵌 WebView、
     * 极端渲染时序），上方首屏内容就会一直不可见。2.5s 后若仍在视口内且未展示，
     * 直接展示。只兜底视口内的元素，不影响下方元素的滚动入场。
     */
    const fallback = window.setTimeout(() => {
      if (el.classList.contains('reveal-in')) return
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight || document.documentElement.clientHeight
      if (rect.top < vh && rect.bottom > 0) el.classList.add('reveal-in')
    }, 2500)
    timers.set(el, fallback)
  },
  unmounted(el) {
    const t = timers.get(el)
    if (t !== undefined) window.clearTimeout(t)
    timers.delete(el)
    observer?.unobserve(el)
  },
}
