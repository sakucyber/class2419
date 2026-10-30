/* 首屏外观初始化（ES5，必须早于样式表执行）
 *
 * 为什么需要它：样式表按 data-style / data-theme 取色，而设置存在 localStorage 里。
 * 如果等主包执行再写这些属性，用户会先看到一帧默认米白（暗色用户尤其刺眼）。
 * 这段脚本在主包之前、首次绘制之前把属性写好，消除闪烁。
 *
 * 注意：
 * - 必须是 ES5：老浏览器也要能跑（与 compat.js 同一套约束）。
 * - 不能内联：生产 CSP 是 script-src 'self'，内联脚本会被拦截。
 * - 判定逻辑要与 store/settings.ts 的迁移规则保持一致：
 *   没有 style 字段 = 老存档，按 annual 处理，并把旧的默认蓝强调色归为 auto。
 */
;(function () {
  var root = document.documentElement

  var THEME_COLOR = {
    annual: { light: '#faf9f6', dark: '#14161a' },
    japandi: { light: '#f7f5f0', dark: '#1f231f' },
    brutal: { light: '#ffd23f', dark: '#1c1c1c' },
    legacy: { light: '#2563eb', dark: '#08080f' },
  }
  var LEGACY_ACCENT = {
    blue: '#2563eb',
    pink: '#e879b0',
    green: '#0d9488',
    orange: '#ea580c',
  }

  var style = 'annual'
  var theme = 'light'
  var accent = 'auto'
  var fontSize = 'md'
  var animations = true
  var glass = true

  try {
    var raw = localStorage.getItem('cls2419:settings')
    if (raw) {
      var s = JSON.parse(raw) || {}
      if (s.style === 'annual' || s.style === 'japandi' || s.style === 'brutal' || s.style === 'legacy') {
        style = s.style
      }
      if (!s.style && (!s.accent || s.accent === 'blue')) accent = 'auto'
      else if (s.accent) accent = s.accent
      if (s.theme) theme = s.theme
      if (s.fontSize) fontSize = s.fontSize
      if (s.animations === false) animations = false
      if (s.glass === false) glass = false
    }
  } catch (e) {
    /* 存储被禁用或 JSON 损坏：用默认值 */
  }

  var dark =
    theme === 'dark' ||
    (theme !== 'light' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)

  root.setAttribute('data-style', style)
  root.setAttribute('data-theme', dark ? 'dark' : 'light')
  root.setAttribute('data-accent', accent)
  root.setAttribute('data-font-size', fontSize)
  if (!animations) root.className += ' no-animations'
  if (!glass) root.className += ' no-glass'

  var meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    var accentHex = style === 'legacy' && accent !== 'auto' ? LEGACY_ACCENT[accent] : null
    var colors = THEME_COLOR[style] || THEME_COLOR.annual
    meta.setAttribute('content', accentHex && !dark ? accentHex : colors[dark ? 'dark' : 'light'])
  }
})()
