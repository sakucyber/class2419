/**
 * 轻量设备判定。
 *
 * 这里原先放的是「设备评分 + 特效分级 + FPS 采样」，供 3D 徽章按性能自动降级。
 * 3D 已整体移除（连同 three 依赖与特效等级设置），那套探测没有消费方了，
 * 只留下 PWA 安装引导还在用的移动端判定 —— 避免多处各写一份 UA 正则。
 */

function isMobileDevice(pointerFine: boolean): boolean {
  if (pointerFine) return false
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /Android|iPhone|iPad|iPod|Mobile|HarmonyOS|Windows Phone/i.test(ua)
}

/**
 * 无参版本：内部自行判断指针类型。
 * 供 PWA 等模块复用，避免多处各写一份 UA 正则导致判断不一致。
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return isMobileDevice(window.matchMedia('(pointer: fine)').matches)
}
