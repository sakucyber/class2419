<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
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

// 解析 idb: 引用
async function resolve() {
  mediaError.value = false
  resolvedSrc.value = ''
  if (!video.value?.src) return
  try {
    const url = await resolveMediaUrl(video.value.src)
    if (!url) {
      mediaError.value = true
      return
    }
    resolvedSrc.value = url
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
  saveTimer = setInterval(saveProgress, 4000)
}

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
  if (saveTimer) clearInterval(saveTimer)
})

const related = computed(() =>
  content.publicVideos.filter((v) => v.id !== video.value?.id).slice(0, 3),
)
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
              <span v-if="video.duration">⏱ {{ video.duration }}</span>
            </p>
            <p class="desc">{{ video.description }}</p>
            <MediaActions :id="video.id" kind="video" :base-likes="0" :share-title="video.title" />
          </article>
        </div>

        <aside class="side" aria-label="相关视频">
          <h2 class="side-title">更多视频</h2>
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
  }
}

.player {
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

.side-title {
  font-size: 1rem;
  margin-bottom: var(--space-3);
  color: var(--text-2);
}
.side-list {
  display: grid;
  gap: var(--space-3);
}
</style>
