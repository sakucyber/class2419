<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppIcon from '@/components/common/AppIcon.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
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

const TYPES = ['all', 'album', 'video', 'article', 'tag'] as const
const typeLabel: Record<string, string> = {
  album: '相册',
  video: '视频',
  article: '文章',
  tag: '标签',
}
</script>

<template>
  <div class="container page">
    <PageHeader kicker="Search" title="全站搜索" subtitle="相册、视频、文章与标签，一次搜完。" />

    <div class="search-box card">
      <AppIcon name="search" :size="18" :stroke-width="1.9" />
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
        v-for="t in TYPES"
        :key="t"
        class="chip"
        type="button"
        :class="{ 'chip--active': typeFilter === t }"
        role="tab"
        :aria-selected="typeFilter === t"
        @click="typeFilter = t"
      >
        {{ t === 'all' ? '全部' : typeLabel[t] }}
        <span class="count num">{{ counts[t] }}</span>
      </button>
    </div>

    <EmptyState
      v-if="!keyword.trim()"
      icon="sparkles"
      title="搜点什么吧"
      description="例如：运动会、研学、合唱、赖老师…"
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
  max-width: 860px;
}
.search-box {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 0 var(--space-4);
  margin-bottom: var(--space-4);
  color: var(--text-3);
}
.search-input {
  flex: 1;
  min-width: 0;
  padding: 0.75em 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text);
  font-size: 1.05rem;
}
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-6);
}
.count {
  font-size: 0.7rem;
  opacity: 0.7;
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
  flex: none;
  object-fit: cover;
  background: var(--bg-soft);
  border-radius: var(--radius-xs);
}
.cover--tag {
  display: grid;
  place-items: center;
  color: var(--accent-ink);
  font-family: var(--font-display);
  font-size: 1.2rem;
  font-weight: 700;
}
.meta {
  flex: 1;
  min-width: 0;
}
.meta strong {
  display: block;
  font-family: var(--font-display);
  font-size: var(--fs-md);
  font-weight: var(--display-weight);
}
.meta small {
  color: var(--text-3);
  font-size: var(--fs-xs);
}
.type {
  flex: none;
  padding: 2px 8px;
  color: var(--accent-ink);
  background: var(--accent-soft);
  font-size: var(--fs-2xs);
  font-weight: 700;
  border-radius: var(--radius-xs);
}
[data-style='japandi'] .type {
  border-radius: 999px;
}
[data-style='brutal'] .type {
  border: 2px solid #111;
  background: var(--accent);
  color: #111;
  font-weight: 900;
}
</style>
