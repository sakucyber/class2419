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
      <span class="count-badge"><AppIcon name="camera" :size="13" :stroke-width="2" /> {{ album.photos.length }}</span>
      <span v-if="interaction.isFavorite('album', album.id)" class="fav-badge" aria-label="已收藏"
        ><AppIcon name="star" :size="17" filled /></span
      >
    </div>
    <div class="body">
      <div class="meta-row">
        <span class="chip chip--primary">{{ album.category }}</span>
        <time :datetime="album.createdAt">{{ formatDate(album.createdAt) }}</time>
      </div>
      <h3 class="title">{{ album.title }}</h3>
      <p class="desc">{{ album.description }}</p>
      <div class="foot">
        <span class="likes" :class="{ on: interaction.isLiked('album', album.id) }">
          <AppIcon
            name="heart"
            :size="15"
            :filled="interaction.isLiked('album', album.id)"
          />
          {{ album.likes + (interaction.isLiked('album', album.id) ? 1 : 0) }}
        </span>
        <span class="author">{{ album.author }}</span>
      </div>
    </div>
  </RouterLink>
</template>

<style scoped>
.album-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--text);
  height: 100%;
}
.album-card:hover {
  color: var(--text);
}
.cover {
  position: relative;
}
.cover :deep(.lazy-image:hover .img) {
  transform: scale(1.05);
}
.count-badge {
  position: absolute;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  left: var(--space-3);
  bottom: var(--space-3);
  padding: 2px 10px;
  border-radius: var(--radius-full);
  background: rgba(8, 15, 30, 0.65);
  color: #fff;
  font-size: 0.78rem;
  font-weight: 600;
  backdrop-filter: blur(4px);
}
.fav-badge {
  position: absolute;
  right: var(--space-3);
  top: var(--space-3);
  color: #fbbf24;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.45));
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
  font-size: 0.78rem;
  color: var(--text-3);
}
.title {
  font-size: 1.05rem;
}
.desc {
  color: var(--text-2);
  font-size: 0.86rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}
.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--text-3);
  margin-top: auto;
  padding-top: var(--space-2);
  border-top: 1px dashed var(--border);
}
.likes {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.likes.on {
  color: #e11d48;
  font-weight: 700;
}
</style>
