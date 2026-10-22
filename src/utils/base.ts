/**
 * 部署基路径（Vite `base`）工具。
 *
 * 根路径部署时 BASE_URL 为 `/`，GitHub Pages 子路径部署时为 `/仓库名/`。
 * **运行时字符串里的绝对路径不会经过 Vite 改写**（比如 data/*.json 里的
 * `/images/x.svg`、模板里写死的图片地址），必须手动过一遍这里，否则子路径部署
 * 会把资源全部请求到站点根目录 → 404。
 *
 * 只处理以单个 `/` 开头的站内绝对路径；协议地址（https:、//cdn）、data/blob/idb
 * 等特殊协议原样返回。
 */
const BASE = import.meta.env.BASE_URL || '/'

export function withBase(input: string | undefined): string {
  if (!input) return input ?? ''
  if (input.startsWith('/')) {
    if (input.startsWith('//')) return input
    return BASE.replace(/\/$/, '') + input
  }
  return input
}
