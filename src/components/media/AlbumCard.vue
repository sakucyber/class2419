<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import LazyImage from '@/components/common/LazyImage.vue'
import { useInteractionStore } from '@/store/interaction'
import type { Album } from '@/types'
import { formatDate } from '@/utils/format'

defineProps<{ album: Album }>()
const interaction = useInteractionStore()
</script>

<template>
  <RouterLink :to="`/albums/${album.id}`" class="album-card card card-hover">
    <div class="cover">
      <LazyImage :src="album.cover" :alt="album.title" aspect="4 / 3" radius="0" />
      <span class="count">
        <AppIcon name="camera" :size="12" :stroke-width="2" />
        {{ album.photos.length }}
      </span>
      <span
        v-if="interaction.isFavorite('album', album.id)"
        class="fav"
        aria-label="已收藏"
      >
        <AppIcon name="star" :size="16" filled />
      </span>
    </div>
    <div class="body">
      <div class="meta-row">
        <span class="chip chip--primary">{{ album.category }}</span>
        <time class="num" :datetime="album.createdAt">{{ formatDate(album.createdAt) }}</time>
      </div>
      <h3 class="title">{{ album.title }}</h3>
      <p class="desc">{{ album.description }}</p>
      <div class="foot">
        <span>{{ album.author }}</span>
        <span class="more">
          查看相册
          <AppIcon name="arrowRight" :size="13" :stroke-width="2" />
        </span>
      </div>
    </div>
  </RouterLink>
</template>

<style scoped>
.album-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  color: var(--text);
}
.album-card:hover {
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
.count {
  position: absolute;
  left: var(--space-2);
  bottom: var(--space-2);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: rgba(8, 12, 20, 0.62);
  color: #fff;
  font-size: var(--fs-2xs);
  font-weight: 600;
  border-radius: var(--radius-xs);
}
.fav {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  color: var(--accent-ink);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-xs);
  padding: 4px;
  display: grid;
  place-items: center;
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
  flex: 1;
  color: var(--text-2);
  font-size: var(--fs-sm);
  line-height: 1.65;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-top: auto;
  padding-top: var(--space-3);
  border-top: 1px solid var(--line);
  font-size: var(--fs-2xs);
  color: var(--text-3);
}
.more {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--accent-ink);
  font-weight: 600;
}
[data-style='annual'] .title {
  font-family: var(--font-serif);
  font-weight: 600;
}
[data-style='brutal'] .fav {
  border-width: 3px;
  border-color: #111;
  background: var(--accent);
  color: #111;
  border-radius: 0;
}
[data-style='brutal'] .count {
  border-radius: 0;
  border: 2px solid #111;
}
</style>
