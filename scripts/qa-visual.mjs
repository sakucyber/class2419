/**
 * 视觉回归 / 截图脚本（本地 QA 用，不参与构建）。
 *
 * 为什么不用 Playwright：项目没有引入浏览器自动化依赖，而 Chrome 自带 CDP。
 * 这里直接连 DevTools Protocol，零额外依赖，也能顺手收集控制台错误。
 *
 * 用法：
 *   node scripts/qa-visual.mjs --base http://localhost:5173 --out .qa/shots
 *
 * 输出：
 *   <out>/<style>-<theme>-<page>.png
 *   <out>/report.json  （控制台错误 / 页面高度 / 标题）
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const args = process.argv.slice(2)
const getArg = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}

const BASE = getArg('base', 'http://localhost:5173')
const OUT = path.resolve(getArg('out', '.qa/shots'))
const CHROME = getArg('chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe')
const PORT = Number(getArg('port', '9333'))
const STYLES = getArg('styles', 'campus,annual,japandi,brutal,legacy').split(',')
const PAGE_FILTER = getArg('pages', '').split(',').filter(Boolean)

fs.mkdirSync(OUT, { recursive: true })
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cls2419-cdp-'))

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--window-size=1440,1000',
    'about:blank',
  ],
  { stdio: 'ignore' },
)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitForDevtools() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`)
      if (res.ok) return res.json()
    } catch {
      /* 还没起来 */
    }
    await sleep(150)
  }
  throw new Error('Chrome DevTools 未就绪')
}

const version = await waitForDevtools()
const ws = new WebSocket(version.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true })
  ws.addEventListener('error', reject, { once: true })
})

let seq = 0
const pending = new Map()
const listeners = new Map()

ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data)
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id)
    pending.delete(msg.id)
    if (msg.error) reject(new Error(`${msg.error.message} (${msg.method || ''})`))
    else resolve(msg.result)
    return
  }
  const list = listeners.get(msg.method)
  if (list) list.forEach((fn) => fn(msg.params, msg.sessionId))
})

function send(method, params = {}, sessionId) {
  const id = (seq += 1)
  const payload = { id, method, params }
  if (sessionId) payload.sessionId = sessionId
  ws.send(JSON.stringify(payload))
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
}

function once(method, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`等待 ${method} 超时`)), timeout)
    const fn = (params) => {
      clearTimeout(timer)
      const arr = listeners.get(method) || []
      listeners.set(
        method,
        arr.filter((item) => item !== fn),
      )
      resolve(params)
    }
    listeners.set(method, [...(listeners.get(method) || []), fn])
  })
}

const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })

const errors = []
listeners.set('Runtime.consoleAPICalled', [
  (params) => {
    if (params.type === 'error') {
      errors.push(
        params.args
          .map((a) => a.value ?? a.description ?? a.unserializableValue ?? '')
          .join(' ')
          .slice(0, 400),
      )
    }
  },
])
listeners.set('Log.entryAdded', [
  (params) => {
    if (params.entry.level === 'error') errors.push(`[log] ${params.entry.text}`.slice(0, 400))
  },
])
listeners.set('Runtime.exceptionThrown', [
  (params) => {
    errors.push(`[exception] ${params.exceptionDetails?.text ?? 'unknown'}`.slice(0, 400))
  },
])

await send('Page.enable', {}, sessionId)
await send('Runtime.enable', {}, sessionId)
await send('Log.enable', {}, sessionId)
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
}, sessionId)

async function navigate(url) {
  const loaded = once('Page.loadEventFired')
  await send('Page.navigate', { url }, sessionId)
  await loaded
  await sleep(700)
}

async function applySettings(style, theme) {
  await send(
    'Runtime.evaluate',
    {
      expression: `localStorage.setItem('cls2419:settings', JSON.stringify({style:'${style}',theme:'${theme}',accent:'auto',fontSize:'md',animations:true,glass:true}))`,
    },
    sessionId,
  )
}

async function shot(name, { full = false } = {}) {
  let clip
  if (full) {
    const metrics = await send('Page.getLayoutMetrics', {}, sessionId)
    const size = metrics.cssContentSize
    clip = { x: 0, y: 0, width: Math.ceil(size.width), height: Math.ceil(size.height), scale: 1 }
  }
  // Service Worker 首次接管时页面会被换掉一帧，此时截图会抛
  // "Inspected target navigated or closed"。等一拍重试即可，不必让整轮跑挂。
  for (let attempt = 0; ; attempt += 1) {
    try {
      const { data } = await send(
        'Page.captureScreenshot',
        { format: 'png', captureBeyondViewport: full, ...(clip ? { clip } : {}) },
        sessionId,
      )
      fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(data, 'base64'))
      return
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (attempt >= 3 || !/navigated or closed|Target closed/i.test(message)) throw err
      await sleep(600)
    }
  }
}

/** 先滚一遍页面，让 IntersectionObserver 把懒加载图片放出来，再回到顶部 */
async function settleLazyImages() {
  await send(
    'Runtime.evaluate',
    {
      expression: `(async () => {
        const step = Math.max(400, window.innerHeight * 0.8)
        const height = document.documentElement.scrollHeight
        for (let y = 0; y < height; y += step) {
          window.scrollTo(0, y)
          await new Promise((r) => setTimeout(r, 70))
        }
        window.scrollTo(0, 0)
        await new Promise((r) => setTimeout(r, 500))
      })()`,
      awaitPromise: true,
    },
    sessionId,
  )
}

const PAGES = [
  { key: 'home', path: '/' },
  { key: 'albums', path: '/albums' },
  { key: 'album-detail', path: '/albums/alb-military' },
  { key: 'videos', path: '/videos' },
  { key: 'video-detail', path: '/videos/vid-neko' },
  { key: 'articles', path: '/articles' },
  { key: 'article-detail', path: '/articles/art-1' },
  { key: 'about', path: '/about' },
  { key: 'search', path: '/search?q=%E6%B5%8B%E8%AF%95' },
  { key: 'favorites', path: '/favorites' },
  { key: 'settings', path: '/settings' },
  { key: 'not-found', path: '/this-page-does-not-exist' },
]

const report = []
const pages = PAGE_FILTER.length ? PAGES.filter((p) => PAGE_FILTER.includes(p.key)) : PAGES
let shotCount = 0

await navigate(BASE)
for (const style of STYLES) {
  for (const theme of ['light', 'dark']) {
    await applySettings(style, theme)
    for (const page of pages) {
      const before = errors.length
      await navigate(BASE + page.path)
      await settleLazyImages()
      await shot(`${style}-${theme}-${page.key}-top`)
      shotCount += 1
      if (page.key === 'home') {
        await shot(`${style}-${theme}-${page.key}`, { full: true })
        shotCount += 1
      }
      const title = await send(
        'Runtime.evaluate',
        { expression: 'document.title', returnByValue: true },
        sessionId,
      )
      const height = await send(
        'Runtime.evaluate',
        { expression: 'document.documentElement.scrollHeight', returnByValue: true },
        sessionId,
      )
      report.push({
        style,
        theme,
        page: page.key,
        title: title.result.value,
        height: height.result.value,
        errors: errors.slice(before),
      })
    }
  }
}

// 移动端：每种风格一张首页 + 一张列表页
await send(
  'Emulation.setDeviceMetricsOverride',
  { width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
  sessionId,
)
for (const style of STYLES) {
  await applySettings(style, 'light')
  for (const page of [
    { key: 'home', path: '/' },
    { key: 'albums', path: '/albums' },
  ]) {
    await navigate(BASE + page.path)
    await settleLazyImages()
    await shot(`mobile-${style}-${page.key}`)
    shotCount += 1
  }
}

if (getArg('metrics', '0') === '1') {
  await navigate(BASE + '/')
  await settleLazyImages()
  const metrics = await send(
    'Runtime.evaluate',
    {
      expression: `(() => {
        const read = (sel) => {
          const el = document.querySelector(sel)
          if (!el) return null
          const r = el.getBoundingClientRect()
          const cs = getComputedStyle(el)
          return { w: Math.round(r.width), h: Math.round(r.height), ar: cs.aspectRatio, cssH: cs.height, display: cs.display, order: cs.order }
        }
        return JSON.stringify({ hero: read('.hero'), media: read('.hero-media'), lazy: read('.hero-media .lazy-image'), img: read('.hero-media img'), body: read('.hero-body') })
      })()`,
      returnByValue: true,
    },
    sessionId,
  )
  console.log('[metrics]', metrics.result.value)
}

fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2))

console.log(`截图 ${shotCount} 张 -> ${OUT}`)
const withErrors = report.filter((r) => r.errors.length)
if (withErrors.length) {
  console.log(`⚠️ ${withErrors.length} 个页面有控制台错误：`)
  for (const item of withErrors.slice(0, 10)) {
    console.log(`- ${item.style}/${item.theme}/${item.page}: ${item.errors[0]}`)
  }
} else {
  console.log('控制台无错误')
}

ws.close()
chrome.kill()
try {
  fs.rmSync(profile, { recursive: true, force: true })
} catch {
  /* Windows 下偶发占用，忽略 */
}
process.exit(0)
