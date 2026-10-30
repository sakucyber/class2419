<script setup lang="ts">
import { ref } from 'vue'

import AppIcon from '@/components/common/AppIcon.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import AlbumCard from '@/components/media/AlbumCard.vue'
import { useContentQuery } from '@/composables/useContentQuery'
import { useContentStore } from '@/store/content'
import type { Album } from '@/types'

const content = useContentStore()
const layout = ref<'grid' | 'masonry'>('grid')

const { keyword, category, sort, categories, filtered, visible, hasMore, remaining, loadMore, reset, onSearch } =
  useContentQuery<Album>({
    items: () => content.publicAlbums,
    searchFields: (a) => [a.title, a.description, a.category, ...a.tags],
    categoryOf: (a) => a.category,
    tagsOf: (a) => a.tags,
    dateOf: (a) => a.createdAt,
    pageSize: 8,
    sortable: true,
  })
</script>

<template>
  <div class="container page">
    <PageHeader
      kicker="Album"
      title="班级相册"
      :subtitle="`共 ${content.publicAlbums.length} 个相册 · 点击照片可放大预览`"
    >
      <template #actions>
        <div class="view-toggle" role="group" aria-label="布局切换">
          <button
            class="chip"
            type="button"
            :class="{ 'chip--active': layout === 'grid' }"
            :aria-pressed="layout === 'grid'"
            @click="layout = 'grid'"
          >
            <AppIcon name="grid" :size="14" :stroke-width="1.9" />
            网格
          </button>
          <button
            class="chip"
            type="button"
            :class="{ 'chip--active': layout === 'masonry' }"
            :aria-pressed="layout === 'masonry'"
            @click="layout = 'masonry'"
          >
            <AppIcon name="columns" :size="14" :stroke-width="1.9" />
            瀑布流
          </button>
        </div>
      </template>
    </PageHeader>

    <!-- 工具栏 -->
    <div class="toolbar card">
      <label class="search-field">
        <AppIcon name="search" :size="16" :stroke-width="1.9" />
        <span class="visually-hidden">搜索相册</span>
        <input
          v-model="keyword"
          type="search"
          placeholder="搜索相册标题、描述或标签…"
          @input="onSearch"
        />
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

      <label class="sort-box">
        <span class="visually-hidden">排序方式</span>
        <select v-model="sort" class="select" aria-label="排序方式">
          <option value="newest">最新优先</option>
          <option value="oldest">最早优先</option>
        </select>
      </label>
    </div>

    <ErrorState v-if="content.error" :message="content.error" @retry="content.init()" />

    <template v-else>
      <SkeletonBlock v-if="content.loading" variant="grid" :count="6" />

      <EmptyState
        v-else-if="!filtered.length"
        icon="search"
        title="没有找到相册"
        description="试试更换分类或关键词。"
      >
        <button class="btn btn--soft btn--sm" type="button" @click="reset">清空筛选</button>
      </EmptyState>

      <div v-else :class="layout === 'masonry' ? 'masonry' : 'grid-cards'">
        <AlbumCard v-for="a in visible" :key="a.id" :album="a" />
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
.view-toggle {
  display: flex;
  gap: var(--space-2);
}
.view-toggle .chip {
  min-height: 34px;
}
.sort-box {
  margin-left: auto;
}
.sort-box .select {
  width: auto;
  min-width: 120px;
}

.masonry {
  columns: 1;
  column-gap: var(--space-4);
}
@media (min-width: 640px) {
  .masonry {
    columns: 2;
  }
}
@media (min-width: 960px) {
  .masonry {
    columns: 3;
  }
}
@media (min-width: 1600px) {
  .masonry {
    columns: 4;
  }
}
.masonry :deep(.album-card) {
  display: block;
  break-inside: avoid;
  margin-bottom: var(--space-4);
}
.masonry :deep(.album-card:nth-child(3n) .lazy-image) {
  aspect-ratio: 3 / 4 !important;
}
.masonry :deep(.album-card:nth-child(3n + 2) .lazy-image) {
  aspect-ratio: 1 / 1 !important;
}

.load-more {
  display: flex;
  justify-content: center;
  margin-top: var(--space-8);
}

[data-style='brutal'] .view-toggle .chip {
  border-width: 3px;
}
@media (max-width: 560px) {
  .sort-box {
    margin-left: 0;
    width: 100%;
  }
  .sort-box .select {
    width: 100%;
  }
}
</style>
