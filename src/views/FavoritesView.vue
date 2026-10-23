<script setup lang="ts">
/**
 * 我的收藏。
 *
 * 收藏数据在 interaction store 里是 `kind:id` 的布尔表；这里反查内容 store 的
 * public* 列表还原成卡片（public* 已经过滤草稿并按时间排序）。
 * 取消收藏直接复用 store 的 toggleFavorite，列表会响应式更新。
 */
import { computed } from 'vue'

import AppIcon from '@/components/common/AppIcon.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import AlbumCard from '@/components/media/AlbumCard.vue'
import ArticleCard from '@/components/media/ArticleCard.vue'
import VideoCard from '@/components/media/VideoCard.vue'
import { useContentStore } from '@/store/content'
import { useInteractionStore } from '@/store/interaction'
import type { Album, Article, VideoItem } from '@/types'

const content = useContentStore()
const interaction = useInteractionStore()

const sections = computed(() => {
  const albums: Album[] = []
  const videos: VideoItem[] = []
  const articles: Article[] = []
  for (const key of Object.keys(interaction.favorites)) {
    if (!interaction.favorites[key]) continue
    const [kind, id] = key.split(':')
    if (kind === 'album') {
      const item = content.publicAlbums.find((a) => a.id === id)
      if (item) albums.push(item)
    } else if (kind === 'video') {
      const item = content.publicVideos.find((v) => v.id === id)
      if (item) videos.push(item)
    } else if (kind === 'article') {
      const item = content.publicArticles.find((a) => a.id === id)
      if (item) articles.push(item)
    }
  }
  return { albums, videos, articles }
})

const total = computed(
  () =>
    sections.value.albums.length + sections.value.videos.length + sections.value.articles.length,
)

type Kind = 'album' | 'video' | 'article'
function remove(kind: Kind, id: string): void {
  interaction.toggleFavorite(kind, id)
}
</script>

<template>
  <div class="container page">
    <header class="page-head">
      <div>
        <h1>我的收藏</h1>
        <p class="subtitle">
          收藏只保存在当前浏览器；共 {{ total }} 项。在详情页点「收藏」即可加入这里。
        </p>
      </div>
    </header>

    <EmptyState
      v-if="!total"
      icon="star"
      title="还没有收藏"
      description="去相册、视频或文章里逛逛，点一下「收藏」，喜欢的内容就会集中在这里。"
      action-text="去逛相册"
      action-to="/albums"
    />

    <template v-else>
      <section v-if="sections.albums.length" class="group" aria-labelledby="fav-albums">
        <h2 id="fav-albums" class="group-title">
          <AppIcon name="image" :size="17" /> 相册（{{ sections.albums.length }}）
        </h2>
        <div class="grid-3">
          <div v-for="album in sections.albums" :key="'album:' + album.id" class="fav-item">
            <AlbumCard :album="album" />
            <button class="remove" type="button" @click="remove('album', album.id)">
              取消收藏
            </button>
          </div>
        </div>
      </section>

      <section v-if="sections.videos.length" class="group" aria-labelledby="fav-videos">
        <h2 id="fav-videos" class="group-title">
          <AppIcon name="video" :size="17" /> 视频（{{ sections.videos.length }}）
        </h2>
        <div class="grid-3">
          <div v-for="video in sections.videos" :key="'video:' + video.id" class="fav-item">
            <VideoCard :video="video" />
            <button class="remove" type="button" @click="remove('video', video.id)">
              取消收藏
            </button>
          </div>
        </div>
      </section>

      <section v-if="sections.articles.length" class="group" aria-labelledby="fav-articles">
        <h2 id="fav-articles" class="group-title">
          <AppIcon name="article" :size="17" /> 文章（{{ sections.articles.length }}）
        </h2>
        <div class="grid-3">
          <div v-for="article in sections.articles" :key="'article:' + article.id" class="fav-item">
            <ArticleCard :article="article" />
            <button class="remove" type="button" @click="remove('article', article.id)">
              取消收藏
            </button>
          </div>
        </div>
      </section>
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
  font-size: var(--fs-2xl);
}
.subtitle {
  margin-top: 6px;
  color: var(--text-3);
  font-size: var(--fs-sm);
}
.group {
  margin-bottom: var(--space-8);
}
.group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: var(--space-4);
  font-size: 1.05rem;
  color: var(--text-2);
}
.fav-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.remove {
  align-self: flex-start;
  padding: 4px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--text-3);
  font-size: 0.78rem;
  font-family: inherit;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease);
}
.remove:hover {
  color: var(--danger);
  border-color: var(--danger);
}
.remove:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
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
</style>
