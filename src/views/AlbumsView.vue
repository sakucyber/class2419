<script setup lang="ts">
import { computed, ref } from 'vue'

import AppIcon from '@/components/common/AppIcon.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import AlbumCard from '@/components/media/AlbumCard.vue'
import { useContentStore } from '@/store/content'
import { debounce } from '@/utils/format'

const content = useContentStore()

const keyword = ref('')
const category = ref('全部')
const sort = ref<'newest' | 'oldest'>('newest')
const layout = ref<'grid' | 'masonry'>('grid')
const pageSize = 8
const shown = ref(pageSize)

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  let list = content.publicAlbums.filter((a) => {
    const okCat = category.value === '全部' || a.category === category.value
    const okKw =
      !kw ||
      a.title.toLowerCase().includes(kw) ||
      a.description.toLowerCase().includes(kw) ||
      a.tags.some((t) => t.toLowerCase().includes(kw))
    return okCat && okKw
  })
  list = [...list]
  if (sort.value === 'newest') list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  if (sort.value === 'oldest') list.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1))
  return list
})

const visible = computed(() => filtered.value.slice(0, shown.value))

const onSearch = debounce(() => {
  shown.value = pageSize
}, 200)

function resetFilters() {
  keyword.value = ''
  category.value = '全部'
  shown.value = pageSize
}
</script>

<template>
  <div class="container page">
    <header class="page-head">
      <div>
        <h1>班级相册</h1>
        <p class="subtitle">共 {{ content.publicAlbums.length }} 个相册 · 点击照片可放大预览</p>
      </div>
      <div class="view-toggle" role="group" aria-label="布局切换">
        <button
          class="btn btn--sm"
          :class="layout === 'grid' ? '' : 'btn--ghost'"
          :aria-pressed="layout === 'grid'"
          @click="layout = 'grid'"
        >
          网格
        </button>
        <button
          class="btn btn--sm"
          :class="layout === 'masonry' ? '' : 'btn--ghost'"
          :aria-pressed="layout === 'masonry'"
          @click="layout = 'masonry'"
        >
          瀑布流
        </button>
      </div>
    </header>

    <!-- 工具栏 -->
    <div class="toolbar card">
      <div class="search-box">
        <AppIcon name="search" :size="17" />
        <input
          v-model="keyword"
          type="search"
          class="search-input"
          placeholder="搜索相册标题、描述或标签…"
          aria-label="搜索相册"
          @input="onSearch"
        />
      </div>
      <div class="chips" role="group" aria-label="分类筛选">
        <button
          v-for="c in ['全部', ...content.albumCategories]"
          :key="c"
          class="chip"
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
        <button class="btn btn--soft btn--sm" @click="resetFilters">清空筛选</button>
      </EmptyState>

      <div v-else :class="layout === 'masonry' ? 'masonry' : 'grid-3'" class="album-grid">
        <AlbumCard v-for="a in visible" :key="a.id" :album="a" />
      </div>

      <div v-if="shown < filtered.length" class="load-more">
        <button class="btn btn--ghost" @click="shown += pageSize">
          加载更多（剩余 {{ filtered.length - shown }} 个）
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page {
  padding-top: var(--space-6);
}
.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
  margin-bottom: var(--space-5);
}
h1 {
  font-size: clamp(1.4rem, 3vw, 1.8rem);
}
.subtitle {
  color: var(--text-3);
  font-size: 0.88rem;
  margin-top: 4px;
}
.view-toggle {
  display: flex;
  gap: var(--space-2);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-5);
}
.search-box {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex: 1;
  min-width: 200px;
  background: var(--bg-soft);
  border-radius: var(--radius-sm);
  padding: 0 12px;
}
.search-input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  color: var(--text);
  padding: 0.5em 0;
  min-width: 0;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.sort-box .select {
  width: auto;
  min-width: 120px;
}

.album-grid {
  min-height: 200px;
}
.grid-3 {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: 1fr;
}
@media (min-width: 640px) {
  .grid-3 {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (min-width: 960px) {
  .grid-3 {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (min-width: 1600px) {
  .grid-3 {
    grid-template-columns: repeat(4, 1fr);
  }
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
  break-inside: avoid;
  margin-bottom: var(--space-4);
  display: block;
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
</style>
