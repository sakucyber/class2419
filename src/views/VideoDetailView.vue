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
   为了不让人干等：先用直连地址立刻能播，后台下完再静默换源（保留位置与播放状态）。 */
const loading = ref(false)
const loadPct = ref(0)
const loadedBytes = ref(0)
const totalBytes = ref(0)
let rangeSupport: boolean | null = null
let abortCtrl: AbortController | null = null
let blobUrl = ''
let pendingSeek = 0
let pendingPlay = false
/** 正在把源换成 Blob：此时元素被重置会触发 pause，不能把它当成"用户暂停"去存进度 */
let swapping = false

function fmtMB(n: number): string {
  return n > 0 ? (n / 1048576).toFixed(1) : '0'
}

const loadLabel = computed(() =>
  totalBytes.value > 0
    ? `${loadPct.value}% · ${fmtMB(loadedBytes.value)}/${fmtMB(totalBytes.value)} MB`
    : `${loadPct.value}%`,
)

/** 服务器是否支持分段请求。同一站点结论一致，只探一次。 */
async function supportsRange(url: string): Promise<boolean> {
  if (rangeSupport !== null) return rangeSupport
  const ctrl = new AbortController()
  try {
    const res = await fetch(url, { headers: { Range: 'bytes=0-0' }, signal: ctrl.signal })
    rangeSupport = res.status === 206
  } catch {
    // 探测失败保守当作不支持：多花点流量，但保证能拖
    rangeSupport = false
  } finally {
    ctrl.abort() // 不支持 Range 时服务器会回整个文件，拿到响应头立刻掐断
  }
  return rangeSupport
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

/** 换源到 Blob，并把播放位置与播放状态接过去 */
function swapToBlob(url: string) {
  const el = videoEl.value
  pendingSeek = el && Number.isFinite(el.duration) ? el.currentTime : 0
  pendingPlay = el ? !el.paused && !el.ended : false
  swapping = true
  resolvedSrc.value = url
}

/** 后台把整段下载进内存；成功后换源，换来可拖动的进度条 */
async function fetchToBlob(url: string) {
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
    releaseBlob()
    blobUrl = objUrl
    loadPct.value = 100
    swapToBlob(objUrl)
  } catch {
    // 取消或网络失败：保持直连，功能不回退
    loadPct.value = 0
  } finally {
    if (abortCtrl === ctrl) abortCtrl = null
    loading.value = false
  }
}

// 解析 idb: 引用；同源且不支持 Range 时再准备可拖动的 Blob 源
async function resolve() {
  mediaError.value = false
  resolvedSrc.value = ''
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
    resolvedSrc.value = url // 先用直连，立刻能播
    if (url.startsWith('blob:') || url.startsWith('data:')) return
    if (!isSameOrigin(url)) return // 跨域外链拿不到 body，不折腾
    if (await supportsRange(url)) return // 原生支持拖动，不需要这套
    if (route.params.id !== current.id) return // 探测期间已经切走
    void fetchToBlob(url)
  } catch {
    mediaError.value = true
  }
}
resolve()

function onLoadedMetadata() {
  const el = videoEl.value
  if (!el || !video.value) return
  const saved = interaction.getVideoProgress(video.value.id)
  const savedTime =
    saved && saved.time > 1 && saved.time < (el.duration || Infinity) - 2 ? saved.time : 0
  // 换源到 Blob 时优先回到换源那一刻的位置，其次才是上次记录的进度
  const target = pendingSeek > 0 ? pendingSeek : savedTime
  const resumePlaying = pendingPlay
  pendingSeek = 0
  pendingPlay = false
  if (target > 0 && (!el.duration || target < el.duration - 0.3)) el.currentTime = target
  if (resumePlaying) void el.play().catch(() => {})
  swapping = false
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
    pendingSeek = 0
    pendingPlay = false
    void resolve()
  },
)

function saveProgress() {
  const el = videoEl.value
  // 换源那一瞬元素会被重置、currentTime 归零；此时存盘会把进度抹掉
  if (swapping || !el || !video.value || !el.duration) return
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
              :src="resolvedSrc"
              @loadedmetadata="onLoadedMetadata"
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

            <!-- 服务器不支持 Range：后台整段下载成 Blob，完成后换源让进度条可拖 -->
            <div v-if="loading" class="drag-hint" role="status">
              <span>准备可拖动进度条 {{ loadLabel }}</span>
              <button class="drag-hint-skip" type="button" @click="cancelLoad">取消</button>
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
