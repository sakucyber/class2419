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
      <span class="play" aria-hidden="true"><AppIcon name="play" :size="18" filled /></span>
      <span v-if="video.duration" class="duration num">{{ video.duration }}</span>
      <span v-if="video.embedUrl" class="ext" title="外链视频">
        <AppIcon name="external" :size="13" :stroke-width="2" />
      </span>
    </div>
    <div class="body">
      <div class="meta-row">
        <span class="chip">{{ video.category }}</span>
        <time class="num" :datetime="video.createdAt">{{ formatDate(video.createdAt) }}</time>
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
  height: 100%;
  overflow: hidden;
  color: var(--text);
}
.video-card:hover {
  color: var(--text);
}
.cover {
  position: relative;
  border-bottom: 1px solid var(--line);
}
[data-style='japandi'] .cover {
  border-bottom: none;
}
[data-style='brutal'] .cover {
  border-bottom: 3px solid #111;
}
.play {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 50px;
  height: 50px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  background: rgba(10, 14, 20, 0.45);
  color: #fff;
  backdrop-filter: blur(4px);
  transition:
    transform var(--dur) var(--ease),
    background-color var(--dur-fast) var(--ease);
}
.play :deep(.app-icon) {
  margin-left: 2px;
}
.video-card:hover .play {
  transform: translate(-50%, -50%) scale(1.08);
  background: var(--accent);
  border-color: var(--accent-ink);
  color: var(--accent-contrast);
}
.duration {
  position: absolute;
  right: var(--space-2);
  bottom: var(--space-2);
  padding: 1px 6px;
  background: rgba(8, 12, 20, 0.7);
  color: #fff;
  font-size: var(--fs-2xs);
  font-weight: 600;
  border-radius: var(--radius-xs);
}
.ext {
  position: absolute;
  left: var(--space-2);
  top: var(--space-2);
  padding: 3px 5px;
  background: rgba(8, 12, 20, 0.6);
  color: #fff;
  border-radius: var(--radius-xs);
}
.body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex: 1;
  padding: var(--space-4);
}
.meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  font-size: var(--fs-2xs);
  color: var(--text-3);
}
.meta-row .chip {
  font-size: var(--fs-2xs);
  min-height: 24px;
}
.title {
  font-size: var(--fs-lg);
  line-height: 1.4;
}
.desc {
  color: var(--text-2);
  font-size: var(--fs-sm);
  line-height: 1.65;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
[data-style='annual'] .title {
  font-family: var(--font-serif);
  font-weight: 600;
}
[data-style='brutal'] .play {
  border-radius: 0;
  border: 3px solid #fff;
  background: #111;
}
[data-style='brutal'] .duration,
[data-style='brutal'] .ext {
  border-radius: 0;
  border: 2px solid #111;
}
</style>
