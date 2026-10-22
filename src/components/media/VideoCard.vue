<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import LazyImage from '@/components/common/LazyImage.vue'
import type { VideoItem } from '@/types'
import { formatDate } from '@/utils/format'

defineProps<{ video: VideoItem }>()
</script>

<template>
  <RouterLink :to="`/videos/${video.id}`" class="video-card card card-hover">
    <div class="cover">
      <LazyImage :src="video.cover" :alt="video.title" aspect="16 / 9" radius="0" />
      <span class="play" aria-hidden="true"><AppIcon name="play" :size="20" filled /></span>
      <span v-if="video.duration" class="duration">{{ video.duration }}</span>
      <span v-if="video.embedUrl" class="ext" title="外链视频"><AppIcon name="link" :size="13" :stroke-width="2" /></span>
    </div>
    <div class="body">
      <div class="meta-row">
        <span class="chip">{{ video.category }}</span>
        <time :datetime="video.createdAt">{{ formatDate(video.createdAt) }}</time>
      </div>
      <h3 class="title">{{ video.title }}</h3>
      <p class="desc">{{ video.description }}</p>
    </div>
  </RouterLink>
</template>

<style scoped>
.video-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--text);
  height: 100%;
}
.video-card:hover {
  color: var(--text);
}
.cover {
  position: relative;
}
.video-card:hover .play {
  transform: translate(-50%, -50%) scale(1.12);
  background: var(--primary);
}
.play {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 54px;
  height: 54px;
  border-radius: var(--radius-full);
  background: var(--primary-gradient);
  color: #fff;
  display: grid;
  place-items: center;
  box-shadow: 0 6px 22px var(--glow);
  transition: all var(--duration) var(--ease-spring);
}
.play :deep(.app-icon) {
  margin-left: 2px; /* 三角形视觉居中 */
}
.duration {
  position: absolute;
  right: var(--space-2);
  bottom: var(--space-2);
  background: rgba(8, 15, 30, 0.72);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: var(--radius-xs);
  font-variant-numeric: tabular-nums;
}
.ext {
  position: absolute;
  left: var(--space-2);
  top: var(--space-2);
  background: rgba(8, 15, 30, 0.6);
  border-radius: var(--radius-xs);
  font-size: 0.8rem;
  padding: 2px 6px;
}
.body {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex: 1;
}
.meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  font-size: var(--fs-xs);
  color: var(--text-3);
}
.title {
  font-size: var(--fs-lg);
}
.desc {
  color: var(--text-2);
  font-size: var(--fs-sm);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
