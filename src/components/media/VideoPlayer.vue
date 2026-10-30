<script setup lang="ts">
/**
 * 视频播放器：把「源解析状态机」与视图分开。
 *
 * useVideoSource 负责「怎么拿到一个能拖动的源」，本组件只负责渲染与进度记忆。
 * 两者的接口只有 resolvedSrc / 状态布尔值 / 几个操作函数。
 */
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRoute } from 'vue-router'

import AppIcon from '@/components/common/AppIcon.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LazyImage from '@/components/common/LazyImage.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import { useVideoSource } from '@/composables/useVideoSource'
import { useInteractionStore } from '@/store/interaction'
import type { VideoItem } from '@/types'

const props = defineProps<{ video: VideoItem }>()

const route = useRoute()
const interaction = useInteractionStore()
const id = computed(() => String(route.params.id))
const source = computed(() => props.video.src)
const videoEl = ref<HTMLVideoElement | null>(null)

let saveTimer: ReturnType<typeof setInterval> | null = null

function saveProgress() {
  const el = videoEl.value
  if (!el || !el.duration) return
  if (!player.canSaveProgress()) return
  interaction.setVideoProgress(id.value, el.currentTime, el.duration)
}

function stopTimer() {
  if (saveTimer) {
    clearInterval(saveTimer)
    saveTimer = null
  }
}

const player = useVideoSource({
  id,
  source,
  element: videoEl,
  onBeforeSwitch: () => {
    saveProgress()
    stopTimer()
  },
})

const {
  resolvedSrc,
  mediaError,
  loading,
  loadPct,
  upgrading,
  upgradePct,
  seekFlash,
  loadLabel,
  streamLabel,
  showStreamHint,
  loadCostLabel,
  videoPreload,
  streamReason,
  skipBlob,
  retryPreload,
  syncPlaybackState,
  onLoadedMetadata,
  SAVE_INTERVAL_MS,
} = player

function handleMetadata() {
  onLoadedMetadata()
  stopTimer()
  saveTimer = setInterval(saveProgress, SAVE_INTERVAL_MS)
}

onBeforeUnmount(() => {
  saveProgress()
  stopTimer()
})
</script>

<template>
  <div class="player card">
    <!-- 本地 / 直链视频 -->
    <video
      v-if="video.src && !mediaError"
      ref="videoEl"
      class="video-el"
      :poster="video.cover"
      controls
      playsinline
      :preload="videoPreload"
      :src="resolvedSrc || undefined"
      @loadedmetadata="handleMetadata"
      @durationchange="syncPlaybackState"
      @progress="syncPlaybackState"
      @timeupdate="syncPlaybackState"
      @pause="saveProgress"
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
    <div v-else-if="video.embedUrl" class="embed">
      <iframe
        :src="video.embedUrl"
        :title="video.title"
        sandbox="allow-scripts allow-same-origin allow-presentation"
        allowfullscreen
        loading="lazy"
      ></iframe>
    </div>

    <!-- 仅跳转 -->
    <div v-else-if="video.externalUrl" class="external">
      <LazyImage :src="video.cover" :alt="video.title" aspect="16 / 9" radius="0" />
      <a
        :href="video.externalUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="btn external-btn"
      >
        在新标签页打开外链视频
        <AppIcon name="external" :size="15" :stroke-width="2" />
      </a>
    </div>

    <EmptyState v-else icon="video" title="暂无可播放的视频源" />

    <!-- 状态角标：整段加载 / 转 Blob / 只能边下边看，三种都压在右上角，不挡底部控件 -->
    <div v-if="loading" class="hint" role="status">
      <span class="dot" aria-hidden="true"></span>
      <span>整段加载 {{ loadLabel }}</span>
      <button class="hint-btn" type="button" @click="skipBlob">边下边看</button>
    </div>
    <div v-else-if="upgrading" class="hint" role="status">
      <span class="dot" aria-hidden="true"></span>
      <span>已缓存整段 · 切换为可拖动 {{ upgradePct }}%</span>
    </div>
    <div v-else-if="showStreamHint" class="hint" role="status">
      <span class="dot dot--idle" aria-hidden="true"></span>
      <span>{{ streamLabel }}</span>
      <button
        v-if="streamReason !== 'guard'"
        class="hint-btn"
        type="button"
        @click="retryPreload"
      >
        {{ loadCostLabel }}
      </button>
    </div>
    <div v-if="seekFlash" class="hint hint--ok" role="status">
      <span>进度条现在可以拖了</span>
    </div>

    <div v-if="loading" class="load-track">
      <ProgressBar :value="loadPct" label="视频加载进度" />
    </div>
  </div>
</template>

<style scoped>
.player {
  position: relative;
  overflow: hidden;
  padding: 0;
  background: #0b1220;
}
.video-el {
  width: 100%;
  aspect-ratio: 16 / 9;
  display: block;
  background: #000;
}
.embed {
  position: relative;
  aspect-ratio: 16 / 9;
}
.embed iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: none;
}
.external {
  position: relative;
}
.external-btn {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  box-shadow: var(--shadow-3);
}
.player-fail {
  background: var(--surface);
}

.hint {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: calc(100% - 20px);
  padding: 5px 6px 5px 12px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: var(--radius-xs);
  background: rgba(8, 12, 24, 0.74);
  color: rgba(255, 255, 255, 0.94);
  font-size: var(--fs-2xs);
  line-height: 1.4;
  backdrop-filter: blur(10px);
}
.hint-btn {
  flex: none;
  padding: 2px 9px;
  border: 0;
  border-radius: var(--radius-xs);
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  font-size: var(--fs-2xs);
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease);
}
.hint-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}
.dot {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22d3ee;
  animation: pulse 1.1s var(--ease) infinite;
}
.dot--idle {
  background: rgba(255, 255, 255, 0.5);
  animation: none;
}
@keyframes pulse {
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
.hint--ok {
  border-color: rgba(74, 222, 128, 0.5);
  background: rgba(8, 34, 22, 0.82);
  animation: hint-in var(--dur) var(--ease);
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
.load-track {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 0;
  --progress-h: 3px;
}
.load-track :deep(.progress) {
  border: none;
  border-radius: 0;
}

@media (max-width: 520px) {
  .hint {
    gap: 6px;
    max-width: calc(100% - 16px);
    padding: 4px 5px 4px 9px;
    font-size: 0.68rem;
  }
  .hint-btn {
    padding: 2px 7px;
    font-size: 0.66rem;
  }
}

/* 风格：年鉴/日式用浅色角标，保持画面干净 */
[data-style='annual'] .hint,
[data-style='japandi'] .hint {
  background: rgba(255, 255, 255, 0.94);
  border-color: rgba(0, 0, 0, 0.08);
  color: var(--text);
}
[data-style='annual'] .hint-btn,
[data-style='japandi'] .hint-btn {
  background: var(--accent-soft);
  color: var(--accent-ink);
}
[data-style='brutal'] .hint {
  border: 3px solid #fff;
  border-radius: 0;
  background: #111;
  color: var(--accent-ink);
  font-weight: 900;
}
[data-style='brutal'] .hint-btn {
  border: 2px solid var(--accent);
  border-radius: 0;
  color: var(--accent-ink);
  background: transparent;
  font-weight: 900;
}
</style>
