/**
 * 构建产物自检：防止「构建成功但功能悄悄坏掉」。
 *
 * 检查项：
 * 1. index.html / sw.js 存在
 * 2. sw.js 的预缓存清单被注入且非空（PWA 离线能力依赖它）
 * 3. 缓存名带构建哈希（部署后能自动换新缓存）
 * 4. 预缓存里包含 index.html
 * 5. 预缓存里**不能出现视频**（十几 MB 不该进缓存）
 * 6. manifest 的 start_url / scope 是相对路径（子路径部署才不会错）
 * 7. _headers / robots.txt 存在
 *
 * 用法：`npm run build && npm run verify:build`（CI 里也会跑）
 */
import fs from 'node:fs'
import path from 'node:path'

const dist = path.resolve('dist')
const failures = []

const read = (rel) => {
  const file = path.join(dist, rel)
  if (!fs.existsSync(file)) {
    failures.push(`缺少 dist/${rel}`)
    return ''
  }
  return fs.readFileSync(file, 'utf8')
}

const index = read('index.html')
const sw = read('sw.js')
const manifest = read('manifest.webmanifest')
read('_headers')
read('robots.txt')

if (index && !index.includes('<div id="app">')) failures.push('index.html 缺少 #app 挂载点')

const cacheMatch = sw.match(/const CACHE = CACHE_PREFIX \+ '([0-9a-f]{10})'/)
// 行尾要容忍 CRLF：Windows 上 git 检出的是 \r\n，注入后的清单以 "]\r\n" 结尾，
// 写死 \n 会永远匹配不到，于是明明注入了 113 条也报「清单为空」
const precacheMatch = sw.match(/const PRECACHE = \[([\s\S]*?)\]\r?\n/)
const precacheEntries = precacheMatch
  ? [...precacheMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
  : []

if (!cacheMatch) failures.push('sw.js 的缓存名没有被注入构建哈希')
if (precacheEntries.length < 50) {
  failures.push(`sw.js 预缓存清单为空或过少（${precacheEntries.length} 条）`)
}
if (!precacheEntries.some((url) => url.endsWith('/index.html'))) {
  failures.push('sw.js 预缓存清单里没有 index.html（离线打开会白屏）')
}
if (precacheEntries.some((url) => /\.(mp4|m4v|webm|mov)$/i.test(url))) {
  failures.push('sw.js 预缓存清单里混进了视频（不应缓存大文件）')
}

/**
 * URL → dist 里的实际文件。
 *
 * 清单里的 URL 可能带部署 base（`/class2419/images/x.svg`），也可能就是根路径。
 * 从前往后逐段剥，第一个能命中真实文件的相对路径就是它 —— 比依赖 VITE_BASE 稳，
 * 因为自检脚本不保证和构建时用同一个环境变量。
 */
const resolveDistFile = (url) => {
  const rel = decodeURIComponent(url).replace(/^\/+/, '')
  const segs = rel.split('/')
  for (let i = 0; i < segs.length; i++) {
    const candidate = path.join(dist, ...segs.slice(i))
    try {
      if (fs.statSync(candidate).isFile()) return candidate
    } catch {
      /* 不存在就试下一个前缀 */
    }
  }
  return null
}

// SW 的 install 是逐条 fetch 且单条失败会静默跳过，所以「条数够」不等于「都缓存成功」
const missing = []
let precacheBytes = 0
for (const url of precacheEntries) {
  const file = resolveDistFile(url)
  if (!file) {
    missing.push(url)
    continue
  }
  precacheBytes += fs.statSync(file).size
}
if (missing.length) {
  const sample = missing.slice(0, 5).join(', ')
  failures.push(
    `预缓存清单里有 ${missing.length} 个 URL 在 dist 中不存在：${sample}${missing.length > 5 ? ' …' : ''}`,
  )
}
const precacheMB = precacheBytes / 1048576
if (precacheMB > 20) {
  failures.push(`预缓存体积 ${precacheMB.toFixed(1)} MB 超过上限 20 MB（移动端流量过重）`)
}

if (!/"start_url": "\."/.test(manifest) || !/"scope": "\."/.test(manifest)) {
  failures.push('manifest 的 start_url / scope 不是相对路径（子路径部署会错）')
}

// 8. 数据里引用的图片必须真的在 dist 里
//
// 为什么要单独查：`public/_redirects` 的 `/*  /index.html  200` 会把**缺失的图片也接住**，
// 返回 200 + HTML（实测 /images/does-not-exist.svg 就是 200 text/html）。
// 于是换素材、改名写错时，浏览器只是"图裂"，控制台不会有 404，不主动查根本发现不了。
const dataDir = path.resolve('src/data')
const refs = new Set()
if (fs.existsSync(dataDir)) {
  for (const name of fs.readdirSync(dataDir)) {
    if (!/\.(json|md)$/.test(name)) continue
    const file = path.join(dataDir, name)
    if (!fs.statSync(file).isFile()) continue
    const text = fs.readFileSync(file, 'utf8')
    for (const m of text.matchAll(/["'(]([^"'()\s]*\/images\/[^"'()\s]+)/g)) refs.add(m[1])
  }
}
const missingRefs = [...refs]
  .map((u) => u.slice(u.indexOf('/images/')))
  .filter((u) => !fs.existsSync(path.join(dist, u)))
if (missingRefs.length) {
  failures.push(
    `数据里引用的图片在 dist 中不存在：${missingRefs.slice(0, 5).join(', ')}` +
      (missingRefs.length > 5 ? ` 等 ${missingRefs.length} 个` : ''),
  )
}

const report = [
  `dist 文件：${fs.existsSync(path.join(dist, 'index.html')) ? 'ok' : 'missing'}`,
  `预缓存条目：${precacheEntries.length}（缺失 ${missing.length}）`,
  `预缓存体积：${precacheMB.toFixed(1)} MB`,
  `数据图片引用：${refs.size} 个（缺失 ${missingRefs.length}）`,
  `缓存后缀：${cacheMatch ? cacheMatch[1] : '未注入'}`,
]

if (failures.length) {
  console.error('构建自检失败：\n- ' + failures.join('\n- '))
  process.exit(1)
}
if (precacheMB > 10) {
  console.warn(`⚠️ 预缓存已达 ${precacheMB.toFixed(1)} MB，超过 10 MB 后首访会明显吃流量`)
}
console.warn(report.join('\n'))
