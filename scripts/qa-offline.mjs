/**
 * PWA 离线回归（本地 QA 用）。
 *
 * 验证三件事：
 * 1. Service Worker 注册成功，且 install 阶段把预缓存清单全部写进 Cache Storage；
 * 2. 断网后刷新仍能打开首页（导航回退到缓存的 index.html）；
 * 3. 断网后直接进入子路由（/albums）也能渲染，且图片来自缓存。
 *
 * 用法：node scripts/qa-offline.mjs --base http://127.0.0.1:4174
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
const BASE = getArg('base', 'http://127.0.0.1:4174')
const CHROME = getArg('chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe')
const PORT = Number(getArg('port', '9338'))
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cls2419-offline-'))

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
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
      /* not ready */
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
    if (msg.error) reject(new Error(msg.error.message))
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

function once(method, timeout = 30000) {
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
await send('Page.enable', {}, sessionId)
await send('Network.enable', {}, sessionId)
await send('Runtime.enable', {}, sessionId)
await send(
  'Emulation.setDeviceMetricsOverride',
  { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false },
  sessionId,
)

async function navigate(url) {
  const loaded = once('Page.loadEventFired')
  await send('Page.navigate', { url }, sessionId)
  await loaded
  await sleep(600)
}

async function evalJs(expression) {
  const res = await send(
    'Runtime.evaluate',
    { expression, returnByValue: true, awaitPromise: true },
    sessionId,
  )
  if (res.exceptionDetails) {
    const d = res.exceptionDetails
    throw new Error(d.exception?.description || d.text || 'JS 执行失败')
  }
  return res.result.value
}

const results = []
function check(name, pass, detail = '') {
  results.push({ name, pass, detail })
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`)
}

await navigate(BASE + '/')

// 等待 SW ready（precache 117 个资源，本地约 1MB）
const swState = await evalJs(`(async () => {
  if (!('serviceWorker' in navigator)) return { supported: false }
  const reg = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise((resolve) => setTimeout(() => resolve(null), 25000)),
  ])
  if (!reg) return { supported: true, ready: false }
  const keys = await caches.keys()
  const cacheName = keys.find((k) => k.startsWith('cls2419-v2-')) || ''
  const cache = cacheName ? await caches.open(cacheName) : null
  const entries = cache ? (await cache.keys()).map((r) => new URL(r.url).pathname) : []
  return {
    supported: true,
    ready: true,
    controller: !!navigator.serviceWorker.controller,
    cacheName,
    entries: entries.length,
    hasIndex: entries.some((p) => p.endsWith('/index.html')),
    hasThemeInit: entries.some((p) => p.endsWith('/theme-init.js')),
    hasImages: entries.filter((p) => p.includes('/images/')).length,
  }
})()`)

check('Service Worker 支持', swState.supported, JSON.stringify(swState))
check('SW 已激活', swState.ready && swState.controller, swState.cacheName)
check('预缓存条目 ≥ 100', swState.entries >= 100, `${swState.entries}`)
check('预缓存含 index.html', swState.hasIndex)
check('预缓存含 theme-init.js', swState.hasThemeInit)
check('预缓存含相册图片', swState.hasImages >= 30, `images=${swState.hasImages}`)

// 断网：刷新首页
await send('Network.emulateNetworkConditions', {
  offline: true,
  latency: 0,
  downloadThroughput: 0,
  uploadThroughput: 0,
}, sessionId)
await sleep(300)
await navigate(BASE + '/')
const offlineHome = await evalJs(`({
  title: document.title,
  h1: document.querySelector('h1')?.innerText || '',
  albums: document.querySelectorAll('.album-card').length,
  style: document.documentElement.dataset.style,
})`)
check('离线刷新首页可渲染', offlineHome.h1.includes('2419'), JSON.stringify(offlineHome))
check('离线首页仍有内容卡片', offlineHome.albums >= 3, `albums=${offlineHome.albums}`)

// 断网：直接进子路由
await navigate(BASE + '/albums')
const offlineAlbums = await evalJs(`({
  title: document.title,
  cards: document.querySelectorAll('.album-card').length,
  imgs: Array.from(document.querySelectorAll('.album-card img')).filter((i) => i.complete && i.naturalWidth > 0).length,
})`)
check('离线子路由可渲染', offlineAlbums.cards >= 5, JSON.stringify(offlineAlbums))
check('离线相册图片可用', offlineAlbums.imgs >= 3, `loaded=${offlineAlbums.imgs}`)

const failed = results.filter((r) => !r.pass)
console.log(`\n离线回归：${results.length - failed.length}/${results.length} 通过`)
fs.writeFileSync('.qa/offline-report.json', JSON.stringify(results, null, 2))

ws.close()
chrome.kill()
try {
  fs.rmSync(profile, { recursive: true, force: true })
} catch {
  /* ignore */
}
process.exit(failed.length ? 1 : 0)
