/**
 * Cloudflare Pages Function —— 给 /videos/* 补上 HTTP Range（分段请求）支持
 *
 * ── 为什么需要它 ──────────────────────────────────────────────
 * Cloudflare Pages 的静态资源服务**不处理 Range 请求头**，一律回 200 + 整个文件，
 * 也没有 Accept-Ranges（官方文档原话：
 * "Pages currently returns 200 responses for HTTP range requests"，
 *  https://developers.cloudflare.com/pages/platform/known-issues/ ）。
 *
 * 浏览器（Chrome / Safari / iOS）加载 <video> 时一定先发 "Range: bytes=0-"，
 * 期望拿到 206 + Content-Range。Pages 回 200 之后：
 *   - <video>.seekable 为空 → 进度条只能在线性缓冲范围内拖动，拖到未缓冲处会被弹回；
 *   - iOS Safari 甚至可能完全无法开始播放（它要求可分段）。
 *
 * ── 它做什么 ─────────────────────────────────────────────────
 * 只接管 /videos/* 的请求：从 Pages 的 ASSETS 绑定取出静态文件，按请求头里的
 * Range 在边缘切片，返回 206 + Content-Range / Content-Length / Accept-Ranges。
 * 没有 Range 的普通请求（以及 HEAD、304 等）原样转发给静态资源。
 *
 * 纯读取、无状态、不存储任何数据，站点依然是「无后端」的纯静态产物；
 * 这个文件只是补上 Pages 缺失的那一条 HTTP 语义。
 *
 * ── 成本 ─────────────────────────────────────────────────────
 * 一次分段请求会在边缘把 ASSETS 读一遍（同机房内网，不是外网带宽），
 * 用流式切片而不是 arrayBuffer 全量拷贝，内存占用与文件大小无关。
 * 文件本身建议保持 < 25 MiB（Pages 单文件上限），更大的视频请改用
 * Cloudflare R2 / Stream / 对象存储（它们原生支持 Range）。
 */

const RANGE_RE = /^bytes=(\d*)-(\d*)$/
const MEDIA_EXT_RE = /\.(mp4|m4v|webm|mov|ogv|mp3|m4a|aac|ogg|wav|flac)$/i
const DEFAULT_CONTENT_TYPE = 'application/octet-stream'

/**
 * 解析单段 Range。
 * 返回 { start, end } / { unsatisfiable: true } / null（null = 不处理，回整份）
 */
export function parseRange(header, total) {
  if (!header) return null
  const value = String(header).trim()
  // 多段 Range 视频播放器基本不会发，遇到就退回整份，避免实现 multipart
  if (value.indexOf(',') !== -1) return null
  const match = RANGE_RE.exec(value)
  if (!match) return null

  const rawStart = match[1]
  const rawEnd = match[2]
  if (rawStart === '' && rawEnd === '') return null

  let start
  let end
  if (rawStart === '') {
    // 后缀区间：bytes=-500 表示最后 500 字节
    const suffix = Number(rawEnd)
    if (!Number.isFinite(suffix) || suffix <= 0) return { unsatisfiable: true }
    start = Math.max(total - suffix, 0)
    end = total - 1
  } else {
    start = Number(rawStart)
    end = rawEnd === '' ? total - 1 : Math.min(Number(rawEnd), total - 1)
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
      return { unsatisfiable: true }
    }
  }
  if (start >= total) return { unsatisfiable: true }
  return { start, end }
}

/**
 * 把整份响应体裁成 [start, end] 字节，流式处理：不整段读进内存。
 * 读够 end 就取消上游读取，避免白读文件尾部。
 */
export function sliceStream(body, start, end) {
  const reader = body.getReader()
  let offset = 0
  let finished = false

  const close = (controller, reason) => {
    if (finished) return
    finished = true
    controller.close()
    reader.cancel(reason).catch(() => {})
  }

  return new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await reader.read()
        if (finished) return
        if (done) return close(controller)
        const chunkStart = offset
        offset += value.byteLength
        const from = Math.max(start - chunkStart, 0)
        const to = Math.min(end + 1 - chunkStart, value.byteLength)
        if (to > from) controller.enqueue(value.subarray(from, to))
        if (offset > end) close(controller)
      } catch (error) {
        finished = true
        controller.error(error)
      }
    },
    cancel(reason) {
      finished = true
      reader.cancel(reason).catch(() => {})
    },
  })
}

/** 原样转发，只补一个 Accept-Ranges，让客户端知道这里可以按段取 */
function passThrough(response) {
  const headers = new Headers(response.headers)
  headers.set('Accept-Ranges', 'bytes')
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

function buildHeaders(assetHeaders, range, total) {
  const headers = new Headers()
  headers.set('Content-Type', assetHeaders.get('Content-Type') || DEFAULT_CONTENT_TYPE)
  headers.set('Content-Range', 'bytes ' + range.start + '-' + range.end + '/' + total)
  headers.set('Content-Length', String(range.end - range.start + 1))
  headers.set('Accept-Ranges', 'bytes')
  headers.set('Access-Control-Allow-Origin', '*')

  const etag = assetHeaders.get('ETag')
  if (etag) headers.set('ETag', etag)
  const lastModified = assetHeaders.get('Last-Modified')
  if (lastModified) headers.set('Last-Modified', lastModified)
  const cacheControl = assetHeaders.get('Cache-Control')
  if (cacheControl) headers.set('Cache-Control', cacheControl)
  return headers
}

export async function onRequest(context) {
  try {
    return await serveRange(context)
  } catch {
    // 兜底：任何意外（包括切片出错）都退回 Pages 原生行为（200 + 整份）。
    // 视频还能看，只是拖不动，不会因为这段修复把页面弄挂。
    try {
      return await context.env.ASSETS.fetch(context.request)
    } catch {
      return new Response('video temporarily unavailable', { status: 500 })
    }
  }
}

async function serveRange(context) {
  const { request, env } = context
  const method = request.method.toUpperCase()
  const pathname = new URL(request.url).pathname

  // 只处理读取；POST/PUT 等交回静态资源（实际上会 405/404）
  if (method !== 'GET' && method !== 'HEAD') return env.ASSETS.fetch(request)
  // 只管媒体文件：/videos 这类 SPA 路由（若被 include 规则带进来）原样交给静态资源
  if (!MEDIA_EXT_RE.test(pathname)) return env.ASSETS.fetch(request)

  const rangeHeader = request.headers.get('Range')
  if (!rangeHeader) return passThrough(await env.ASSETS.fetch(request))

  // 取完整静态文件：不带 Range 去要，避免依赖（当前并不存在的）资源侧分段能力
  const asset = await env.ASSETS.fetch(new Request(request.url, { method: 'GET' }))
  if (!asset.ok) return asset
  // 本地 wrangler / 将来 Pages 原生支持 206 时：直接透传，别多此一举
  if (asset.status === 206) return asset

  const assetHeaders = asset.headers
  // 不存在的路径可能被 Pages 回退成 index.html（SPA）：别把 HTML 当成视频切片
  const contentType = assetHeaders.get('Content-Type') || ''
  if (!/^(video|audio)\//i.test(contentType) && !/^application\/octet-stream/i.test(contentType)) {
    return asset
  }
  const etag = assetHeaders.get('ETag')

  // If-Range 与当前实体不匹配（例如资源已更新）：按规范回整份 200
  const ifRange = request.headers.get('If-Range')
  if (ifRange) {
    const lastModified = assetHeaders.get('Last-Modified')
    const matches = (etag && ifRange === etag) || (lastModified && ifRange === lastModified)
    if (!matches) return passThrough(asset)
  }

  let total = Number(assetHeaders.get('Content-Length') || 0)
  let body = asset.body
  let buffer = null
  if (!total || !body) {
    // 缺少 Content-Length（例如走了压缩）时退回内存切片，保证语义正确
    buffer = await asset.arrayBuffer()
    total = buffer.byteLength
    body = null
  }

  const range = parseRange(rangeHeader, total)
  if (!range) return passThrough(asset)
  if (range.unsatisfiable) {
    return new Response(null, {
      status: 416,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Range': 'bytes */' + total,
        'Access-Control-Allow-Origin': '*',
      },
    })
  }

  const headers = buildHeaders(assetHeaders, range, total)
  if (method === 'HEAD') return new Response(null, { status: 206, headers })

  const payload = buffer
    ? buffer.slice(range.start, range.end + 1)
    : sliceStream(body, range.start, range.end)
  return new Response(payload, { status: 206, headers })
}
