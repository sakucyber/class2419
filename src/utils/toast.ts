/**
 * 轻量全局提示（toast）。
 *
 * 替代 `alert()`：分享链接复制成功这类一次性反馈不该打断用户，
 * 也不该弹出一个和整站视觉无关的系统对话框。
 *
 * 用法：`toast('链接已复制')`；后一条会顶掉前一条的计时。
 */
import { reactive } from 'vue'

export const toastState = reactive({
  /** 空字符串表示不显示 */
  message: '',
})

let timer = 0

export function toast(message: string, duration = 2200): void {
  toastState.message = message
  window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    toastState.message = ''
  }, duration)
}

export function dismissToast(): void {
  window.clearTimeout(timer)
  toastState.message = ''
}
