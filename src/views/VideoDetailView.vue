<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import LazyImage from '@/components/common/LazyImage.vue'
import MediaActions from '@/components/media/MediaActions.vue'
import VideoCard from '@/components/media/VideoCard.vue'
import { useContentStore } from '@/store/content'
import { useInteractionStore } from '@/store/interaction'
import { formatDate } from '@/utils/format'
import { resolveMediaUrl } from '@/utils/idb'

const route = useRoute()
const content = useContentStore()
const interaction = useInteractionStore()

const video = computed(() => content.getVideo(String(route.params.id)))
const resolvedSrc = ref<string>('')
const mediaError = ref(false)
const videoEl = ref<HTMLVideoElement | null>(null)
let saveTimer: ReturnType<typeof setInterval> | null = null

/* ── 分段请求（Range）兜底 ──
   这套部署**不支持 HTTP Range**：`Range: bytes=…` 被忽略，返回 200 + 整个文件，
   也没有 `Accept-Ranges`。后果是浏览器只能线性播放，进度条拖到未缓冲处会被弹回。
   绕法：把整段下载成 Blob 再交给 <video> —— Blob URL 是内存数据，
   定位不依赖服务器，可以随便拖。

   取舍：早先的做法是「直连秒开 + 后台换源」，同一支视频要下载两遍
   （流式播放一遍、Blob 再一遍，12–20 MB × 2）。现在改成一次到底：
   确认没有 Range 就先整段取回内存再交给播放器，过程显示进度，
   等不及可以点「边下边看」退回直连流式（能看，但不能拖）。 */
const loading = ref(false)
const loadPct = ref(0)
const loadedBytes = ref(0)
const totalBytes = ref(0)
/* 现状可见化：点了「边下边看」之后如果什么都不显示，用户既不知道还在不在下载，
   也不知道进度条到底能不能拖。所以把「直连流式」也做成一个显式状态，
   并用 element.seekable / buffered 如实反映，而不是靠猜。
   streamReason 区分「为什么退回流式」——体积/内存保护的情况下不该再劝人整段加载。 */
const streamReason = ref<'user' | 'auto' | 'guard' | null>(null)
const canSeek = ref(false)
const bufferedPct = ref(0)
let rangeSupport: boolean | null = null
let abortCtrl: AbortController | null = null
let blobUrl = ''
let rawUrl = ''

/** 整段预载的保护阈值：超过这个体积、或设备内存偏小，就不折腾，退回直连流式 */
const MAX_BLOB_BYTES = 30 * 1048576
const MIN_DEVICE_MEMORY = 4

function fmtMB(n: number): string {
  return n > 0 ? (n / 1048576).toFixed(1) : '0'
}

const loadLabel = computed(() =>
  totalBytes.value > 0
    ? `${loadPct.value}% · ${fmtMB(loadedBytes.value)}/${fmtMB(totalBytes.value)} MB`
    : `${loadPct.value}%`,
)

/** 只有在「确实拖不动」时才提示；一旦浏览器报告可定位，就闭嘴 */
const showStreamHint = computed(
  () => !loading.value && !seekFlash.value && streamReason.value !== null && !canSeek.value,
)

/** 直白写出「能否拖动」——这是用户最想知道的一件事，不该让他自己去试 */
const streamLabel = computed(() => {
  const buffer = bufferedPct.value > 0 ? ` · 已缓冲 ${bufferedPct.value}%` : ''
  return streamReason.value === 'guard'
    ? `文件较大，边下边看${buffer}`
    : `进度条暂不可拖${buffer}`
})

/* 从「拖不动」变成「拖得动」的那一下值得说一声，否则用户不会主动去试 */
const seekFlash = ref(false)
let seekFlashTimer: ReturnType<typeof setTimeout> | null = null
function flashSeekable() {
  seekFlash.value = true
  if (seekFlashTimer) clearTimeout(seekFlashTimer)
  seekFlashTimer = setTimeout(() => {
    seekFlash.value = false
  }, 2600)
}

type Probe = { ranged: boolean | null; size: number }

/**
 * 探测是否支持分段请求，并顺带拿到文件大小（服务器忽略 Range 时回的是完整文件，
 * Content-Length 就是真实大小）。结论整站一致，所以只探一次。
 *
 * 网络异常时返回 `ranged: null`（未知）而**不写入缓存**：
 * 否则一次临时断网就会让整个会话都按「不支持」处理，白白预载每支视频。
 */
async function probeSource(url: string): Promise<Probe> {
  if (rangeSupport !== null) return { ranged: rangeSupport, size: totalBytes.value }
  const ctrl = new AbortController()
  try {
    const res = await fetch(url, { headers: { Range: 'bytes=0-0' }, signal: ctrl.signal })
    rangeSupport = res.status === 206
    return { ranged: rangeSupport, size: Number(res.headers.get('Content-Length') || 0) }
  } catch {
    return { ranged: null, size: 0 }
  } finally {
    ctrl.abort() // 不支持 Range 时服务器会回整个文件，拿到响应头立刻掐断
  }
}

/** 设备内存偏小（iOS Safari 不解这个字段，按「不偏小」处理） */
function lowMemoryDevice(): boolean {
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  return typeof mem === 'number' && mem < MIN_DEVICE_MEMORY
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
  if (!rawUrl || loading.value) return
  const id = String(route.params.id)
  streamReason.value = null
  const ok = await fetchToBlob(rawUrl, id)
  if (!ok && route.params.id === id) streamReason.value = 'auto'
}

/**
 * 把播放器的真实能力同步到 UI。
 * `seekable` 是浏览器给的答案：没有 206 响应时它会是空区间，
 * 这时进度条拖到未缓冲处会被弹回，所以直接告诉用户「暂不可拖」比让他反复试更好。
 */
function syncPlaybackState() {
  const el = videoEl.value
  if (!el || !Number.isFinite(el.duration) || el.duration <= 0) return
  const lastSeekable = el.seekable.length ? el.seekable.end(el.seekable.length - 1) : 0
  const nextCanSeek = lastSeekable >= el.duration - 1
  // 之前拖不动、现在拖得动了：提示一下，不然用户不会主动去试
  if (nextCanSeek && !canSeek.value && streamReason.value !== null) flashSeekable()
  canSeek.value = nextCanSeek
  if (el.buffered.length) {
    const lastBuffered = el.buffered.end(el.buffered.length - 1)
    bufferedPct.value = Math.min(100, Math.max(0, Math.round((lastBuffered / el.duration) * 100)))
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
    // 用 ArrayBuffer 而不是 Uint8Array 拼装：TS 里 read() 给的是
    // Uint8Array<ArrayBufferLike>，赋给 Uint8Array 会因 SharedArrayBuffer 报错。
    // slice 顺带切成独立的 buffer，不会带着底层多余字节。
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
    if (route.params.id !== videoId) {
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

// 解析 idb: 引用；同源且确认不支持 Range 时，先整段取回再播（换可拖动的进度条）
async function resolve() {
  mediaError.value = false
  resolvedSrc.value = ''
  rawUrl = ''
  streamReason.value = null
  canSeek.value = false
  bufferedPct.value = 0
  releaseBlob()
  cancelLoad()
  const current = video.value
  if (!current?.src) return
  try {
    const url = await resolveMediaUrl(current.src)
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
    if (route.params.id !== current.id) return // 探测期间已经切走
    // 支持 Range：原生就能拖，不需要任何提示
    if (probe.ranged === true) {
      resolvedSrc.value = url
      return
    }
    // 体积过大 / 内存偏小：退回直连流式，宁可拖不动也不要把页面撑爆
    if (probe.size > MAX_BLOB_BYTES || lowMemoryDevice()) {
      streamReason.value = 'guard'
      resolvedSrc.value = url
      return
    }
    // 探测本身失败（网络抖动）时，不当作「不支持」缓存，但仍按直连播；
    // 等元数据到手再根据 seekable 决定要不要提示「暂不可拖」
    if (probe.ranged === null) {
      streamReason.value = 'auto'
      resolvedSrc.value = url
      return
    }
    const ok = await fetchToBlob(url, current.id)
    // 失败 / 被「边下边看」取消：退回直连。切走了就什么都不做，别覆盖新页面
    if (!ok && route.params.id === current.id) {
      if (streamReason.value !== 'user') streamReason.value = 'auto'
      resolvedSrc.value = url
    }
  } catch {
    mediaError.value = true
  }
}
resolve()

function onLoadedMetadata() {
  const el = videoEl.value
  if (!el || !video.value) return
  const saved = interaction.getVideoProgress(video.value.id)
  if (saved && saved.time > 1 && saved.time < (el.duration || Infinity) - 2) {
    el.currentTime = saved.time
  }
  syncPlaybackState()
  // 先清再设：切换视频时 loadedmetadata 会再次触发，不清会攒出一堆计时器
  stopTimer()
  saveTimer = setInterval(saveProgress, 4000)
}

function stopTimer() {
  if (saveTimer) {
    clearInterval(saveTimer)
    saveTimer = null
  }
}

/**
 * 路由参数变化时必须手动重置。
 *
 * Vue Router 对同一路由记录会**复用组件实例**，不会重新执行 setup ——
 * 所以 `resolve()` 只在首次进入时跑过一次，`resolvedSrc` 一直停在第一个视频上。
 * 表现就是：从「更多视频」点别的片子，标题/封面变了，**播放器还是原来那个**。
 */
watch(
  () => route.params.id,
  () => {
    saveProgress() // 先把上一个视频的进度落盘，再切
    stopTimer()
    mediaError.value = false
    resolvedSrc.value = ''
    streamReason.value = null
    canSeek.value = false
    bufferedPct.value = 0
    void resolve()
  },
)

function saveProgress() {
  const el = videoEl.value
  if (!el || !video.value || !el.duration) return
  interaction.setVideoProgress(video.value.id, el.currentTime, el.duration)
}

function onPause() {
  saveProgress()
}

onBeforeUnmount(() => {
  saveProgress()
  stopTimer()
  cancelLoad()
  releaseBlob()
  if (seekFlashTimer) clearTimeout(seekFlashTimer)
})

/** 更多视频：列出**全部**其他视频（不再只取 3 个） */
const related = computed(() => content.publicVideos.filter((v) => v.id !== video.value?.id))
</script>

<template>
  <div class="container page">
    <ErrorState v-if="content.error" :message="content.error" @retry="content.init()" />

    <EmptyState
      v-else-if="!content.loading && !video"
      icon="video"
      title="视频不存在"
      description="它可能已被删除，或链接不正确。"
      action-text="返回视频列表"
      action-to="/videos"
    />

    <template v-else-if="video">
      <nav class="crumbs" aria-label="面包屑">
        <RouterLink to="/">首页</RouterLink>
        <span aria-hidden="true">/</span>
        <RouterLink to="/videos">视频</RouterLink>
        <span aria-hidden="true">/</span>
        <span class="current">{{ video.title }}</span>
      </nav>

      <div class="layout">
        <div class="main">
          <div class="player card">
            <!-- 本地 / 直链视频 -->
            <video
              v-if="video.src && !mediaError"
              ref="videoEl"
              class="video-el"
              :poster="video.cover"
              controls
              playsinline
              preload="metadata"
              :src="resolvedSrc || undefined"
              @loadedmetadata="onLoadedMetadata"
              @durationchange="syncPlaybackState"
              @progress="syncPlaybackState"
              @timeupdate="syncPlaybackState"
              @pause="onPause"
              @ended="saveProgress"
            >
              您的浏览器不支持视频播放，请升级浏览器。
            </video>
            <div v-else-if="video.src && mediaError" class="player-fail">
              <EmptyState
                icon="video"
                title="视频源暂不可用"
                description="本地媒体可能已被清理，或当前浏览器禁止访问。"
              />
            </div>

            <!-- 外链播放器 -->
            <div v-else-if="video.embedUrl" class="embed-wrap">
              <iframe
                :src="video.embedUrl"
                :title="video.title"
                sandbox="allow-scripts allow-same-origin allow-presentation"
                allowfullscreen
                loading="lazy"
              ></iframe>
            </div>

            <!-- 仅跳转 -->
            <div v-else-if="video.externalUrl" class="external-card">
              <LazyImage
                :src="video.cover"
                :alt="video.title"
                aspect="16 / 9"
                radius="var(--radius-md)"
              />
              <a
                :href="video.externalUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="btn external-btn"
              >
                在新标签页打开外链视频 ↗
              </a>
            </div>

            <EmptyState v-else icon="video" title="暂无可播放的视频源" />

            <!-- 状态角标：整段加载中 / 只能边下边看 / 刚刚变成可拖，三种都压在右上角，不挡底部控件 -->
            <div v-if="loading" class="drag-hint" role="status">
              <span class="drag-dot" aria-hidden="true"></span>
              <span>整段加载 {{ loadLabel }}</span>
              <button class="drag-hint-skip" type="button" @click="skipBlob">边下边看</button>
            </div>
            <div v-else-if="showStreamHint" class="drag-hint" role="status">
              <span class="drag-dot drag-dot--idle" aria-hidden="true"></span>
              <span>{{ streamLabel }}</span>
              <button
                v-if="streamReason !== 'guard'"
                class="drag-hint-skip"
                type="button"
                @click="retryPreload"
              >
                加载整段
              </button>
            </div>
            <div v-if="seekFlash" class="drag-hint drag-hint--ok" role="status">
              <span>进度条现在可以拖了</span>
            </div>
          </div>

          <article class="info card">
            <div class="chips">
              <span class="chip chip--primary">{{ video.category }}</span>
              <span v-for="t in video.tags" :key="t" class="chip">#{{ t }}</span>
            </div>
            <h1>{{ video.title }}</h1>
            <p class="meta">
              <span class="meta-item"><AppIcon name="pencil" :size="15" /> {{ video.author }}</span>
              <time :datetime="video.createdAt">{{ formatDate(video.createdAt) }}</time>
              <span v-if="video.duration" class="meta-item"><AppIcon name="clock" :size="15" /> {{ video.duration }}</span>
            </p>
            <p class="desc">{{ video.description }}</p>
            <MediaActions :id="video.id" kind="video" :share-title="video.title" />
          </article>
        </div>

        <aside v-if="related.length" class="side" aria-label="更多视频">
          <div class="side-head">
            <h2 class="side-title">更多视频</h2>
            <RouterLink to="/videos" class="side-more">
              全部 {{ content.publicVideos.length }} 个 →
            </RouterLink>
          </div>
          <div class="side-list">
            <VideoCard v-for="v in related" :key="v.id" :video="v" />
          </div>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page {
  padding-top: var(--space-5);
}
.crumbs {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  font-size: 0.85rem;
  color: var(--text-3);
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
}
.crumbs .current {
  color: var(--text);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 50vw;
}

.layout {
  display: grid;
  gap: var(--space-5);
}
@media (min-width: 1024px) {
  .layout {
    grid-template-columns: minmax(0, 1fr) 300px;
    align-items: start;
  }
  .side {
    position: sticky;
    top: calc(var(--header-h) + 16px);
    /* 列出全部视频后会很长，给个上限并内部滚动，避免把整页拉长 */
    max-height: calc(100vh - var(--header-h) - 32px);
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-right: 4px;
  }
}

.player {
  position: relative;
  overflow: hidden;
  padding: 0;
  background: #0b1220;
}
.video-el {
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
  display: block;
}
/* 后台准备 Blob 源时的角标：压在右上角，不挡底部播放控件 */
.drag-hint {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: calc(100% - 20px);
  padding: 5px 6px 5px 12px;
  border-radius: var(--radius-full);
  background: rgba(8, 12, 24, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(10px);
  color: rgba(255, 255, 255, 0.92);
  font-size: 0.76rem;
  line-height: 1.4;
}
.drag-hint-skip {
  flex: none;
  padding: 2px 9px;
  border: 0;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  font-size: 0.72rem;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease);
}
.drag-hint-skip:hover {
  background: rgba(255, 255, 255, 0.3);
}
/* 下载中的脉动点：静止的胶囊会让人以为卡住了，有个在动的点才说明"还在走" */
.drag-dot {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22d3ee;
  animation: drag-pulse 1.1s var(--ease) infinite;
}
/* 边下边看时下载由播放器自己驱动，不该再冒充"正在下载" */
.drag-dot--idle {
  background: rgba(255, 255, 255, 0.5);
  animation: none;
}
@keyframes drag-pulse {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(0.85);
  }
  50% {
    opacity: 1;
    transform: scale(1.15);
  }
}
.drag-hint--ok {
  border-color: rgba(74, 222, 128, 0.5);
  background: rgba(8, 34, 22, 0.8);
  animation: hint-in var(--duration) var(--ease);
}
@keyframes hint-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
/* 窄屏：文案会变长（"进度条暂不可拖 · 已缓冲 42%"），收一档字号免得糊住画面 */
@media (max-width: 520px) {
  .drag-hint {
    gap: 6px;
    max-width: calc(100% - 16px);
    padding: 4px 5px 4px 9px;
    font-size: 0.7rem;
  }
  .drag-hint-skip {
    padding: 2px 7px;
    font-size: 0.66rem;
  }
}
.embed-wrap {
  position: relative;
  aspect-ratio: 16 / 9;
}
.embed-wrap iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: none;
}
.external-card {
  position: relative;
}
.external-btn {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  box-shadow: var(--shadow-2);
}
.player-fail {
  background: var(--card);
}

.info {
  padding: clamp(18px, 3vw, 26px);
  margin-top: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.info h1 {
  font-size: clamp(1.25rem, 3vw, 1.7rem);
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  color: var(--text-3);
  font-size: 0.85rem;
}
.desc {
  color: var(--text-2);
}

.side-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}
.side-title {
  font-size: 1rem;
  margin: 0;
  color: var(--text-2);
}
.side-more {
  flex: none;
  font-size: 0.78rem;
  color: var(--text-3);
  text-decoration: none;
  transition: color var(--duration) var(--ease);
}
.side-more:hover {
  color: var(--primary);
}
.side-list {
  display: grid;
  gap: var(--space-3);
}
</style>
