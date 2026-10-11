<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'

import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import LazyImage from '@/components/common/LazyImage.vue'
import Lightbox from '@/components/media/Lightbox.vue'
import MediaActions from '@/components/media/MediaActions.vue'
import { useContentStore } from '@/store/content'
import { formatDate } from '@/utils/format'
import { downloadMedia } from '@/utils/image'

const route = useRoute()
const content = useContentStore()

const album = computed(() => content.getAlbum(String(route.params.id)))
const lightboxOpen = ref(false)
const lightboxIndex = ref(0)

const items = computed(() =>
  (album.value?.photos || []).map((p) => ({ src: p.src, caption: p.caption })),
)

function openLightbox(i: number) {
  lightboxIndex.value = i
  lightboxOpen.value = true
}

async function downloadAll() {
  const photos = album.value?.photos || []
  for (const [i, p] of photos.entries()) {
    await downloadMedia(p.src, `${album.value?.title || 'photo'}-${i + 1}.jpg`)
    await new Promise((r) => setTimeout(r, 300))
  }
}
</script>

<template>
  <div class="container page">
    <ErrorState v-if="content.error" :message="content.error" @retry="content.init()" />

    <EmptyState
      v-else-if="!content.loading && !album"
      icon="image"
      title="相册不存在"
      description="它可能已被删除，或链接不正确。"
      action-text="返回相册列表"
      action-to="/albums"
    />

    <template v-else-if="album">
      <nav class="crumbs" aria-label="面包屑">
        <RouterLink to="/">首页</RouterLink>
        <span aria-hidden="true">/</span>
        <RouterLink to="/albums">相册</RouterLink>
        <span aria-hidden="true">/</span>
        <span class="current">{{ album.title }}</span>
      </nav>

      <header class="album-head card">
        <div class="head-info">
          <div class="chips">
            <span class="chip chip--primary">{{ album.category }}</span>
            <span v-for="t in album.tags" :key="t" class="chip">#{{ t }}</span>
          </div>
          <h1>{{ album.title }}</h1>
          <p class="desc">{{ album.description }}</p>
          <p class="meta">
            <span class="meta-item"><AppIcon name="camera" :size="15" /> {{ album.photos.length }} 张照片</span>
            <span class="meta-item"><AppIcon name="pencil" :size="15" /> {{ album.author }}</span>
            <time :datetime="album.createdAt">{{ formatDate(album.createdAt) }}</time>
          </p>
        </div>
        <div class="head-actions">
          <MediaActions
            :id="album.id"
            kind="album"
            :share-title="album.title"
          >
            <button class="action-btn" aria-label="下载全部" @click="downloadAll">
              <AppIcon name="download" :size="16" />
              <span>全部下载</span>
            </button>
          </MediaActions>
        </div>
      </header>

      <div v-if="content.loading" class="photo-grid" aria-hidden="true">
        <div v-for="i in 8" :key="i" class="skeleton photo-skel"></div>
      </div>

      <div v-else class="photo-grid">
        <button
          v-for="(photo, i) in album.photos"
          :key="photo.id"
          class="photo"
          :aria-label="`预览 ${photo.caption || `第 ${i + 1} 张照片`}`"
          @click="openLightbox(i)"
        >
          <LazyImage :src="photo.src" :alt="photo.caption || album.title" aspect="1 / 1" />
          <span v-if="photo.caption" class="photo-cap">{{ photo.caption }}</span>
        </button>
      </div>

      <Lightbox v-model:open="lightboxOpen" v-model:index="lightboxIndex" :items="items" />
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
}

.album-head {
  padding: clamp(18px, 3vw, 28px);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}
@media (min-width: 768px) {
  .album-head {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
  }
}
.head-info h1 {
  font-size: clamp(1.4rem, 3vw, 1.9rem);
  margin: var(--space-3) 0;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.desc {
  color: var(--text-2);
  max-width: 60ch;
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
  margin-top: var(--space-3);
  color: var(--text-3);
  font-size: 0.85rem;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
}
@media (min-width: 640px) {
  .photo-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (min-width: 960px) {
  .photo-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
.photo {
  position: relative;
  padding: 0;
  border: none;
  background: none;
  border-radius: var(--radius-sm);
  overflow: hidden;
  cursor: zoom-in;
}
.photo:hover .img {
  transform: scale(1.06);
}
.photo-skel {
  aspect-ratio: 1 / 1;
  border-radius: var(--radius-sm);
}
.photo-cap {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20px 10px 8px;
  background: linear-gradient(transparent, rgba(8, 15, 30, 0.7));
  color: #fff;
  font-size: 0.78rem;
  text-align: left;
  pointer-events: none;
}
</style>
