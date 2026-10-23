<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppIcon from '@/components/common/AppIcon.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useContentStore } from '@/store/content'

const route = useRoute()
const router = useRouter()
const content = useContentStore()

const keyword = ref(String(route.query.q || ''))
const typeFilter = ref<'all' | 'album' | 'video' | 'article' | 'tag'>('all')

const hits = computed(() => content.search(keyword.value))
const filtered = computed(() =>
  typeFilter.value === 'all' ? hits.value : hits.value.filter((h) => h.type === typeFilter.value),
)

const counts = computed(() => ({
  all: hits.value.length,
  album: hits.value.filter((h) => h.type === 'album').length,
  video: hits.value.filter((h) => h.type === 'video').length,
  article: hits.value.filter((h) => h.type === 'article').length,
  tag: hits.value.filter((h) => h.type === 'tag').length,
}))

watch(keyword, () => {
  router.replace({ query: keyword.value ? { q: keyword.value } : {} })
})

watch(
  () => route.query.q,
  (q) => {
    if (typeof q === 'string' && q !== keyword.value) keyword.value = q
  },
)

const typeLabel: Record<string, string> = {
  album: '相册',
  video: '视频',
  article: '文章',
  tag: '标签',
}
</script>

<template>
  <div class="container page">
    <header class="page-head">
      <h1>全站搜索</h1>
      <div class="search-box card">
        <AppIcon name="search" :size="17" />
        <input
          v-model="keyword"
          type="search"
          class="search-input"
          placeholder="输入关键词，搜索相册、视频、文章或标签…"
          aria-label="搜索关键词"
          autofocus
        />
      </div>
      <div class="tabs" role="tablist" aria-label="结果类型">
        <button
          v-for="t in ['all', 'album', 'video', 'article', 'tag'] as const"
          :key="t"
          class="chip"
          :class="{ 'chip--active': typeFilter === t }"
          role="tab"
          :aria-selected="typeFilter === t"
          @click="typeFilter = t"
        >
          {{ t === 'all' ? '全部' : typeLabel[t] }}
          <span class="count">{{ counts[t] }}</span>
        </button>
      </div>
    </header>

    <EmptyState
      v-if="!keyword.trim()"
      icon="sparkles"
      title="搜点什么吧"
      description="例如：运动会、研学、合唱、林老师…"
    />
    <EmptyState
      v-else-if="!filtered.length"
      icon="compass"
      title="没有找到相关内容"
      description="换个关键词，或浏览文章列表。"
      action-text="去逛文章"
      action-to="/articles"
    />

    <ul v-else class="results">
      <li v-for="hit in filtered" :key="hit.type + hit.id">
        <RouterLink :to="hit.to" class="result card card-hover">
          <img v-if="hit.cover" :src="hit.cover" alt="" class="cover" loading="lazy" />
          <span v-else class="cover cover--tag" aria-hidden="true">#</span>
          <div class="meta">
            <strong>{{ hit.title }}</strong>
            <small>{{ hit.subtitle }}</small>
          </div>
          <span class="type">{{ typeLabel[hit.type] }}</span>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.page {
  padding-top: var(--space-6);
  max-width: 820px;
}
.page-head {
  margin-bottom: var(--space-6);
}
h1 {
  font-size: var(--fs-2xl);
  margin-bottom: var(--space-4);
}
.search-box {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 0 var(--space-4);
}
.search-input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  color: var(--text);
  padding: 0.7em 0;
  font-size: 1.05rem;
  min-width: 0;
}
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-3);
}
.count {
  opacity: 0.7;
  font-size: 0.75rem;
}

.results {
  display: grid;
  gap: var(--space-3);
}
.result {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  color: var(--text);
}
.result:hover {
  color: var(--text);
}
.cover {
  width: 84px;
  height: 56px;
  object-fit: cover;
  border-radius: var(--radius-xs);
  flex: none;
  background: var(--bg-soft);
}
.cover--tag {
  display: grid;
  place-items: center;
  color: var(--primary);
  font-weight: 700;
  font-size: 1.2rem;
}
.meta {
  flex: 1;
  min-width: 0;
}
.meta strong {
  display: block;
  font-size: 1rem;
}
.meta small {
  color: var(--text-3);
  font-size: 0.8rem;
}
.type {
  flex: none;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--primary);
  background: var(--primary-soft);
  padding: 2px 10px;
  border-radius: var(--radius-full);
}
</style>
