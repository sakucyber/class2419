/*
 * 旧内核兼容性探测与降级 —— 必须是 ES5 语法。
 *
 * 触发它的情况正是「浏览器太旧」，所以这里连箭头函数、const 都不能用，
 * 否则脚本自身先报语法错误，降级页永远出不来。
 *
 * 为什么是独立文件而不是内联 <script>：
 * 生产构建会注入 CSP 的 `script-src 'self'`，**内联脚本会被直接拦截**。
 * 同理也不能用 new Function / eval 做特性探测 —— 那属于 eval，同样被 CSP 拦截，
 * 会导致所有浏览器都被误判为旧内核。语法能力改由 probe-es2020.js 的标志位判断。
 *
 * 为什么需要降级页：
 * 本站基于 Vue 3，其响应式系统依赖 Proxy（ES2015）。Proxy 是语言级特性、无法 polyfill，
 * 所以 Chrome 49 以下的浏览器（例如安卓 5.x 的系统 WebView 39）无论把构建目标降到多低
 * 都跑不起来 —— 只会是一片白屏。
 */
;(function () {
  function isModernBrowser() {
    // Vue 3 的响应式系统依赖 Proxy，缺失则必然白屏
    if (typeof Proxy === 'undefined' || typeof Symbol === 'undefined') return false
    if (typeof Promise === 'undefined' || typeof WeakMap === 'undefined') return false

    // 语法能力：probe-es2020.js 能解析并执行，才会把这个标志位置为 true。
    // 构建产物里用了 57 处可选链、14 处空值合并，解析不了就整包不执行。
    if (window.__modernSyntax !== true) return false

    // CSS 变量：全站主题体系依赖它。
    // 直接实测而不是用 CSS.supports('--x','1') —— 后者对自定义属性的行为各内核不一致。
    try {
      var st = document.createElement('style')
      st.textContent = ':root{--compat-probe:1}'
      document.head.appendChild(st)
      var v = getComputedStyle(document.documentElement).getPropertyValue('--compat-probe')
      document.head.removeChild(st)
      if (String(v).indexOf('1') === -1) return false
    } catch (e) {
      return false
    }

    return true
  }

  if (isModernBrowser()) {
    window.__compatProbe = 'modern'
    return
  }

  window.__compatProbe = 'legacy'
  var root = document.documentElement
  root.className = root.className ? root.className + ' legacy-browser' : 'legacy-browser'
})()
