<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'

import AppIcon from '@/components/common/AppIcon.vue'
import Breadcrumb from '@/components/common/Breadcrumb.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
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
      <Breadcrumb
        :items="[
          { label: '首页', to: '/' },
          { label: '相册', to: '/albums' },
          { label: album.title },
        ]"
      />

      <header class="album-head card">
        <div class="head-info">
          <div class="chips">
            <span class="chip chip--primary">{{ album.category }}</span>
            <span v-for="t in album.tags" :key="t" class="chip">#{{ t }}</span>
          </div>
          <h1>{{ album.title }}</h1>
          <p class="desc">{{ album.description }}</p>
          <p class="detail-meta">
            <span>
              <AppIcon name="camera" :size="14" :stroke-width="1.9" />
              {{ album.photos.length }} 张照片
            </span>
            <span>
              <AppIcon name="pencil" :size="14" :stroke-width="1.9" />
              {{ album.author }}
            </span>
            <time class="num" :datetime="album.createdAt">{{ formatDate(album.createdAt) }}</time>
          </p>
        </div>
        <div class="head-actions">
          <MediaActions :id="album.id" kind="album" :share-title="album.title">
            <button class="action-btn" type="button" aria-label="下载全部" @click="downloadAll">
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
          type="button"
          :aria-label="`预览 ${photo.caption || `第 ${i + 1} 张照片`}`"
          @click="openLightbox(i)"
        >
          <LazyImage
            :src="photo.src"
            :srcset="photo.srcset"
            :sizes="photo.sizes"
            :width="photo.width"
            :height="photo.height"
            :alt="photo.caption || album.title"
            aspect="1 / 1"
            radius="0"
          />
          <span class="photo-index num" aria-hidden="true">{{
            String(i + 1).padStart(2, '0')
          }}</span>
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
.album-head {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: clamp(18px, 3vw, 30px);
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
  margin: var(--space-3) 0;
  font-size: clamp(1.4rem, 3vw, 1.95rem);
}
.desc {
  max-width: 60ch;
  color: var(--text-2);
  font-size: var(--fs-md);
}
.detail-meta {
  margin-top: var(--space-3);
}
.head-actions {
  flex: none;
}
.head-actions :deep(.media-actions) {
  justify-content: flex-end;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}
@media (min-width: 640px) {
  .photo-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (min-width: 960px) {
  .photo-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
@media (min-width: 1600px) {
  .photo-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}
.photo {
  position: relative;
  padding: 0;
  border: none;
  background: none;
  overflow: hidden;
  cursor: zoom-in;
  aspect-ratio: 1 / 1;
}
.photo :deep(.lazy-image) {
  height: 100%;
}
.photo:hover :deep(.img) {
  transform: scale(1.05);
}
.photo-index {
  position: absolute;
  top: 6px;
  left: 6px;
  padding: 1px 5px;
  background: rgba(250, 249, 246, 0.86);
  color: #16283d;
  font-size: 0.6rem;
  letter-spacing: 1px;
}
.photo-skel {
  aspect-ratio: 1 / 1;
}
.photo-cap {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 22px 10px 8px;
  background: linear-gradient(transparent, rgba(8, 15, 30, 0.72));
  color: #fff;
  font-size: var(--fs-2xs);
  text-align: left;
  pointer-events: none;
}

[data-style='annual'] .photo {
  border: 1px solid var(--line);
}
[data-style='japandi'] .photo {
  border-radius: 12px;
}
[data-style='japandi'] .photo :deep(.lazy-image) {
  border-radius: 12px;
}
[data-style='japandi'] .photo-index {
  border-radius: 999px;
}
[data-style='brutal'] .photo {
  border: 3px solid #111;
}
[data-style='brutal'] .photo-index {
  background: var(--accent);
  color: #111;
  font-weight: 900;
}
[data-style='legacy'] .photo {
  border-radius: 12px;
}
</style>
