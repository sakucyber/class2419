<script setup lang="ts">
/**
 * 首页只负责「数据编排」：取最新内容、抽随机回忆、控制加载/错误态。
 * 主视觉与公告区的版式各自封装在 components/home 下，
 * 这样五套皮肤的大段风格覆盖不会把本文件撑到近千行。
 */
import { computed, ref } from 'vue'

import Carousel from '@/components/common/Carousel.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import PolaroidModal from '@/components/common/PolaroidModal.vue'
import SectionHeader from '@/components/common/SectionHeader.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import HomeHero from '@/components/home/HomeHero.vue'
import HomeNotices from '@/components/home/HomeNotices.vue'
import AlbumCard from '@/components/media/AlbumCard.vue'
import ArticleCard from '@/components/media/ArticleCard.vue'
import VideoCard from '@/components/media/VideoCard.vue'
import { useContentStore } from '@/store/content'
import type { PolaroidPhoto } from '@/types'

const content = useContentStore()

const latestAlbums = computed(() => content.publicAlbums.slice(0, 3))
const latestVideos = computed(() => content.publicVideos.slice(0, 3))
const latestArticles = computed(() => content.publicArticles.slice(0, 4))
const notices = computed(() => content.publicAnnouncements.slice(0, 3))

/* ─────────────── 随机回忆（拍立得） ───────────────
 * 数据源是已发布相册的全部照片，不新增任何数据结构；
 * 照片本身没有日期，`date` 取所属相册的 createdAt，界面写「收录于」。 */
const allPhotos = computed<PolaroidPhoto[]>(() =>
  content.publicAlbums.flatMap((album) =>
    (album.photos ?? []).map((photo) => ({
      id: photo.id,
      src: photo.src,
      caption: photo.caption ?? '',
      albumTitle: album.title,
      date: album.createdAt,
    })),
  ),
)

const polaroid = ref<PolaroidPhoto | null>(null)
let lastPhotoId = ''

/** 连续点「随机回忆」时不重复同一张（只有一张照片时除外） */
function openRandomMemory(): void {
  const pool = allPhotos.value
  if (pool.length === 0) return
  const candidates = pool.length > 1 ? pool.filter((p) => p.id !== lastPhotoId) : pool
  const picked = candidates[Math.floor(Math.random() * candidates.length)]
  lastPhotoId = picked.id
  polaroid.value = picked
}
</script>

<template>
  <div class="home">
    <template v-if="content.loading">
      <div class="container section">
        <SkeletonBlock variant="hero" />
      </div>
      <div class="container section">
        <SkeletonBlock variant="grid" :count="3" />
      </div>
    </template>

    <ErrorState v-else-if="content.error" :message="content.error" @retry="content.init()" />

    <template v-else>
      <!-- 班级名片 + 倒计时 -->
      <HomeHero :class-info="content.classInfo" @random-memory="openRandomMemory" />

      <!-- 轮播 -->
      <section v-reveal class="container section" aria-label="班级风采">
        <Carousel :slides="content.slides" />
      </section>

      <!-- 公告 -->
      <HomeNotices v-if="notices.length" :notices="notices" />

      <!-- 最新相册 -->
      <section v-reveal class="container section">
        <SectionHeader tag="Album" title="最新相册" subtitle="咔嚓，把时光存档" to="/albums" />
        <div v-if="latestAlbums.length" class="grid-cards">
          <AlbumCard v-for="a in latestAlbums" :key="a.id" :album="a" />
        </div>
        <EmptyState
          v-else
          icon="image"
          title="还没有相册"
          description="照片还在整理中，敬请期待。"
        />
      </section>

      <!-- 最新视频 -->
      <section v-reveal class="container section">
        <SectionHeader tag="Video" title="最新视频" subtitle="动态记录，声临其境" to="/videos" />
        <div v-if="latestVideos.length" class="grid-cards">
          <VideoCard v-for="v in latestVideos" :key="v.id" :video="v" />
        </div>
        <EmptyState
          v-else
          icon="video"
          title="还没有视频"
          description="短片还在剪辑中，敬请期待。"
        />
      </section>

      <!-- 最新文章 -->
      <section v-reveal class="container section">
        <SectionHeader tag="Article" title="最新文章" subtitle="笔尖下的2419" to="/articles" />
        <div v-if="latestArticles.length" class="articles">
          <ArticleCard :article="latestArticles[0]" featured />
          <div class="article-list">
            <ArticleCard v-for="a in latestArticles.slice(1)" :key="a.id" :article="a" />
          </div>
        </div>
        <EmptyState
          v-else
          icon="article"
          title="还没有文章"
          description="故事还在落笔中，敬请期待。"
        />
      </section>
    </template>

    <PolaroidModal :photo="polaroid" @close="polaroid = null" />
  </div>
</template>

<style scoped>
/* ---------- 文章区 ---------- */
.articles {
  display: grid;
  gap: var(--space-4);
}
@media (min-width: 960px) {
  .articles {
    grid-template-columns: 1.15fr 1fr;
    align-items: start;
  }
  .articles > :first-child {
    position: sticky;
    top: calc(var(--header-h) + 16px);
    /* ArticleCard 的 height:100% 是为列表页等高服务的；
       头条卡跟着右栏一起被拉长会留出一大片空白，这里按内容高度收住 */
    height: auto;
  }
}
.article-list {
  display: grid;
  gap: var(--space-3);
}
[data-style='annual'] .article-list {
  gap: 0;
  border-bottom: 1px solid var(--line);
}
</style>
