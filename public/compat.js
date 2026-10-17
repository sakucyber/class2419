/*
 * 浏览器兼容性前置守卫 —— **必须是 ES5 语法**。
 *
 * 为什么需要这一层（而不是只写在 src/utils/browser.ts 里）：
 * 检测代码若只存在于 TypeScript 源码中，就会被编进 Vue 主包；而老浏览器**解析不了主包**，
 * 检测代码根本执行不到 —— 鸡生蛋问题。所以拦截必须在「主包之外」完成，且用 ES5 编写，
 * 连 IE 都要能跑起来（IE 至少要能显示升级提示页，而不是白屏）。
 *
 * 职责：
 *  1) 判定 isUnsupported（无法运行 Vue 3）→ 用 innerHTML 把页面替换成升级提示页，
 *     并移除 module 脚本与 modulepreload，确保**不加载 Vue 主包**。
 *  2) 判定 isLegacy（能跑但引擎旧）→ 给 <html> 挂 .is-legacy-browser，由 CSS 降级。
 *  3) 结论写入 window.__browserCheck，供 src/utils/browser.ts 复用。
 *
 * ⚠️ 本文件与 src/utils/browser.ts 是同一套判定的两份实现（ES5 / TS）。
 *    修改判定逻辑或阈值时必须**同步修改两处**。
 *
 * ⚠️ 不能用内联 <script>、也不能用 new Function/eval —— 生产构建注入了 CSP
 *    `script-src 'self'`，两者都会被拦截（都踩过）。本文件放在 public/ 下，
 *    构建时原样复制、不做降级转译。
 */
;(function () {
  'use strict'

  // ────────────────── 阈值（须与 src/utils/browser.ts 保持一致） ──────────────────
  var MIN_CHROMIUM = 84 // flex gap 需 Chrome 84
  var MIN_SAFARI = 14.1 // flex gap 需 Safari 14.1
  var MIN_FIREFOX = 78
  var MIN_EDGE = 84

  var html = document.documentElement

  /* ─────────────────────────── 能力探测 ─────────────────────────── */

  function supportsCustomProps() {
    // 直接实测，而不是 CSS.supports('--x','1')：后者对自定义属性的行为各内核不一致
    try {
      var st = document.createElement('style')
      st.textContent = ':root{--compat-probe:1}'
      var head = document.head || document.getElementsByTagName('head')[0]
      head.appendChild(st)
      var v = window.getComputedStyle(document.documentElement).getPropertyValue('--compat-probe')
      head.removeChild(st)
      return String(v).indexOf('1') !== -1
    } catch (e) {
      return false
    }
  }

  function supportsBackdropFilter() {
    try {
      var css = window.CSS
      if (!css || !css.supports) return false
      return (
        css.supports('backdrop-filter', 'blur(1px)') ||
        css.supports('-webkit-backdrop-filter', 'blur(1px)')
      )
    } catch (e) {
      return false
    }
  }

  /**
   * 实测 flex 的 gap 是否生效（Chrome 84 / Safari 14.1 / Firefox 63 起才支持）。
   *
   * 为什么必须实测而不是按 UA 版本推断：
   * `CSS.supports('gap', '1px')` 对 grid 的 gap 也返回 true，无法区分 flex；
   * 而按 UA 推会出错 —— 例如 Firefox 63~77 支持 flex gap，却因版本低于 78 被判为 legacy。
   * 这类浏览器的 gap 本来正常，若再补 margin 就会变成双倍间距。
   *
   * 结论只用于 CSS：不生效时给 <html> 挂 .no-flex-gap，由 legacy.css 补 margin。
   */
  function supportsFlexGap() {
    try {
      var box = document.createElement('div')
      box.style.cssText =
        'display:flex;gap:2px;position:absolute;top:-9999px;left:-9999px;visibility:hidden'
      var a = document.createElement('div')
      var b = document.createElement('div')
      a.style.cssText = 'width:1px;height:1px;flex:0 0 auto'
      b.style.cssText = 'width:1px;height:1px;flex:0 0 auto'
      box.appendChild(a)
      box.appendChild(b)
      document.body.appendChild(box)
      var ra = a.getBoundingClientRect()
      var rb = b.getBoundingClientRect()
      var ok = rb.left - ra.right >= 1
      document.body.removeChild(box)
      return ok
    } catch (e) {
      return false
    }
  }

  /* ─────────────────────────── UA 解析 ─────────────────────────── */

  function parseUA() {
    var ua = navigator.userAgent || ''
    var m

    if (/MSIE|Trident/.test(ua)) return { engine: 'trident', version: 0 }

    // Edge（Chromium 版）
    m = /Edg\/(\d+)/.exec(ua)
    if (m) return { engine: 'edge', version: parseInt(m[1], 10) }

    // 旧 Edge（EdgeHTML）
    m = /Edge\/(\d+)/.exec(ua)
    if (m) return { engine: 'edge', version: parseInt(m[1], 10) }

    // Chrome 及各家 Chromium 内核浏览器
    m = /Chrome\/(\d+)/.exec(ua)
    if (m) return { engine: 'chromium', version: parseInt(m[1], 10) }

    m = /Firefox\/(\d+)/.exec(ua)
    if (m) return { engine: 'gecko', version: parseInt(m[1], 10) }

    // Safari：版本号取自 Version/x.y（AppleWebKit/Safari 的版本号不可用于比较）
    if (/Safari/.test(ua)) {
      m = /Version\/(\d+)(?:\.(\d+))?/.exec(ua)
      if (m) {
        var major = parseInt(m[1], 10)
        var minor = m[2] ? parseInt(m[2], 10) : 0
        return { engine: 'webkit', version: major + minor / 10 }
      }
      return { engine: 'webkit', version: null }
    }

    return { engine: 'unknown', version: null }
  }

  /* ─────────────────────────── 判定 ─────────────────────────── */

  /** 致命项：命中任意一条即无法运行 Vue 3 */
  function collectFatal(ua) {
    var missing = []
    if (typeof window.Proxy === 'undefined') {
      missing.push('Proxy（Vue 3 响应式硬依赖，无法 polyfill）')
    }
    if (typeof window.Promise === 'undefined') missing.push('Promise')
    if (typeof window.Symbol === 'undefined') missing.push('Symbol')
    if (!supportsCustomProps()) missing.push('CSS 变量')
    if (ua.engine === 'trident') missing.push('IE 内核')
    return missing
  }

  /** 非致命项：命中任意一条即进入简化模式 */
  function collectLegacyReasons(ua) {
    var reasons = []

    if (window.__modernSyntax !== true) reasons.push('无 ES2020 语法支持')
    if (!supportsBackdropFilter()) reasons.push('无 backdrop-filter')
    if (typeof window.IntersectionObserver === 'undefined') reasons.push('无 IntersectionObserver')

    if (ua.engine === 'chromium' && ua.version !== null && ua.version < MIN_CHROMIUM) {
      reasons.push('Chrome ' + ua.version + ' < ' + MIN_CHROMIUM)
    }
    if (ua.engine === 'edge' && ua.version !== null && ua.version < MIN_EDGE) {
      reasons.push('Edge ' + ua.version + ' < ' + MIN_EDGE)
    }
    if (ua.engine === 'webkit' && ua.version !== null && ua.version < MIN_SAFARI) {
      reasons.push('Safari ' + ua.version + ' < ' + MIN_SAFARI)
    }
    if (ua.engine === 'gecko' && ua.version !== null && ua.version < MIN_FIREFOX) {
      reasons.push('Firefox ' + ua.version + ' < ' + MIN_FIREFOX)
    }

    return reasons
  }

  /* ─────────────────────────── 升级提示页 ─────────────────────────── */

  // 纯 CSS（**不能用 CSS 变量** —— 它的不可用本身就是判定条件之一）。
  // 沿用站点的粉紫渐变语汇，不做干巴巴的纯文本页。
  var UPGRADE_HTML =
    '<style>' +
    '*{box-sizing:border-box}' +
    'html,body{margin:0;padding:0;min-height:100%}' +
    'body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;' +
    'background:#f0ecfa;background-image:linear-gradient(135deg,#f7e9fb 0%,#eaf0ff 45%,#fdf1f6 100%);' +
    'color:#241f33;line-height:1.75;padding:32px 18px}' +
    '.up-wrap{max-width:560px;margin:0 auto}' +
    '.up-card{background:#ffffff;border:1px solid #e6dff2;border-radius:22px;' +
    'padding:32px 26px 28px;box-shadow:0 10px 30px rgba(74,50,112,.10)}' +
    '.up-badge{display:inline-block;padding:5px 14px;border-radius:999px;font-size:13px;font-weight:700;' +
    'color:#ffffff;background:linear-gradient(135deg,#e879b0,#a78bfa);letter-spacing:1px}' +
    '.up-title{margin:16px 0 6px;font-size:26px;line-height:1.35;font-weight:800;color:#241f33}' +
    '.up-title em{font-style:normal;color:#a855f7}' +
    '.up-sub{margin:0 0 18px;font-size:13px;color:#7b7391;letter-spacing:.5px}' +
    '.up-desc{margin:0 0 22px;font-size:15px;color:#544d6b}' +
    '.up-links{margin:0 0 20px}' +
    '.up-btn{display:block;margin:0 0 10px;padding:13px 18px;border-radius:14px;text-decoration:none;' +
    'font-size:15px;font-weight:700;text-align:center;color:#ffffff;' +
    'background:linear-gradient(135deg,#a855f7,#6366f1)}' +
    '.up-btn.alt{background:linear-gradient(135deg,#38bdf8,#22d3ee)}' +
    '.up-btn.alt2{background:linear-gradient(135deg,#fb7185,#f472b6)}' +
    '.up-note{margin:0;padding-top:18px;border-top:1px solid #ece7f6;font-size:13px;color:#7b7391}' +
    '.up-foot{margin:22px 0 0;font-size:12px;color:#9a93ad;text-align:center}' +
    '</style>' +
    '<div class="up-wrap">' +
    '<div class="up-card">' +
    '<span class="up-badge">2419</span>' +
    '<h1 class="up-title">该给浏览器<em>升个级</em>啦</h1>' +
    '<p class="up-sub">新屋岭初级中学 2419 班 · 班级空间</p>' +
    '<p class="up-desc">当前浏览器的版本过旧，无法正常显示本站内容。<br>' +
    '换一个现代浏览器，就能看到我们的相册、视频和文章。</p>' +
    '<div class="up-links">' +
    '<a class="up-btn" href="https://www.google.cn/chrome/" target="_blank" rel="noopener noreferrer">下载 Chrome</a>' +
    '<a class="up-btn alt" href="https://www.microsoft.com/zh-cn/edge" target="_blank" rel="noopener noreferrer">下载 Edge</a>' +
    '<a class="up-btn alt2" href="https://www.apple.com.cn/safari/" target="_blank" rel="noopener noreferrer">下载 Safari</a>' +
    '</div>' +
    '<p class="up-note">手机 / 平板一般无需单独安装：iOS 到「设置 → 通用 → 软件更新」升级系统；' +
    '安卓可更新系统自带浏览器或安装 Chrome。</p>' +
    '</div>' +
    '<p class="up-foot">聚是一团火，散是满天星</p>' +
    '</div>'

  /**
   * 移除 module 脚本与 modulepreload。
   * module 脚本是 deferred 的，此刻还没执行；把元素摘掉即可阻止其执行，
   * 同时 modulepreload 一并撤掉，避免白白下载主包。
   */
  function blockAppBundle() {
    window.__blockApp = true
    var i

    var scripts = document.getElementsByTagName('script')
    for (i = scripts.length - 1; i >= 0; i -= 1) {
      var s = scripts[i]
      if (s && s.type === 'module' && s.parentNode) s.parentNode.removeChild(s)
    }

    var links = document.getElementsByTagName('link')
    for (i = links.length - 1; i >= 0; i -= 1) {
      var l = links[i]
      if (l && l.rel === 'modulepreload' && l.parentNode) l.parentNode.removeChild(l)
    }
  }

  function renderUpgradePage() {
    document.body.innerHTML = UPGRADE_HTML
  }

  /* ─────────────────────────── 主流程 ─────────────────────────── */

  var ua = parseUA()
  var fatal = collectFatal(ua)
  var isUnsupported = fatal.length > 0
  var legacyReasons = isUnsupported ? [] : collectLegacyReasons(ua)
  var isLegacy = !isUnsupported && legacyReasons.length > 0

  // 结论写入 window，供 src/utils/browser.ts 复用（运行时单一事实来源）
  window.__browserCheck = {
    isUnsupported: isUnsupported,
    isLegacy: isLegacy,
    engine: ua.engine,
    version: ua.version,
    missing: isUnsupported ? fatal : legacyReasons,
  }

  if (isUnsupported) {
    blockAppBundle()
    renderUpgradePage()
    return
  }

  if (isLegacy) {
    html.className = html.className ? html.className + ' is-legacy-browser' : 'is-legacy-browser'
  }

  // flex gap 与 legacy 是**两件独立的事**：前者要实测，不能从等级推断。
  // 独立于 isLegacy 单独判定，避免给「有 gap 却被判 legacy」的浏览器（如 Firefox 63~77）
  // 补出双倍间距。
  if (!supportsFlexGap()) {
    html.className = html.className ? html.className + ' no-flex-gap' : 'no-flex-gap'
  }
})()
