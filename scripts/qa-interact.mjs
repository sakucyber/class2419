/**
 * 功能一致性回归（本地 QA 用）。
 *
 * 直接走 Chrome DevTools Protocol，不依赖 Playwright。每个断言对应一个用户可感知的
 * 功能点，用于证明重写前后功能没有丢失或改变：
 * - 首页：标题/班名、今日打卡（含本地累计）
 * - 导航与外观：风格面板、四套风格、主题三态、字号、强调色、动效/玻璃开关
 * - 搜索：浮层开关、真实键入有结果、Esc 关闭
 * - 相册：列表、分类筛选、排序、瀑布流、详情、灯箱（键盘切换/关闭）、收藏
 * - 文章：目录、目录跳转、阅读进度条、阅读位置恢复
 * - 视频：播放器挂载、源解析（有/无 Range 两种环境）、更多视频、进度记忆与续播
 * - 设置：风格卡、暗色令牌、备份导入（合并写入 + 列表可见）
 * - 其它：404 页、四种风格 × 四种视口的横向溢出
 *
 * 用法：
 *   node scripts/qa-interact.mjs --base http://localhost:5173
 *   node scripts/qa-interact.mjs --base http://127.0.0.1:4174 --expect-blob 1 --no-sw 1
 * 参数：
 *   --base        站点地址
 *   --port        CDP 端口（默认 9334）
 *   --expect-blob 1 表示服务器不支持 Range，断言播放器应整段预载为 blob
 *   --no-sw      1 表示注入 SW stub，避免离线缓存干扰"最新代码"断言
 *   --verbose    1 打印每一项的通过明细
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
const CHROME = getArg('chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe')
const PORT = Number(getArg('port', '9334'))
const EXPECT_BLOB = getArg('expect-blob', '0') === '1'
const NO_SW = getArg('no-sw', '0') === '1'
const VERBOSE = getArg('verbose', '0') === '1'
const REPORT = path.resolve(getArg('report', '.qa/interact-report.json'))
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cls2419-qa-'))

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
      errors.push(params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300))
    }
  },
])
listeners.set('Runtime.exceptionThrown', [
  (params) => {
    const d = params.exceptionDetails || {}
    const desc = d.exception?.description || d.text || 'unknown'
    errors.push(`[exception] ${desc} @ ${d.url || ''}:${d.lineNumber ?? ''}`.slice(0, 500))
  },
])

await send('Page.enable', {}, sessionId)
if (NO_SW) {
  // 只 stub 掉注册入口，不删除 navigator.serviceWorker 本身：
  // 应用里 `if ('serviceWorker' in navigator)` 之类的判断仍需成立，
  // 否则等于在测一个浏览器从未有过的环境。
  await send(
    'Page.addScriptToEvaluateOnNewDocument',
    {
      source:
        "Object.defineProperty(Navigator.prototype, 'serviceWorker', { get: () => ({ register: () => Promise.resolve(), addEventListener() {}, removeEventListener() {} }), configurable: true })",
    },
    sessionId,
  )
}
await send('Runtime.enable', {}, sessionId)
await send(
  'Emulation.setDeviceMetricsOverride',
  { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false },
  sessionId,
)

async function navigate(pathname) {
  const loaded = once('Page.loadEventFired')
  await send('Page.navigate', { url: BASE + pathname }, sessionId)
  await loaded
  await sleep(550)
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
  if (VERBOSE) console.log(`${pass ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`)
  else if (!pass) console.log(`✗ ${name} ${detail}`)
}

async function setSettings(patch) {
  await evalJs(
    `(() => { const raw = JSON.parse(localStorage.getItem('cls2419:settings') || '{}'); localStorage.setItem('cls2419:settings', JSON.stringify(Object.assign({style:'annual',theme:'light',accent:'auto',fontSize:'md',animations:true,glass:true}, raw, ${JSON.stringify(patch)}))); })()`,
  )
}

await navigate('/')
await setSettings({ style: 'annual', theme: 'light', accent: 'auto' })
await navigate('/')

check('首页标题', (await evalJs('document.title')).includes('首页'), await evalJs('document.title'))
check('首页班名', (await evalJs('document.querySelector("h1").innerText')).includes('2419'))

// 今日打卡（纯本地，无后端）
await evalJs('document.querySelector(".checkin-btn")?.click()')
await sleep(250)
check('今日打卡生效', await evalJs('!!document.querySelector(".checkin-done")'))
const checkin = await evalJs('JSON.parse(localStorage.getItem("cls2419:checkin") || "{}")')
check('打卡写入本地', checkin.total >= 1 && !!checkin.lastDate, JSON.stringify(checkin))

// 风格切换
await evalJs('document.querySelector(\'button[aria-label="切换视觉风格"]\').click()')
await sleep(150)
check('风格面板打开', await evalJs('!!document.querySelector(".panel")'))
await evalJs(
  'Array.from(document.querySelectorAll(".panel .style-item")).find((el) => el.innerText.includes("Japandi")).click()',
)
await sleep(250)
check('切换到 Japandi', (await evalJs('document.documentElement.dataset.style')) === 'japandi')
check(
  '风格写入本地设置',
  (await evalJs('JSON.parse(localStorage.getItem("cls2419:settings")).style')) === 'japandi',
)

// 主题三态：auto -> light -> dark
await evalJs('document.querySelector(\'button[aria-label^="主题"]\').click()')
await sleep(120)
await evalJs('document.querySelector(\'button[aria-label^="主题"]\').click()')
await sleep(200)
check('切换到暗色', (await evalJs('document.documentElement.dataset.theme')) === 'dark')

// 搜索浮层（用真实键入事件，避免只改 value 不触发框架的响应式）
await evalJs('document.querySelector(\'button[aria-label="全站搜索"]\').click()')
await sleep(200)
check('搜索浮层打开', await evalJs('!!document.querySelector(".search-overlay")'))
await evalJs('document.querySelector(".search-overlay input").focus()')
await send('Input.insertText', { text: '测试' }, sessionId)
await sleep(400)
const searchDebug = await evalJs(`(() => {
  const input = document.querySelector('.search-overlay input')
  return { value: input ? input.value : null, count: document.querySelectorAll('.search-overlay .list .item').length }
})()`)
const searchCount = searchDebug.count
check('搜索有结果', searchCount >= 3, `count=${searchCount} value=${JSON.stringify(searchDebug.value)}`)
// 键盘导航：↓ 高亮第一条，Enter 直达并关闭浮层
await send(
  'Input.dispatchKeyEvent',
  { type: 'keyDown', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40 },
  sessionId,
)
await sleep(180)
check('搜索方向键高亮', await evalJs('!!document.querySelector(".search-overlay .item.is-active")'))
await send(
  'Input.dispatchKeyEvent',
  { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 },
  sessionId,
)
await sleep(500)
check(
  '搜索 Enter 直达',
  (await evalJs('location.pathname')) !== '/' &&
    !(await evalJs('!!document.querySelector(".search-overlay")')),
  await evalJs('location.pathname'),
)
// 重新打开浮层，验证 Esc 关闭
await evalJs('document.querySelector(\'button[aria-label="全站搜索"]\')?.click()')
await sleep(300)
await send(
  'Input.dispatchKeyEvent',
  { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 },
  sessionId,
)
await sleep(250)
check('Esc 关闭搜索', !(await evalJs('!!document.querySelector(".search-overlay")')))

// 相册筛选 / 排序 / 瀑布流
await navigate('/albums')
const allCards = await evalJs('document.querySelectorAll(".album-card").length')
check('相册列表渲染', allCards === 5, `count=${allCards}`)
await evalJs(
  'Array.from(document.querySelectorAll(".toolbar .chip")).find((el) => el.innerText.trim() === "测试分类二").click()',
)
await sleep(250)
const catCards = await evalJs('document.querySelectorAll(".album-card").length')
check('分类筛选生效', catCards > 0 && catCards < allCards, `after=${catCards}`)
await evalJs(
  'Array.from(document.querySelectorAll(".toolbar .chip")).find((el) => el.innerText.trim() === "全部").click()',
)
await sleep(200)
await evalJs(`(() => {
  const sel = document.querySelector('.sort-box select')
  sel.value = 'oldest'
  sel.dispatchEvent(new Event('change', { bubbles: true }))
})()`)
await sleep(250)
const firstDate = await evalJs('document.querySelector(".album-card time").innerText')
check('最早优先排序', firstDate === '2024-09-12', `first=${firstDate}`)
await evalJs(
  'Array.from(document.querySelectorAll(".view-toggle .chip")).find((el) => el.innerText.includes("瀑布流")).click()',
)
await sleep(250)
check('瀑布流布局', await evalJs('!!document.querySelector(".masonry")'))

// 相册详情 + 灯箱 + 收藏
await evalJs('document.querySelector(".album-card").click()')
await sleep(500)
const albumUrl = await evalJs('location.pathname')
check('进入相册详情', albumUrl.startsWith('/albums/alb-'), albumUrl)
await evalJs('document.querySelector(".photo").click()')
await sleep(250)
check('灯箱打开', await evalJs('!!document.querySelector(".lightbox")'))
const counterBefore = await evalJs('document.querySelector(".lightbox .counter").innerText')
await send(
  'Input.dispatchKeyEvent',
  { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 },
  sessionId,
)
await sleep(200)
const counterAfter = await evalJs('document.querySelector(".lightbox .counter").innerText')
check('灯箱键盘切换', counterBefore !== counterAfter, `${counterBefore} -> ${counterAfter}`)
await send(
  'Input.dispatchKeyEvent',
  { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 },
  sessionId,
)
await sleep(250)
check('Esc 关闭灯箱', !(await evalJs('!!document.querySelector(".lightbox")')))

await evalJs('document.querySelector(".media-actions .action-btn").click()')
await sleep(200)
const favKeys = await evalJs('Object.keys(JSON.parse(localStorage.getItem("cls2419:favorites") || "{}"))')
check('收藏写入本地', favKeys.some((k) => k.startsWith('album:')), JSON.stringify(favKeys))
await navigate('/favorites')
check('收藏页展示', (await evalJs('document.querySelectorAll(".fav-item").length')) >= 1)

// 文章目录 / 阅读进度 / 阅读位置恢复
await navigate('/articles/art-1')
const tocCount = await evalJs('document.querySelectorAll(".toc-link").length')
check('文章目录渲染', tocCount >= 2, `toc=${tocCount}`)
await evalJs('document.querySelectorAll(".toc-link")[1].click()')
await sleep(700)
const scrollY = await evalJs('window.scrollY')
check('目录跳转滚动', scrollY > 100, `y=${scrollY}`)
check('阅读进度条出现', await evalJs('!!document.querySelector(".read-progress")'))
await navigate('/articles')
await navigate('/articles/art-1')
await sleep(700)
const restoredY = await evalJs('window.scrollY')
check('阅读位置恢复', restoredY > 100, `y=${restoredY}`)

// 视频详情（无 Range 的环境需要等它整段预载成 Blob）
await navigate('/videos/vid-neko')
let videoInfo = { exists: false, src: '', related: 0, hint: '' }
for (let i = 0; i < 30; i += 1) {
  videoInfo = await evalJs(`(() => {
    const v = document.querySelector('video.video-el')
    const hint = document.querySelector('.player .hint')
    return {
      exists: !!v,
      src: v ? v.src : '',
      related: document.querySelectorAll('.side-list .video-card').length,
      hint: hint ? hint.innerText : '',
    }
  })()`)
  if (!EXPECT_BLOB || videoInfo.src.startsWith('blob:')) break
  await sleep(500)
}
check('视频元素渲染', videoInfo.exists)
check(
  EXPECT_BLOB ? '无 Range 时整段预载为 Blob' : '视频源已解析',
  videoInfo.src.startsWith('blob:') || (!EXPECT_BLOB && videoInfo.src.startsWith('http')),
  `${videoInfo.src.slice(0, 48)} hint=${videoInfo.hint}`,
)
check('更多视频列出全部', videoInfo.related === 9, `related=${videoInfo.related}`)

// 播放进度记忆：currentTime 变化后由定时器落盘，再打开应续播
let duration = 0
for (let i = 0; i < 20; i += 1) {
  duration = await evalJs('document.querySelector("video.video-el")?.duration ?? 0')
  if (duration > 0) break
  await sleep(300)
}
await evalJs(`(() => {
  const v = document.querySelector('video.video-el')
  if (!v) return
  v.currentTime = 12
  v.dispatchEvent(new Event('timeupdate'))
})()`)
await sleep(4600)
const savedProgress = await evalJs(
  'JSON.parse(localStorage.getItem("cls2419:videoProgress") || "{}")["vid-neko"]',
)
check('视频进度写入本地', !!savedProgress && savedProgress.time >= 10, JSON.stringify(savedProgress || null))
await navigate('/videos/vid-neko')
let resumed = 0
for (let i = 0; i < 24; i += 1) {
  resumed = await evalJs('document.querySelector("video.video-el")?.currentTime ?? 0')
  if (resumed >= 10) break
  await sleep(400)
}
check('重新打开续播', resumed >= 10, `t=${resumed}`)

// 设置页：风格 + 暗色令牌
await navigate('/settings')
await evalJs(
  'Array.from(document.querySelectorAll(".style-card")).find((el) => el.innerText.includes("硬边杂志")).click()',
)
await sleep(250)
check('设置页切换风格', (await evalJs('document.documentElement.dataset.style')) === 'brutal')
await evalJs('document.querySelectorAll(".seg")[0].querySelectorAll(".seg-btn")[1].click()')
await sleep(250)
check('设置页切换暗色', (await evalJs('document.documentElement.dataset.theme')) === 'dark')
const accentInk = await evalJs(
  'getComputedStyle(document.documentElement).getPropertyValue("--accent-ink").trim()',
)
check('粗野暗色文字色可读', accentInk === '#ffd23f', accentInk)

// 字号 / 强调色 / 动效 / 玻璃
await evalJs('document.querySelectorAll(".seg")[1].querySelectorAll(".seg-btn")[2].click()')
await sleep(200)
check(
  '字号切换',
  (await evalJs('document.documentElement.dataset.fontSize')) === 'lg',
  await evalJs('getComputedStyle(document.documentElement).fontSize'),
)
await evalJs(
  'Array.from(document.querySelectorAll(".option")).find((el) => el.innerText.includes("活力橙")).click()',
)
await sleep(200)
check('强调色切换', (await evalJs('document.documentElement.dataset.accent')) === 'orange')
const switches = await evalJs('document.querySelectorAll(".block .switch").length')
check('外观开关存在', switches >= 2, `switches=${switches}`)
await evalJs('document.querySelectorAll(".block .switch")[0].click()')
await sleep(200)
check('关闭动效', await evalJs('document.documentElement.classList.contains("no-animations")'))
await evalJs('document.querySelectorAll(".block .switch")[1].click()')
await sleep(200)
check('关闭玻璃', await evalJs('document.documentElement.classList.contains("no-glass")'))
// 复原，避免影响后续断言与截图
await evalJs('document.querySelectorAll(".block .switch")[0].click()')
await evalJs('document.querySelectorAll(".block .switch")[1].click()')
await evalJs('document.querySelectorAll(".seg")[1].querySelectorAll(".seg-btn")[1].click()')
await sleep(200)

// 备份导入（合并写入 localStorage，并应立即出现在列表里）
await navigate('/settings')
await evalJs(`(() => {
  const payload = {
    version: 2,
    data: {
      albums: [{
        id: 'qa-import', title: '导入测试相册', description: '由 QA 脚本导入',
        cover: '/images/albums/jxsg-1.svg', category: '测试', tags: [], photos: [],
        author: 'QA', createdAt: '2026-01-01T00:00:00.000Z', source: 'user'
      }],
      videos: [], articles: [], announcements: []
    }
  }
  const file = new File([JSON.stringify(payload)], 'backup.json', { type: 'application/json' })
  const dt = new DataTransfer()
  dt.items.add(file)
  const input = document.querySelector('input[type=file]')
  input.files = dt.files
  input.dispatchEvent(new Event('change', { bubbles: true }))
})()`)
await sleep(700)
const importMessage = await evalJs('document.querySelector(".message")?.innerText || ""')
check('备份导入成功', importMessage.includes('导入完成'), importMessage)
await navigate('/albums')
check(
  '导入内容出现在列表',
  await evalJs(
    'Array.from(document.querySelectorAll(".album-card .title")).some((el) => el.innerText.includes("导入测试相册"))',
  ),
)

// 404
await navigate('/this-page-does-not-exist')
check('404 页面', (await evalJs('document.querySelector("h1").innerText')).includes('走丢'))

// 横向溢出检查（四种风格 × 四种视口）
const styles = ['campus', 'annual', 'japandi', 'brutal', 'legacy']
const overflow = []
for (const width of [360, 390, 768, 1440]) {
  await send(
    'Emulation.setDeviceMetricsOverride',
    { width, height: width === 390 ? 844 : 1000, deviceScaleFactor: 1, mobile: width < 768 },
    sessionId,
  )
  for (const style of styles) {
    await navigate('/')
    await setSettings({ style, theme: 'light', accent: 'auto' })
    await navigate('/')
    const over = await evalJs('document.documentElement.scrollWidth - window.innerWidth')
    if (over > 1) overflow.push(`${style}@${width}: +${over}px`)
  }
}
check('无横向溢出', overflow.length === 0, overflow.join(', '))

// 复位
await setSettings({ style: 'annual', theme: 'light', accent: 'auto' })

const failed = results.filter((r) => !r.pass)
fs.mkdirSync(path.dirname(REPORT), { recursive: true })
fs.writeFileSync(REPORT, JSON.stringify({ results, errors }, null, 2))

console.log(`\n功能回归：${results.length - failed.length}/${results.length} 通过`)
if (failed.length) console.log('失败项：', failed.map((f) => f.name).join(' | '))
if (errors.length) console.log('控制台错误：', errors.slice(0, 5))

ws.close()
chrome.kill()
try {
  fs.rmSync(profile, { recursive: true, force: true })
} catch {
  /* ignore */
}
process.exit(failed.length ? 1 : 0)
