<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import AppIcon from '@/components/common/AppIcon.vue'
import Breadcrumb from '@/components/common/Breadcrumb.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import MediaActions from '@/components/media/MediaActions.vue'
import VideoCard from '@/components/media/VideoCard.vue'
import VideoPlayer from '@/components/media/VideoPlayer.vue'
import { useContentStore } from '@/store/content'
import { formatDate } from '@/utils/format'

const route = useRoute()
const content = useContentStore()

const video = computed(() => content.getVideo(String(route.params.id)))
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
      <Breadcrumb
        :items="[
          { label: '首页', to: '/' },
          { label: '视频', to: '/videos' },
          { label: video.title },
        ]"
      />

      <div class="layout">
        <div class="main">
          <VideoPlayer :video="video" />

          <article class="info card">
            <div class="chips">
              <span class="chip chip--primary">{{ video.category }}</span>
              <span v-for="t in video.tags" :key="t" class="chip">#{{ t }}</span>
            </div>
            <h1>{{ video.title }}</h1>
            <p class="detail-meta">
              <span>
                <AppIcon name="pencil" :size="14" :stroke-width="1.9" />
                {{ video.author }}
              </span>
              <time class="num" :datetime="video.createdAt">{{ formatDate(video.createdAt) }}</time>
              <span v-if="video.duration">
                <AppIcon name="clock" :size="14" :stroke-width="1.9" />
                {{ video.duration }}
              </span>
            </p>
            <p class="desc">{{ video.description }}</p>
            <MediaActions :id="video.id" kind="video" :share-title="video.title" />
          </article>
        </div>

        <aside v-if="related.length" class="side" aria-label="更多视频">
          <div class="side-head">
            <h2 class="side-title">更多视频</h2>
            <RouterLink to="/videos" class="side-more">
              全部 {{ content.publicVideos.length }} 个
              <AppIcon name="arrowRight" :size="13" :stroke-width="2" />
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
    max-height: calc(100vh - var(--header-h) - 32px);
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-right: 4px;
  }
}

.info {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: clamp(18px, 3vw, 26px);
  margin-top: var(--space-4);
}
.info h1 {
  font-size: clamp(1.25rem, 3vw, 1.7rem);
}
.desc {
  color: var(--text-2);
  font-size: var(--fs-md);
  line-height: 1.8;
}

.side-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}
.side-title {
  margin: 0;
  font-size: var(--fs-md);
  color: var(--text-2);
}
.side-more {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--fs-2xs);
  color: var(--text-3);
}
.side-more:hover {
  color: var(--accent-ink);
}
.side-list {
  display: grid;
  gap: var(--space-3);
}
</style>
