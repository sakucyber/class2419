/**
 * QA 静态服务器：模拟**不支持 HTTP Range** 的托管环境。
 *
 * 为什么需要它：生产环境的 Pages 会忽略 Range、返回 200 + 整个文件，
 * 而 Vite / 大多数本地服务器支持 206。只测本地服务器，永远走不到
 * 「整段预载成 Blob」那条路径 —— 而那恰好是线上视频能不能拖动进度条的关键。
 *
 * 用法：node scripts/qa-server.mjs [--root dist] [--port 4174]
 */
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

const args = process.argv.slice(2)
const getArg = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}
const ROOT = path.resolve(getArg('root', 'dist'))
const PORT = Number(getArg('port', '4174'))

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
}

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname)
  let file = path.join(ROOT, pathname)

  if (pathname.endsWith('/')) file = path.join(file, 'index.html')
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    // SPA 回退：无扩展名视为路由；有扩展名则老老实实 404（便于发现丢资源）
    if (path.extname(pathname)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('not found')
      return
    }
    file = path.join(ROOT, 'index.html')
  }

  const stat = fs.statSync(file)
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
    'Content-Length': stat.size,
    // 关键：明确告诉浏览器「不支持分段」，并忽略任何 Range 请求头
    'Accept-Ranges': 'none',
    'Cache-Control': 'no-store',
  })
  if (req.method === 'HEAD') {
    res.end()
    return
  }
  fs.createReadStream(file).pipe(res)
})

server.listen(PORT, () => {
  console.warn(`[qa-server] ${ROOT} -> http://127.0.0.1:${PORT}（不支持 Range）`)
})
