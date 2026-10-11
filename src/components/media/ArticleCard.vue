<script setup lang="ts">
import LazyImage from '@/components/common/LazyImage.vue'
import { useInteractionStore } from '@/store/interaction'
import type { Article } from '@/types'
import { formatDate } from '@/utils/format'

defineProps<{ article: Article; featured?: boolean }>()
const interaction = useInteractionStore()
</script>

<template>
  <RouterLink
    :to="`/articles/${article.id}`"
    class="article-card card card-hover"
    :class="{ featured }"
  >
    <div v-if="featured" class="cover">
      <LazyImage :src="article.cover" :alt="article.title" aspect="16 / 9" radius="0" />
    </div>
    <div class="body">
      <div class="meta-row">
        <span class="chip chip--primary">{{ article.category }}</span>
        <time :datetime="article.createdAt">{{ formatDate(article.createdAt) }}</time>
        <span class="read">约 {{ article.readingMinutes }} 分钟</span>
      </div>
      <h3 class="title">
        {{ article.title }}
        <span v-if="interaction.isFavorite('article', article.id)" aria-label="已收藏">⭐</span>
      </h3>
      <p class="excerpt">{{ article.excerpt }}</p>
      <div class="foot">
        <div class="tags">
          <span v-for="tag in article.tags.slice(0, 3)" :key="tag" class="tag">#{{ tag }}</span>
        </div>
        <span class="author">{{ article.author }}</span>
      </div>
    </div>
  </RouterLink>
</template>

<style scoped>
.article-card {
  display: flex;
  color: var(--text);
  overflow: hidden;
  height: 100%;
}
.article-card:hover {
  color: var(--text);
}
.article-card.featured {
  flex-direction: column;
}
.cover {
  min-width: 0;
}
.body {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex: 1;
  min-width: 0;
}
.meta-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.78rem;
  color: var(--text-3);
  flex-wrap: wrap;
}
.read {
  margin-left: auto;
}
.title {
  font-size: 1.05rem;
  line-height: 1.45;
  display: flex;
  gap: 6px;
  align-items: baseline;
}
.excerpt {
  color: var(--text-2);
  font-size: 0.88rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}
.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-top: auto;
  padding-top: var(--space-2);
  border-top: 1px dashed var(--border);
  font-size: 0.78rem;
  color: var(--text-3);
}
.tags {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.tag {
  color: var(--primary);
  font-weight: 600;
}
.author {
  flex: none;
}
</style>
