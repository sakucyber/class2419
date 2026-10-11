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
  },
  unmounted(el) {
    observer?.unobserve(el)
  },
}
