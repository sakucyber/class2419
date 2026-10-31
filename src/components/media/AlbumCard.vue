<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import LazyImage from '@/components/common/LazyImage.vue'
import { useInteractionStore } from '@/store/interaction'
import type { Album } from '@/types'
import { formatDate } from '@/utils/format'

/**
 * `headingLevel`：标题标签的层级。
 *
 * 语义要求标题层级不能跳级（h1 → h3 会让屏幕阅读器「丢失」一层结构）：
 * - 首页里卡片在 SectionHeader（h2）之下 → h3；
 * - 列表页（相册 / 视频 / 文章）里卡片直接跟在 PageHeader（h1）之下 → h2。
 * 所以这里做成可配，由调用方按上下文决定。
 */
withDefaults(defineProps<{ album: Album; headingLevel?: 2 | 3 }>(), { headingLevel: 3 })

const interaction = useInteractionStore()
</script>

<template>
  <RouterLink :to="`/albums/${album.id}`" class="album-card card card-hover">
    <div class="cover">
      <LazyImage :src="album.cover" :alt="album.title" aspect="4 / 3" radius="0" />
      <span class="count">
        <AppIcon name="camera" :size="12" :stroke-width="2" />
        {{ album.photos.length }}
      </span>
      <span
        v-if="interaction.isFavorite('album', album.id)"
        class="fav"
        aria-label="已收藏"
      >
        <AppIcon name="star" :size="16" filled />
      </span>
    </div>
    <div class="body">
      <div class="meta-row">
        <span class="chip chip--primary">{{ album.category }}</span>
        <time class="num" :datetime="album.createdAt">{{ formatDate(album.createdAt) }}</time>
      </div>
      <component :is="`h${headingLevel}`" class="title">{{ album.title }}</component>
      <p class="desc">{{ album.description }}</p>
      <div class="foot">
        <span>{{ album.author }}</span>
        <span class="more">
          查看相册
          <AppIcon name="arrowRight" :size="13" :stroke-width="2" />
        </span>
      </div>
    </div>
  </RouterLink>
</template>

<style scoped>
.album-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  color: var(--text);
}
.album-card:hover {
  color: var(--text);
}
.cover {
  position: relative;
  border-bottom: 1px solid var(--line);
}
[data-style='japandi'] .cover {
  border-bottom: none;
}
[data-style='brutal'] .cover {
  border-bottom: 3px solid #111;
}
.count {
  position: absolute;
  left: var(--space-2);
  bottom: var(--space-2);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: rgba(8, 12, 20, 0.62);
  color: #fff;
  font-size: var(--fs-2xs);
  font-weight: 600;
  border-radius: var(--radius-xs);
}
.fav {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  color: var(--accent-ink);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-xs);
  padding: 4px;
  display: grid;
  place-items: center;
}
.body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex: 1;
  padding: var(--space-4);
}
.meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  font-size: var(--fs-2xs);
  color: var(--text-3);
}
.meta-row .chip {
  font-size: var(--fs-2xs);
  min-height: 24px;
}
.title {
  font-size: var(--fs-lg);
  line-height: 1.4;
}
.desc {
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
.more {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--accent-ink);
  font-weight: 600;
}
[data-style='annual'] .title {
  font-family: var(--font-serif);
  font-weight: 600;
}
[data-style='brutal'] .fav {
  border-width: 3px;
  border-color: #111;
  background: var(--accent);
  color: #111;
  border-radius: 0;
}
[data-style='brutal'] .count {
  border-radius: 0;
  border: 2px solid #111;
}

/* ---------- 校园：一张拍立得 ----------
   卡片本身就是相纸：白边 + 底部留白放标题；胶带用 ::before 画在卡片内侧顶部，
   避免超出 overflow: hidden 被裁掉。 */
[data-style='campus'] .album-card {
  padding: 10px 10px 4px;
  border: none;
  border-radius: 4px;
  background: #fff;
  box-shadow: 0 14px 26px -18px rgba(51, 71, 91, 0.55);
  transform: rotate(-1.2deg);
}
[data-style='campus'] .album-card:nth-child(even) {
  transform: rotate(1.2deg);
}
[data-style='campus'] .album-card::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 50%;
  z-index: 3;
  width: 74px;
  height: 17px;
  transform: translateX(-50%) rotate(-3deg);
  background: rgba(255, 224, 130, 0.85);
  border: 1px solid rgba(232, 162, 61, 0.35);
}
[data-style='campus'] .album-card:hover {
  transform: rotate(0) translateY(-6px) scale(1.02);
}
[data-style='campus'] .cover {
  border-bottom: none;
  border-radius: 3px;
  overflow: hidden;
}
[data-style='campus'] .body {
  padding: 8px 4px 4px;
}
[data-style='campus'] .title {
  font-family: var(--font-hand);
  font-size: 1.3rem;
  font-weight: 400;
  line-height: 1.35;
}
[data-style='campus'] .foot {
  border-top: 1px dashed rgba(51, 71, 91, 0.16);
}
[data-style='campus'] .meta-row .chip {
  background: var(--campus-sticky-b);
  color: var(--campus-blue-d);
  border-color: transparent;
}
[data-style='campus'] .fav {
  border-radius: 999px;
  border-color: var(--campus-sun);
}
[data-style='campus'] .desc {
  color: var(--text-2);
}
/* 暗色下相纸换成深色纸面 + 细描边：一排纯白卡片压在深底上太刺眼 */
[data-style='campus'][data-theme='dark'] .album-card {
  background: #1d2a37;
  border: 1px solid var(--line-2);
  box-shadow: 0 16px 30px -20px rgba(0, 0, 0, 0.75);
}
[data-style='campus'][data-theme='dark'] .album-card:hover {
  border-color: var(--campus-blue-l);
}
[data-style='campus'][data-theme='dark'] .meta-row .chip {
  background: var(--campus-sticky-b);
}
</style>
