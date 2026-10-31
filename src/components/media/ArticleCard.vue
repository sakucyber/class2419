<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import LazyImage from '@/components/common/LazyImage.vue'
import { useInteractionStore } from '@/store/interaction'
import type { Article } from '@/types'
import { formatDate } from '@/utils/format'

/**
 * `headingLevel`：标题标签的层级。
 * 首页里卡片在 SectionHeader（h2）之下 → h3；
 * 列表页（文章）里卡片直接跟在 PageHeader（h1）之下 → h2。
 * 标题层级不能跳级，所以按上下文由调用方决定。
 */
withDefaults(defineProps<{ article: Article; featured?: boolean; headingLevel?: 2 | 3 }>(), {
  featured: false,
  headingLevel: 3,
})
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
        <time class="num" :datetime="article.createdAt">{{ formatDate(article.createdAt) }}</time>
        <span class="read">约 {{ article.readingMinutes }} 分钟</span>
      </div>
      <component :is="`h${headingLevel}`" class="title">
        {{ article.title }}
        <AppIcon
          v-if="interaction.isFavorite('article', article.id)"
          name="star"
          :size="14"
          filled
          aria-label="已收藏"
        />
      </component>
      <p class="excerpt">{{ article.excerpt }}</p>
      <div class="foot">
        <div class="tags">
          <span v-for="tag in article.tags.slice(0, 3)" :key="tag" class="tag">#{{ tag }}</span>
        </div>
        <span>{{ article.author }}</span>
      </div>
    </div>
  </RouterLink>
</template>

<style scoped>
.article-card {
  display: flex;
  height: 100%;
  overflow: hidden;
  color: var(--text);
}
.article-card:hover {
  color: var(--text);
}
.article-card.featured {
  flex-direction: column;
}
.cover {
  min-width: 0;
  border-bottom: 1px solid var(--line);
}
[data-style='japandi'] .cover {
  border-bottom: none;
}
[data-style='brutal'] .cover {
  border-bottom: 3px solid #111;
}
.body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex: 1;
  min-width: 0;
  padding: var(--space-4);
}
.meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
  font-size: var(--fs-2xs);
  color: var(--text-3);
}
.meta-row .chip {
  font-size: var(--fs-2xs);
  min-height: 24px;
}
.read {
  margin-left: auto;
}
.title {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: var(--fs-lg);
  line-height: 1.45;
}
.excerpt {
  flex: 1;
  color: var(--text-2);
  font-size: var(--fs-sm);
  line-height: 1.65;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-top: auto;
  padding-top: var(--space-3);
  border-top: 1px solid var(--line);
  font-size: var(--fs-2xs);
  color: var(--text-3);
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.tag {
  color: var(--accent-ink);
  font-weight: 600;
}
[data-style='annual'] .title {
  font-family: var(--font-serif);
  font-weight: 600;
}
/* 年鉴：非头条文章改成「刊物目录」式的行，而不是一张张卡片 */
[data-style='annual'] .article-card:not(.featured) {
  border: none;
  border-top: 1px solid var(--line);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}
[data-style='annual'] .article-card:not(.featured):hover {
  transform: none;
  background: var(--accent-soft);
  box-shadow: none;
}
[data-style='annual'] .article-card:not(.featured) .body {
  padding: var(--space-4) var(--space-2);
}
[data-style='brutal'] .tag {
  background: var(--accent);
  color: #111;
  padding: 0 4px;
  font-weight: 900;
}

/* 校园：白色卡片 + 一条黄色压边，标题用手账体 */
[data-style='campus'] .cover {
  border-bottom: 5px solid var(--campus-sun);
}
[data-style='campus'] .title {
  font-family: var(--font-display);
  font-weight: 400;
  letter-spacing: 0.3px;
}
[data-style='campus'] .tag {
  background: var(--campus-sticky-b);
  color: var(--campus-blue-d);
  border-radius: 999px;
  padding: 1px 9px;
}
</style>
