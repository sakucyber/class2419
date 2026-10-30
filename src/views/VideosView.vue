<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import VideoCard from '@/components/media/VideoCard.vue'
import { useContentQuery } from '@/composables/useContentQuery'
import { useContentStore } from '@/store/content'
import type { VideoItem } from '@/types'

const content = useContentStore()

const { keyword, category, categories, filtered, visible, hasMore, remaining, loadMore, reset, onSearch } =
  useContentQuery<VideoItem>({
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

    <div class="toolbar card">
      <label class="search-field">
        <AppIcon name="search" :size="16" :stroke-width="1.9" />
        <span class="visually-hidden">搜索视频</span>
        <input v-model="keyword" type="search" placeholder="搜索视频…" @input="onSearch" />
      </label>
      <div class="chips" role="group" aria-label="分类筛选">
        <button
          v-for="c in categories"
          :key="c"
          class="chip"
          type="button"
          :class="{ 'chip--active': category === c }"
          :aria-pressed="category === c"
          @click="category = c"
        >
          {{ c }}
        </button>
      </div>
    </div>

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
        <VideoCard v-for="v in visible" :key="v.id" :video="v" />
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
.page {
  padding-top: var(--space-6);
}
.load-more {
  display: flex;
  justify-content: center;
  margin-top: var(--space-8);
}
</style>
