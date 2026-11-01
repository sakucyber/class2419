<script setup lang="ts">
import ContentToolbar from '@/components/common/ContentToolbar.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import VideoCard from '@/components/media/VideoCard.vue'
import { useContentQuery } from '@/composables/useContentQuery'
import { useContentStore } from '@/store/content'
import type { VideoItem } from '@/types'

const content = useContentStore()

const {
  keyword,
  category,
  categories,
  filtered,
  visible,
  hasMore,
  remaining,
  loadMore,
  reset,
  onSearch,
} = useContentQuery<VideoItem>({
  items: () => content.publicVideos,
  searchFields: (v) => [v.title, v.description, v.category, ...v.tags],
  categoryOf: (v) => v.category,
  tagsOf: (v) => v.tags,
  dateOf: (v) => v.createdAt,
  pageSize: 9,
})
</script>

<template>
  <div class="container page">
    <PageHeader
      kicker="Video"
      title="班级视频"
      subtitle="外链视频跳转播放，本地视频在线播放并自动记忆进度"
    />

    <ContentToolbar
      v-model:keyword="keyword"
      v-model:category="category"
      :categories="categories"
      placeholder="搜索视频…"
      search-label="搜索视频"
      @search="onSearch"
    />

    <ErrorState v-if="content.error" :message="content.error" @retry="content.init()" />

    <template v-else>
      <SkeletonBlock v-if="content.loading" variant="grid" :count="6" />

      <EmptyState
        v-else-if="!filtered.length"
        icon="video"
        title="没有匹配的视频"
        description="换个关键词或分类看看。"
      >
        <button class="btn btn--soft btn--sm" type="button" @click="reset">清空筛选</button>
      </EmptyState>

      <div v-else class="grid-cards">
        <VideoCard v-for="v in visible" :key="v.id" :video="v" :heading-level="2" />
      </div>

      <div v-if="hasMore" class="load-more">
        <button class="btn btn--ghost" type="button" @click="loadMore">
          加载更多（剩余 {{ remaining }} 个）
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.load-more {
  display: flex;
  justify-content: center;
  margin-top: var(--space-8);
}
</style>
