<script setup lang="ts">
import { computed, ref } from 'vue'

import AppIcon from '@/components/common/AppIcon.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import VideoCard from '@/components/media/VideoCard.vue'
import { useContentStore } from '@/store/content'
import { debounce } from '@/utils/format'

const content = useContentStore()

const keyword = ref('')
const category = ref('全部')
const shown = ref(9)

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return content.publicVideos.filter((v) => {
    const okCat = category.value === '全部' || v.category === category.value
    const okKw =
      !kw ||
      v.title.toLowerCase().includes(kw) ||
      v.description.toLowerCase().includes(kw) ||
      v.tags.some((t) => t.toLowerCase().includes(kw))
    return okCat && okKw
  })
})

const visible = computed(() => filtered.value.slice(0, shown.value))
const onSearch = debounce(() => {
  shown.value = 9
}, 200)
</script>

<template>
  <div class="container page">
    <header class="page-head">
      <div>
        <h1>班级视频</h1>
        <p class="subtitle">外链视频跳转播放，本地视频在线播放并自动记忆进度</p>
      </div>
    </header>

    <div class="toolbar card">
      <div class="search-box">
        <AppIcon name="search" :size="17" />
        <input
          v-model="keyword"
          type="search"
          class="search-input"
          placeholder="搜索视频…"
          aria-label="搜索视频"
          @input="onSearch"
        />
      </div>
      <div class="chips" role="group" aria-label="分类筛选">
        <button
          v-for="c in ['全部', ...content.videoCategories]"
          :key="c"
          class="chip"
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
      />

      <div v-else class="grid-3">
        <VideoCard v-for="v in visible" :key="v.id" :video="v" />
      </div>

      <div v-if="shown < filtered.length" class="load-more">
        <button class="btn btn--ghost" @click="shown += 9">
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
.load-more {
  display: flex;
  justify-content: center;
  margin-top: var(--space-8);
}
</style>
