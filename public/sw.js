/* Service Worker：应用壳预缓存 + 离线可用 + 静态资源缓存
 *
 * ── 为什么需要「预缓存」而不是只做运行时缓存 ──
 * 浏览器的离线兜底只在**导航请求失败**时发生，而 SPA 的导航响应是 index.html。
 * 如果从不把 index.html 写进缓存，断网后 caches.match(INDEX) 永远落空 —— 装到桌面
 * 也只会看到白屏。所以 install 阶段由构建脚本注入一份 PRECACHE 清单，
 * 把 index.html、入口脚本、全部构建产物（js/css）和图片一次性写进缓存。
 *
 * 清单由 vite.config.ts 的 pwaPrecachePlugin 在构建时生成（含 base 前缀），
 * 缓存名带构建哈希：每次部署自动换新缓存，activate 时清掉旧的。
 * 视频（/videos/**）**不进预缓存**：动辄十几 MB，且走媒体 bypass。
 *
 * ⚠️ 所有写入缓存的响应都要经过 cacheFresh() 归一化（去掉 Content-Encoding /
 * Content-Length 后用解码 body 重建），否则带 br/gzip 的 HTML 缓存后离线导航会
 * 直接 ERR_FAILED —— 这是生产环境实测踩到的坑。
 *
 * 运行时策略：
 * - 入口脚本 compat.js / probe-es2020.js：网络优先，离线回退缓存
 * - /assets/**（文件名带构建哈希）：缓存优先
 * - 其他同源资源（图片、图标…）：stale-while-revalidate（已预缓存的直接命中）
 * - 导航：网络优先，失败时回退缓存的 index.html
 * - 媒体请求 / 带 Range 的请求：完全绕过（Cache API 只能存整份 200，
 *   经手一遍反而会让浏览器认为「不可分段」）
 */
const CACHE_PREFIX = 'cls2419-v2-'
// 构建时由 pwaPrecachePlugin 替换成构建哈希；开发/未注入时用 dev 占位
const CACHE = CACHE_PREFIX + '__SW_BUILD_ID__'
// PRECACHE_INJECT
const PRECACHE = []

/** 部署 base（'/' 或 '/仓库名/'）。SW 自身 URL 就带 base，从它推出来最可靠。 */
const BASE = new URL('./', self.location).pathname
const INDEX = BASE + 'index.html'
const ENTRY_SCRIPTS = [BASE + 'compat.js', BASE + 'probe-es2020.js']

/**
 * 写缓存前先「规范化」响应。
 *
 * 关键坑（生产实测）：CDN/Pages 返回的 HTML、JS、CSS 通常带
 * `Content-Encoding: br`（或 gzip），而 Cache API 存的是**解码后的 body**。
 * 把这份缓存响应原样再交还给浏览器时，头部与实际 body 对不上 ——
 * `fetch()` 还能读，但**导航请求**会直接 `net::ERR_FAILED`（离线打开白屏）。
 *
 * 处理：删掉编码/长度相关头，用解码后的 blob 重新构造 Response 再 put。
 */
async function cacheFresh(cache, key, response) {
  if (!response || !response.ok) return
  const headers = new Headers(response.headers)
  headers.delete('content-encoding')
  headers.delete('content-length')
  headers.delete('transfer-encoding')
  const body = await response.blob()
  await cache.put(
    key,
    new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    }),
  )
}

/** 预缓存单个 URL：绕过 HTTP 缓存，按 cacheFresh 的规则写入 */
async function precacheOne(cache, url) {
  try {
    const res = await fetch(url, { cache: 'reload' })
    await cacheFresh(cache, url, res)
  } catch {
    /* 单个资源失败不影响整体安装 */
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      await Promise.all(PRECACHE.map((url) => precacheOne(cache, url)))
      self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  // 仅处理同源请求
  if (url.origin !== self.location.origin) return

  /* 媒体请求（<video>/<audio>）与任何带 Range 的请求：完全不拦截，直接交给网络。
   *
   * 原因一：Cache API 只能缓存整份 200。一旦让缓存逻辑经手带 Range 的请求，
   * 浏览器可能拿到整份 200，从而认为「不可分段」→ 进度条拖不动。
   * 原因二：视频动辄十几 MB，也不该进 Cache Storage；没被缓存的请求还能走浏览器
   * 自己的磁盘缓存。
   * 另外，VideoDetailView 在不支持 Range 的托管上会整段 fetch 成 Blob——那条请求
   * 同样不该被 Service Worker 接住。 */
  if (
    req.destination === 'video' ||
    req.destination === 'audio' ||
    req.headers.has('range') ||
    /\.(mp4|m4v|webm|mov|mp3|m4a|ogg|m3u8|m4s|ts)$/i.test(url.pathname)
  ) {
    return
  }

  // 导航请求：网络优先，离线回退缓存的 index.html（PWA 离线打开的关键）
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(async () => {
        const cached = await caches.match(INDEX)
        return cached || Response.error()
      }),
    )
    return
  }

  // 入口级脚本：网络优先，仅离线时回退缓存（理由见文件头）
  if (ENTRY_SCRIPTS.indexOf(url.pathname) !== -1) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches
              .open(CACHE)
              .then((cache) => cacheFresh(cache, req, clone))
              .catch(() => undefined)
          }
          return res
        })
        .catch(() => caches.match(req).then((r) => r || Response.error())),
    )
    return
  }

  // 带内容哈希的构建产物：缓存优先
  if (url.pathname.startsWith(BASE + 'assets/')) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached
        return fetch(req).then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches
              .open(CACHE)
              .then((cache) => cacheFresh(cache, req, clone))
              .catch(() => undefined)
          }
          return res
        })
      }),
    )
    return
  }

  // 其余同源资源（图片、图标等）：stale-while-revalidate
  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res.ok) cacheFresh(cache, req, res.clone()).catch(() => undefined)
            return res
          })
          .catch(() => cached || Response.error())
        return cached || network
      }),
    ),
  )
})
