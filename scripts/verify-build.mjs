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
const precacheMatch = sw.match(/const PRECACHE = \[([\s\S]*?)\]\n/)
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

if (!/"start_url": "\."/.test(manifest) || !/"scope": "\."/.test(manifest)) {
  failures.push('manifest 的 start_url / scope 不是相对路径（子路径部署会错）')
}

const report = [
  `dist 文件：${fs.existsSync(path.join(dist, 'index.html')) ? 'ok' : 'missing'}`,
  `预缓存条目：${precacheEntries.length}`,
  `缓存后缀：${cacheMatch ? cacheMatch[1] : '未注入'}`,
]

if (failures.length) {
  console.error('构建自检失败：\n- ' + failures.join('\n- '))
  process.exit(1)
}
console.warn(report.join('\n'))
