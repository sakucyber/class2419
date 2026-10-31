<script setup lang="ts">
import { computed } from 'vue'

import AppIcon from '@/components/common/AppIcon.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import ArticleCard from '@/components/media/ArticleCard.vue'
import { useContentQuery } from '@/composables/useContentQuery'
import { useContentStore } from '@/store/content'
import type { Article } from '@/types'

const content = useContentStore()

const {
  keyword,
  category,
  activeTag,
  categories,
  filtered,
  visible,
  shown,
  hasMore,
  remaining,
  loadMore,
  setCategory,
  reset,
  onSearch,
  pageSize,
} = useContentQuery<Article>({
  items: () => content.publicArticles,
  searchFields: (a) => [a.title, a.excerpt, a.category, a.content, ...a.tags],
  categoryOf: (a) => a.category,
  tagsOf: (a) => a.tags,
  dateOf: (a) => a.createdAt,
  pageSize: 6,
  withTag: true,
})

const popularTags = computed(() => {
  const count = new Map<string, number>()
  content.publicArticles.forEach((a) =>
    a.tags.forEach((t) => count.set(t, (count.get(t) || 0) + 1)),
  )
  return [...count.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([t]) => t)
})

function toggleTag(tag: string) {
  activeTag.value = activeTag.value === tag ? '' : tag
  shown.value = pageSize
}
</script>

<template>
  <div class="container page">
    <PageHeader
      kicker="Article"
      title="班级文章"
      subtitle="随笔、活动记录、成长复盘 —— 笔尖下的2419"
    />

    <div class="toolbar card">
      <label class="search-field">
        <AppIcon name="search" :size="16" :stroke-width="1.9" />
        <span class="visually-hidden">搜索文章</span>
        <input
          v-model="keyword"
          type="search"
          placeholder="搜索文章标题或正文…"
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
          @click="setCategory(c)"
        >
          {{ c }}
        </button>
      </div>
    </div>

    <div v-if="popularTags.length" class="tag-bar" aria-label="热门标签">
      <span class="tag-label">热门标签</span>
      <button
        v-for="t in popularTags"
        :key="t"
        class="chip"
        type="button"
        :class="{ 'chip--active': activeTag === t }"
        :aria-pressed="activeTag === t"
        @click="toggleTag(t)"
      >
        #{{ t }}
      </button>
    </div>

    <ErrorState v-if="content.error" :message="content.error" @retry="content.init()" />

    <template v-else>
      <SkeletonBlock v-if="content.loading" variant="grid" :count="3" />

      <EmptyState
        v-else-if="!filtered.length"
        icon="book"
        title="没有匹配的文章"
        description="试试清空标签或换个关键词。"
      >
        <button class="btn btn--soft btn--sm" type="button" @click="reset">清空筛选</button>
      </EmptyState>

      <div v-else class="grid-cards">
        <ArticleCard v-for="a in visible" :key="a.id" :article="a" featured :heading-level="2" />
      </div>

      <div v-if="hasMore" class="load-more">
        <button class="btn btn--ghost" type="button" @click="loadMore">
          加载更多（剩余 {{ remaining }} 篇）
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page {
  padding-top: var(--space-6);
}
.tag-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-5);
}
.tag-label {
  font-size: var(--fs-2xs);
  letter-spacing: 1.5px;
  color: var(--text-3);
  text-transform: uppercase;
  margin-right: 4px;
}
.load-more {
  display: flex;
  justify-content: center;
  margin-top: var(--space-8);
}
</style>
