/**
 * 浏览器能力检测（应用内 typed 视图）。
 *
 * ⚠️ 与 `public/compat.js` 的关系（重要，别改乱）：
 * 拦截「无法运行 Vue 3」的浏览器这件事**必须在主包之外完成** —— 老浏览器解析不了主包，
 * 这段代码根本不会被执行。因此真正的拦截逻辑在 `public/compat.js`（ES5），它先于主包运行，
 * 并把结论写到 `window.__browserCheck`。
 *
 * 本文件是同一套判定的 **TS 版本**，用途有两个：
 *  1) `detectBrowser()` 在 compat.js 已运行过时**直接复用它的结论**（运行时单一事实来源）；
 *     若结论缺失（例如 dev 下脚本顺序异常），则自行重新判定。
 *  2) 为应用提供类型安全的接口与更丰富的展示信息（引擎名、版本、触发原因）。
 *
 * ⚠️ 修改判定条件或阈值时，**必须同步修改 public/compat.js**。
 */

export type BrowserEngine = 'chromium' | 'edge' | 'webkit' | 'gecko' | 'trident' | 'unknown'

/** 简化模式阈值：对齐 flex `gap` 等布局能力的下限 */
export const MIN_CHROMIUM = 84
export const MIN_SAFARI = 14.1
export const MIN_FIREFOX = 78
export const MIN_EDGE = 84

export interface BrowserInfo {
  engine: BrowserEngine
  /**
   * Chromium / Firefox / Edge 为主版本号（如 84）；
   * WebKit 为「主.次」合成值（如 14.1），便于与阈值直接比较。
   * 无法识别时为 null。
   */
  version: number | null
  /** 无法运行 Vue 3，已由 compat.js 拦截并显示升级页 */
  isUnsupported: boolean
  /** 能运行，但引擎较旧，需进入简化模式 */
  isLegacy: boolean
  isIE: boolean
  /** 触发判定的具体原因，用于设置页展示与排查 */
  missing: string[]
  /** 人类可读的引擎描述，如「Chrome 84」「Safari 14.1」 */
  label: string
}

/** compat.js 写入 window 的结论结构 */
interface CompatResult {
  isUnsupported: boolean
  isLegacy: boolean
  engine: string
  version: number | null
  missing: string[]
}

declare global {
  interface Window {
    /** public/compat.js 写入的检测结论 */
    __browserCheck?: CompatResult
    /** compat.js 判定为不支持时置 true，main.ts 据此拒绝挂载 */
    __blockApp?: boolean
    /** public/probe-es2020.js 写入的语法能力标志 */
    __modernSyntax?: boolean
  }
}

/* ------------------------------------------------------------------ */
/* UA 解析                                                             */
/* ------------------------------------------------------------------ */

const ENGINE_LABELS: Record<BrowserEngine, string> = {
  chromium: 'Chrome',
  edge: 'Edge',
  webkit: 'Safari',
  gecko: 'Firefox',
  trident: 'IE',
  unknown: '未知浏览器',
}

function normalizeEngine(raw: string): BrowserEngine {
  switch (raw) {
    case 'chromium':
    case 'edge':
    case 'webkit':
    case 'gecko':
    case 'trident':
      return raw
    default:
      return 'unknown'
  }
}

interface ParsedUA {
  engine: BrowserEngine
  version: number | null
}

/**
 * 解析 UA。
 * 注意 Safari 必须取 `Version/x.y` —— AppleWebKit 与 Safari/ 后面的版本号都不可用于比较。
 */
export function parseUserAgent(ua: string = navigator.userAgent): ParsedUA {
  if (/MSIE|Trident/.test(ua)) return { engine: 'trident', version: 0 }

  const edgeChromium = /Edg\/(\d+)/.exec(ua)
  if (edgeChromium) return { engine: 'edge', version: Number(edgeChromium[1]) }

  const edgeLegacy = /Edge\/(\d+)/.exec(ua)
  if (edgeLegacy) return { engine: 'edge', version: Number(edgeLegacy[1]) }

  const chrome = /Chrome\/(\d+)/.exec(ua)
  if (chrome) return { engine: 'chromium', version: Number(chrome[1]) }

  const firefox = /Firefox\/(\d+)/.exec(ua)
  if (firefox) return { engine: 'gecko', version: Number(firefox[1]) }

  if (/Safari/.test(ua)) {
    const v = /Version\/(\d+)(?:\.(\d+))?/.exec(ua)
    if (!v) return { engine: 'webkit', version: null }
    const major = Number(v[1])
    const minor = v[2] ? Number(v[2]) : 0
    return { engine: 'webkit', version: major + minor / 10 }
  }

  return { engine: 'unknown', version: null }
}

/* ------------------------------------------------------------------ */
/* 能力探测                                                            */
/* ------------------------------------------------------------------ */

function supportsCustomProps(): boolean {
  try {
    const st = document.createElement('style')
    st.textContent = ':root{--compat-probe:1}'
    document.head.appendChild(st)
    const v = getComputedStyle(document.documentElement).getPropertyValue('--compat-probe')
    document.head.removeChild(st)
    return v.indexOf('1') !== -1
  } catch {
    return false
  }
}

function supportsBackdropFilter(): boolean {
  try {
    if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return false
    return (
      CSS.supports('backdrop-filter', 'blur(1px)') ||
      CSS.supports('-webkit-backdrop-filter', 'blur(1px)')
    )
  } catch {
    return false
  }
}

/** 致命项：命中任意一条即无法运行 Vue 3 */
function collectFatal(ua: ParsedUA): string[] {
  const missing: string[] = []
  if (typeof Proxy === 'undefined') missing.push('Proxy（Vue 3 响应式硬依赖，无法 polyfill）')
  if (typeof Promise === 'undefined') missing.push('Promise')
  if (typeof Symbol === 'undefined') missing.push('Symbol')
  if (!supportsCustomProps()) missing.push('CSS 变量')
  if (ua.engine === 'trident') missing.push('IE 内核')
  return missing
}

/** 非致命项：命中任意一条即进入简化模式 */
function collectLegacyReasons(ua: ParsedUA): string[] {
  const reasons: string[] = []

  if (window.__modernSyntax !== true) reasons.push('无 ES2020 语法支持')
  if (!supportsBackdropFilter()) reasons.push('无 backdrop-filter')
  if (typeof IntersectionObserver === 'undefined') reasons.push('无 IntersectionObserver')

  const { engine, version } = ua
  if (version === null) return reasons

  if (engine === 'chromium' && version < MIN_CHROMIUM) {
    reasons.push(`Chrome ${version} < ${MIN_CHROMIUM}`)
  } else if (engine === 'edge' && version < MIN_EDGE) {
    reasons.push(`Edge ${version} < ${MIN_EDGE}`)
  } else if (engine === 'webkit' && version < MIN_SAFARI) {
    reasons.push(`Safari ${version} < ${MIN_SAFARI}`)
  } else if (engine === 'gecko' && version < MIN_FIREFOX) {
    reasons.push(`Firefox ${version} < ${MIN_FIREFOX}`)
  }

  return reasons
}

/* ------------------------------------------------------------------ */
/* 对外接口                                                            */
/* ------------------------------------------------------------------ */

function buildLabel(engine: BrowserEngine, version: number | null): string {
  const name = ENGINE_LABELS[engine]
  if (engine === 'trident') return 'Internet Explorer'
  if (version === null) return name
  // WebKit 的 version 是「主.次」合成值，显示时还原成一位小数
  if (engine === 'webkit') return `${name} ${version.toFixed(1)}`
  return `${name} ${version}`
}

/**
 * 检测浏览器能力。
 *
 * 优先复用 `public/compat.js` 的结论 —— 它在主包之前运行，是运行时的事实来源，
 * 且能覆盖「主包压根没加载」的情形。缺失时（例如单元测试环境）再自行判定一遍。
 */
export function detectBrowser(): BrowserInfo {
  const cached = typeof window !== 'undefined' ? window.__browserCheck : undefined

  if (cached) {
    const engine = normalizeEngine(cached.engine)
    return {
      engine,
      version: cached.version,
      isUnsupported: cached.isUnsupported,
      isLegacy: cached.isLegacy,
      isIE: engine === 'trident',
      missing: cached.missing,
      label: buildLabel(engine, cached.version),
    }
  }

  const ua = parseUserAgent()
  const fatal = collectFatal(ua)
  const isUnsupported = fatal.length > 0
  const legacyReasons = isUnsupported ? [] : collectLegacyReasons(ua)

  return {
    engine: ua.engine,
    version: ua.version,
    isUnsupported,
    isLegacy: !isUnsupported && legacyReasons.length > 0,
    isIE: ua.engine === 'trident',
    missing: isUnsupported ? fatal : legacyReasons,
    label: buildLabel(ua.engine, ua.version),
  }
}

/**
 * 把检测结果同步到 <html> 上（幂等）。
 * compat.js 已挂过 `.is-legacy-browser`，这里主要是兜底与测试场景；
 * 不支持的浏览器根本走不到这里（主包不会执行），class 仅作标记。
 */
export function applyBrowserClasses(info: BrowserInfo): void {
  const root = document.documentElement
  root.classList.toggle('is-legacy-browser', info.isLegacy)
  root.classList.toggle('is-unsupported', info.isUnsupported)
}
