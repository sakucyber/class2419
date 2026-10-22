/* 极简 Service Worker：静态资源缓存 + 离线兜底（PWA 可选支持）
 *
 * 缓存策略按资源类型区分，避免「换掉的资源一直不更新」：
 * - 入口脚本          /compat.js、/probe-es2020.js —— **网络优先**（见下方说明）
 * - /assets/**      构建产物，文件名带内容哈希（index-CCYV0Syo.css），内容变了文件名就变
 *                   → 缓存优先，可以认为是不可变的
 * - 其余同源资源     文件名不带哈希（如 /images/carousel/test-1.svg），
 *                   用 stale-while-revalidate：先返缓存保证快，后台同时拉新并写回缓存，
 *                   下次访问即最新。否则一旦图片更新，老访客会永远看到旧图。
 * - 导航请求        网络优先，失败时回退 index.html（离线也能打开）
 *
 * 为什么入口脚本必须网络优先：
 * 它们是「页面能不能正常渲染」的前置判断逻辑，和 index.html 的结构强耦合。
 * 若沿用 stale-while-revalidate（先返缓存），脚本更新后的**第一次访问**仍会执行旧版，
 * 于是出现「旧判断逻辑 + 新 HTML」的错配 —— 例如旧版把降级内容写到已被删掉的容器里，
 * 两边都不匹配就是白屏。入口逻辑宁可慢一点读网络，也不能用旧缓存。
 */
const CACHE = 'cls2419-v4'

/** 入口级脚本：网络优先，仅离线时回退缓存 */
const ENTRY_SCRIPTS = ['/compat.js', '/probe-es2020.js']

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(caches.open(CACHE))
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
    /\.(mp4|m4v|webm|mov|mp3|m4a|ogg)$/i.test(url.pathname)
  ) {
    return
  }

  // 导航请求：网络优先，离线回退首页
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/index.html').then((r) => r || Response.error())),
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
            caches.open(CACHE).then((cache) => cache.put(req, clone))
          }
          return res
        })
        .catch(() => caches.match(req).then((r) => r || Response.error())),
    )
    return
  }

  // 带内容哈希的构建产物：缓存优先
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached
        return fetch(req).then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE).then((cache) => cache.put(req, clone))
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
            if (res.ok) cache.put(req, res.clone())
            return res
          })
          .catch(() => cached || Response.error())
        return cached || network
      }),
    ),
  )
})
