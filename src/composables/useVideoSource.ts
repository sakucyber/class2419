/**
 * 视频源解析与「可拖动」保障。
 *
 * 背景（不要删掉这段，它解释了整段复杂度从哪来）：
 * 这套部署**不支持 HTTP Range** —— 带 `Range: bytes=…` 的请求被忽略，返回 200 +
 * 整个文件，也没有 `Accept-Ranges`。浏览器因此只能线性播放，进度条拖到未缓冲处会被弹回。
 *
 * 绕法：把整段下载成 Blob 再交给 <video>。Blob URL 是内存数据，定位不依赖服务器。
 * 代价是流量，所以拆成几条策略：
 *   1. 服务端真支持 Range → 直接原生播放，零额外成本；
 *   2. 体积 > 30MB 或设备内存 < 4GB → 退回直连流式（宁可拖不动，也不要把页面撑爆）；
 *   3. 省流量模式 / 弱网 → 不偷偷预载，把「要花多少 MB」摆出来让用户点；
 *   4. 其余情况 → 整段预载并显示进度，随时可点「边下边看」放弃；
 *   5. 「边下边看」把整段缓冲完之后，自动转一次 Blob，把已付出的流量变成可拖动的进度条
 *      （媒体元素里的 buffer 取不出字节，只能重新 fetch，通常命中 HTTP 缓存）。
 *
 * 这套逻辑原来整段写在 VideoDetailView 里（近 400 行，和模板、样式混在一起）。
 * 现在抽成 composable：视图只负责渲染，状态机可以单独推理与复用。
 */
import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue'

import { useInteractionStore } from '@/store/interaction'
import { resolveMediaUrl } from '@/utils/idb'

const MAX_BLOB_BYTES = 30 * 1048576
const MIN_DEVICE_MEMORY = 4
const SAVE_INTERVAL_MS = 4000

export type StreamReason = 'user' | 'auto' | 'guard' | 'save-data' | 'slow' | null

interface Options {
  /** 当前视频 id（路由参数） */
  id: Ref<string>
  /** 视频源地址（可能带 idb: 前缀） */
  source: Ref<string | undefined>
  /** 播放器元素，用于读取 seekable / currentTime */
  element: Ref<HTMLVideoElement | null>
  /** 切换视频前同步调用（先把上一个视频的进度落盘） */
  onBeforeSwitch?: () => void
}

function fmtMB(n: number): string {
  return n > 0 ? (n / 1048576).toFixed(1) : '0'
}

export function useVideoSource(options: Options) {
  const interaction = useInteractionStore()
  const { id, source, element } = options

  const resolvedSrc = ref('')
  const mediaError = ref(false)

  const loading = ref(false)
  const loadPct = ref(0)
  const loadedBytes = ref(0)
  const totalBytes = ref(0)
  const streamReason = ref<StreamReason>(null)
  const canSeek = ref(false)
  const bufferedPct = ref(0)
  const sourceBytes = ref(0)
  const upgrading = ref(false)
  const upgradePct = ref(0)
  const seekFlash = ref(false)

  let upgradeTried = false
  let pendingResumeAt = 0
  let pendingResumePlay = false
  /** 换源瞬间元素被重置会触发 pause，此刻 currentTime 已归零，不能存盘 */
  let swapping = false
  let abortCtrl: AbortController | null = null
  let blobUrl = ''
  let rawUrl = ''
  let seekFlashTimer: ReturnType<typeof setTimeout> | null = null

  const loadLabel = computed(() =>
    totalBytes.value > 0
      ? `${loadPct.value}% · ${fmtMB(loadedBytes.value)}/${fmtMB(totalBytes.value)} MB`
      : `${loadPct.value}%`,
  )

  const showStreamHint = computed(
    () =>
      !loading.value &&
      !upgrading.value &&
      !seekFlash.value &&
      streamReason.value !== null &&
      !canSeek.value,
  )

  const STREAM_TEXT = {
    'save-data': '省流量模式，未整段加载',
    slow: '网络较慢，未整段加载',
    guard: '文件较大，未整段加载',
    user: '进度条暂不可拖',
    auto: '进度条暂不可拖',
  } as const

  const streamLabel = computed(() => {
    const reason = streamReason.value
    if (!reason) return ''
    const buffer = bufferedPct.value > 0 ? ` · 已缓冲 ${bufferedPct.value}%` : ''
    return STREAM_TEXT[reason] + buffer
  })

  const loadCostLabel = computed(() =>
    sourceBytes.value > 0 ? `加载 ${fmtMB(sourceBytes.value)} MB` : '加载整段',
  )

  /**
   * 进入「边下边看」后必须把 preload 放开到 auto。
   * metadata 会让浏览器把缓冲卡在 ~35% 就不再往后取，自动升级永远等不到。
   */
  const videoPreload = computed(() =>
    streamReason.value === 'user' || streamReason.value === 'auto' ? 'auto' : 'metadata',
  )

  function flashSeekable() {
    seekFlash.value = true
    if (seekFlashTimer) clearTimeout(seekFlashTimer)
    seekFlashTimer = setTimeout(() => {
      seekFlash.value = false
    }, 2600)
  }

  type Probe = { ranged: boolean | null; size: number }

  /**
   * 探测是否支持分段请求，并顺带拿到文件大小。探测请求拿到响应头就 abort，
   * 不会真把文件下下来。网络异常返回 `ranged: null`（未知），
   * 不写任何「不支持」的结论 —— 否则一次临时断网会让整会话每支视频都白下一遍。
   */
  async function probeSource(url: string): Promise<Probe> {
    const ctrl = new AbortController()
    try {
      const res = await fetch(url, { headers: { Range: 'bytes=0-0' }, signal: ctrl.signal })
      return { ranged: res.status === 206, size: Number(res.headers.get('Content-Length') || 0) }
    } catch {
      return { ranged: null, size: 0 }
    } finally {
      ctrl.abort()
    }
  }

  function lowMemoryDevice(): boolean {
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
    return typeof mem === 'number' && mem < MIN_DEVICE_MEMORY
  }

  function networkWantsLight(): 'save-data' | 'slow' | null {
    const conn = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string }
      }
    ).connection
    if (!conn) return null
    if (conn.saveData) return 'save-data'
    if (conn.effectiveType && ['slow-2g', '2g', '3g'].includes(conn.effectiveType)) return 'slow'
    return null
  }

  function isSameOrigin(url: string): boolean {
    try {
      return new URL(url, location.href).origin === location.origin
    } catch {
      return false
    }
  }

  function cancelLoad() {
    abortCtrl?.abort()
    abortCtrl = null
    loading.value = false
  }

  function releaseBlob() {
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl)
      blobUrl = ''
    }
  }

  /** 不等了：放弃整段预载，改用直连地址边下边看（能看，但进度条拖不动） */
  function skipBlob() {
    cancelLoad()
    streamReason.value = 'user'
    if (rawUrl) resolvedSrc.value = rawUrl
  }

  /** 后悔了：从「边下边看」回到整段预载（失败就保持原样，不打断观看） */
  async function retryPreload() {
    if (!rawUrl || loading.value || upgrading.value) return
    const currentId = id.value
    streamReason.value = null
    const ok = await fetchToBlob(rawUrl, currentId)
    if (!ok && id.value === currentId) streamReason.value = 'auto'
  }

  /**
   * 把播放器的真实能力同步到 UI。`seekable` 是浏览器给的答案：
   * 没有 206 响应时它会是空区间，这时直接告诉用户「暂不可拖」比让他反复试更好。
   */
  function syncPlaybackState() {
    const el = element.value
    if (!el || !Number.isFinite(el.duration) || el.duration <= 0) return
    const duration = el.duration
    const lastSeekable = el.seekable.length ? el.seekable.end(el.seekable.length - 1) : 0
    const nextCanSeek = lastSeekable >= duration - 1
    if (nextCanSeek && !canSeek.value && streamReason.value !== null) flashSeekable()
    canSeek.value = nextCanSeek

    if (!el.buffered.length) return
    const lastBuffered = el.buffered.end(el.buffered.length - 1)
    // 用 floor：99.6% 就显示 99%，别提前显示 100%
    bufferedPct.value = Math.min(100, Math.max(0, Math.floor((lastBuffered / duration) * 100)))

    const fullyBuffered = el.buffered.start(0) <= 0.5 && lastBuffered >= duration - 0.5
    const upgradeable = streamReason.value === 'user' || streamReason.value === 'auto'
    if (fullyBuffered && !nextCanSeek && upgradeable && !upgrading.value && !upgradeTried) {
      void upgradeFromBuffer()
    }
  }

  /**
   * 「边下边看」走到底之后，把整段重新取回成 Blob，换成可拖动的进度条。
   * 为什么必须再 fetch 一次：媒体元素里的 buffer 拿不出字节。
   * 这一步通常命中 HTTP 缓存（/videos/* 有 7 天强缓存），实际多半不花流量。
   */
  async function upgradeFromBuffer() {
    if (!rawUrl || loading.value || upgrading.value || upgradeTried) return
    upgradeTried = true
    const currentId = id.value

    const ctrl = new AbortController()
    abortCtrl = ctrl
    upgrading.value = true
    upgradePct.value = 0
    try {
      const res = await fetch(rawUrl, { signal: ctrl.signal })
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
      const total = Number(res.headers.get('Content-Length') || 0)
      const reader = res.body.getReader()
      const chunks: ArrayBuffer[] = []
      let received = 0
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          chunks.push(
            value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer,
          )
          received += value.byteLength
          if (total > 0) upgradePct.value = Math.min(99, Math.round((received / total) * 100))
        }
      }
      if (id.value !== currentId) return
      const objUrl = URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' }))
      releaseBlob()
      blobUrl = objUrl
      // 位置必须在**换源这一刻**取：下载期间旧元素还在继续播
      const el = element.value
      pendingResumeAt = el && Number.isFinite(el.currentTime) ? el.currentTime : 0
      pendingResumePlay = el ? !el.paused && !el.ended : false
      swapping = true
      resolvedSrc.value = objUrl
    } catch {
      pendingResumeAt = 0
      pendingResumePlay = false
    } finally {
      if (abortCtrl === ctrl) abortCtrl = null
      upgrading.value = false
    }
  }

  /** 整段下载进内存；成功设成 Blob 源，返回是否成功 */
  async function fetchToBlob(url: string, videoId: string): Promise<boolean> {
    const ctrl = new AbortController()
    abortCtrl = ctrl
    loading.value = true
    loadPct.value = 0
    loadedBytes.value = 0
    totalBytes.value = 0
    try {
      const res = await fetch(url, { signal: ctrl.signal })
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
      const total = Number(res.headers.get('Content-Length') || 0)
      totalBytes.value = total
      const reader = res.body.getReader()
      const chunks: ArrayBuffer[] = []
      let received = 0
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          chunks.push(
            value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer,
          )
          received += value.byteLength
          loadedBytes.value = received
          if (total > 0) loadPct.value = Math.min(99, Math.round((received / total) * 100))
        }
      }
      const objUrl = URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' }))
      // 下载期间可能已经切到别的视频：这份数据不能塞给新页面
      if (id.value !== videoId) {
        URL.revokeObjectURL(objUrl)
        return false
      }
      releaseBlob()
      blobUrl = objUrl
      loadPct.value = 100
      resolvedSrc.value = objUrl
      return true
    } catch {
      loadPct.value = 0
      return false
    } finally {
      if (abortCtrl === ctrl) {
        abortCtrl = null
        loading.value = false
      }
    }
  }

  async function resolve() {
    mediaError.value = false
    resolvedSrc.value = ''
    rawUrl = ''
    streamReason.value = null
    canSeek.value = false
    bufferedPct.value = 0
    sourceBytes.value = 0
    upgrading.value = false
    upgradeTried = false
    pendingResumeAt = 0
    pendingResumePlay = false
    releaseBlob()
    cancelLoad()

    const src = source.value
    if (!src) return
    try {
      const url = await resolveMediaUrl(src)
      if (!url) {
        mediaError.value = true
        return
      }
      rawUrl = url
      // 已经是本地对象，或跨域外链（拿不到 body），直接播
      if (url.startsWith('blob:') || url.startsWith('data:') || !isSameOrigin(url)) {
        canSeek.value = url.startsWith('blob:') || url.startsWith('data:')
        resolvedSrc.value = url
        return
      }

      const probe = await probeSource(url)
      if (id.value !== currentIdOfSource(src)) return
      sourceBytes.value = probe.size

      if (probe.ranged === true) {
        resolvedSrc.value = url
        return
      }
      if (probe.size > MAX_BLOB_BYTES || lowMemoryDevice()) {
        streamReason.value = 'guard'
        resolvedSrc.value = url
        return
      }
      const light = networkWantsLight()
      if (light) {
        streamReason.value = light
        resolvedSrc.value = url
        return
      }
      if (probe.ranged === null) {
        streamReason.value = 'auto'
        resolvedSrc.value = url
        return
      }
      const currentId = id.value
      const ok = await fetchToBlob(url, currentId)
      if (!ok && id.value === currentId) {
        if (streamReason.value !== 'user') streamReason.value = 'auto'
        resolvedSrc.value = url
      }
    } catch {
      mediaError.value = true
    }
  }

  /** 探测期间路由可能已切走；用一个轻量快照比对，避免把旧结果写进新页面 */
  let sourceSnapshot = ''
  function currentIdOfSource(src: string): string {
    return sourceSnapshot || src
  }

  function onLoadedMetadata() {
    const el = element.value
    if (!el) return
    if (pendingResumeAt > 0) {
      el.currentTime = Math.min(pendingResumeAt, Math.max(0, (el.duration || pendingResumeAt) - 0.3))
      if (pendingResumePlay) void el.play().catch(() => {})
      pendingResumeAt = 0
      pendingResumePlay = false
    } else {
      const saved = interaction.getVideoProgress(id.value)
      if (saved && saved.time > 1 && saved.time < (el.duration || Infinity) - 2) {
        el.currentTime = saved.time
      }
    }
    swapping = false
    syncPlaybackState()
  }

  /** 换源窗口内不要存盘（currentTime 会短暂归零） */
  function canSaveProgress(): boolean {
    return !swapping
  }

  watch(
    () => [id.value, source.value] as const,
    ([nextId, nextSrc], prev) => {
      options.onBeforeSwitch?.()
      sourceSnapshot = nextId
      // 组件首次挂载时 prev 为 undefined；其余情况都视为切换
      if (prev) {
        pendingResumeAt = 0
        pendingResumePlay = false
      }
      if (nextSrc) void resolve()
      else resolvedSrc.value = ''
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    cancelLoad()
    releaseBlob()
    if (seekFlashTimer) clearTimeout(seekFlashTimer)
  })

  return {
    resolvedSrc,
    mediaError,
    loading,
    loadPct,
    loadedBytes,
    totalBytes,
    streamReason,
    canSeek,
    bufferedPct,
    sourceBytes,
    upgrading,
    upgradePct,
    seekFlash,
    loadLabel,
    streamLabel,
    showStreamHint,
    loadCostLabel,
    videoPreload,
    skipBlob,
    retryPreload,
    syncPlaybackState,
    onLoadedMetadata,
    canSaveProgress,
    SAVE_INTERVAL_MS,
  }
}
