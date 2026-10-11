<script setup lang="ts">
import { computed, ref } from 'vue'

import AppIcon from '@/components/common/AppIcon.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import ArticleCard from '@/components/media/ArticleCard.vue'
import { useContentStore } from '@/store/content'
import { debounce } from '@/utils/format'

const content = useContentStore()

const keyword = ref('')
const category = ref('全部')
const activeTag = ref('')
const shown = ref(6)

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return content.publicArticles.filter((a) => {
    const okCat = category.value === '全部' || a.category === category.value
    const okTag = !activeTag.value || a.tags.includes(activeTag.value)
    const okKw =
      !kw ||
      a.title.toLowerCase().includes(kw) ||
      a.excerpt.toLowerCase().includes(kw) ||
      a.content.toLowerCase().includes(kw)
    return okCat && okTag && okKw
  })
})

const visible = computed(() => filtered.value.slice(0, shown.value))

function selectCategory(c: string) {
  category.value = c
  activeTag.value = ''
  shown.value = 6
}

const onSearch = debounce(() => {
  shown.value = 6
}, 200)

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
</script>

<template>
  <div class="container page">
    <header class="page-head">
      <div>
        <h1>班级文章</h1>
        <p class="subtitle">随笔、活动记录、成长复盘 —— 笔尖下的2419</p>
      </div>
    </header>

    <div class="toolbar card">
      <div class="search-box">
        <AppIcon name="search" :size="17" />
        <input
          v-model="keyword"
          type="search"
          class="search-input"
          placeholder="搜索文章标题或正文…"
          aria-label="搜索文章"
          @input="onSearch"
        />
      </div>
      <div class="chips" role="group" aria-label="分类筛选">
        <button
          v-for="c in ['全部', ...content.articleCategories]"
          :key="c"
          class="chip"
          :class="{ 'chip--active': category === c }"
          :aria-pressed="category === c"
          @click="selectCategory(c)"
        >
          {{ c }}
        </button>
      </div>
    </div>

    <div v-if="popularTags.length" class="tag-bar" aria-label="热门标签">
      <span class="tag-label">热门标签：</span>
      <button
        v-for="t in popularTags"
        :key="t"
        class="chip"
        :class="{ 'chip--active': activeTag === t }"
        :aria-pressed="activeTag === t"
        @click="activeTag = activeTag === t ? '' : t"
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
      />

      <div v-else class="grid">
        <ArticleCard v-for="a in visible" :key="a.id" :article="a" featured />
      </div>

      <div v-if="shown < filtered.length" class="load-more">
        <button class="btn btn--ghost" @click="shown += 6">
          加载更多（剩余 {{ filtered.length - shown }} 篇）
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
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-3);
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
.tag-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-5);
  font-size: 0.85rem;
  color: var(--text-3);
}
.grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: 1fr;
}
@media (min-width: 720px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (min-width: 1080px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (min-width: 1600px) {
  .grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
@media (min-width: 1600px) {
  .grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
.load-more {
  display: flex;
  justify-content: center;
  margin-top: var(--space-8);
}
</style>
