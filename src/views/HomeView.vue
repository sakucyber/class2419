<script setup lang="ts">
import { computed } from 'vue'

import Carousel from '@/components/common/Carousel.vue'
import CountdownTimer from '@/components/common/CountdownTimer.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import LazyImage from '@/components/common/LazyImage.vue'
import SectionHeader from '@/components/common/SectionHeader.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import AlbumCard from '@/components/media/AlbumCard.vue'
import ArticleCard from '@/components/media/ArticleCard.vue'
import VideoCard from '@/components/media/VideoCard.vue'
import { useContentStore } from '@/store/content'
import { formatRelative } from '@/utils/format'

const content = useContentStore()

const latestAlbums = computed(() => content.publicAlbums.slice(0, 3))
const latestVideos = computed(() => content.publicVideos.slice(0, 3))
const latestArticles = computed(() => content.publicArticles.slice(0, 4))
const notices = computed(() => content.publicAnnouncements.slice(0, 4))
</script>

<template>
  <div class="home">
    <!-- 加载态 -->
    <template v-if="content.loading">
      <div class="container section">
        <SkeletonBlock variant="hero" />
      </div>
      <div class="container section">
        <SkeletonBlock variant="grid" :count="3" />
      </div>
      <div class="container section">
        <SkeletonBlock variant="grid" :count="3" />
      </div>
    </template>

    <ErrorState v-else-if="content.error" :message="content.error" @retry="content.init()" />

    <template v-else>
      <!-- 班级名片 + 倒计时 -->
      <section class="container section hero-wrap">
        <article class="class-card card">
          <LazyImage
            class="card-bg"
            src="/images/misc/class-card-bg.svg"
            alt=""
            aspect="16 / 9"
            radius="var(--radius-md)"
            eager
          />
          <div class="card-content">
            <p class="eyebrow">
              <span class="eyebrow-dot" aria-hidden="true"></span>
              {{ content.classInfo.school }}
            </p>
            <h1 class="class-name">{{ content.classInfo.fullName }}</h1>
            <p class="motto">「{{ content.classInfo.motto }}」</p>
            <p class="slogan">{{ content.classInfo.slogan }}</p>
            <p class="intro">{{ content.classInfo.description }}</p>
            <ul class="stats" aria-label="班级数据">
              <li v-for="s in content.classInfo.stats" :key="s.label" class="stat-chip">
                <strong>{{ s.value }}</strong>
                <span>{{ s.label }}</span>
              </li>
            </ul>
            <div class="hero-actions">
              <RouterLink to="/about" class="btn hero-btn-primary">了解我们 →</RouterLink>
              <RouterLink to="/albums" class="btn hero-btn-ghost">逛逛相册</RouterLink>
            </div>
          </div>
        </article>

        <aside class="countdown-card card" aria-label="毕业倒计时">
          <div class="count-head">
            <span class="count-label">⏳ 距离毕业典礼</span>
            <span class="count-date-chip">{{ content.classInfo.graduationAt }}</span>
          </div>
          <CountdownTimer :target="content.classInfo.graduationAt" />
          <p class="count-note">愿此去繁花似锦，再相逢依旧如故。</p>
          <RouterLink to="/about" class="count-link">查看班级时间线 →</RouterLink>
        </aside>
      </section>

      <!-- 轮播 -->
      <section class="container section" aria-label="班级风采">
        <Carousel :slides="content.slides" />
      </section>

      <!-- 公告 -->
      <section v-if="notices.length" class="container section">
        <SectionHeader title="班级公告" subtitle="来自班委会与老师们的最新消息" />
        <ul class="notice-list">
          <li
            v-for="n in notices"
            :key="n.id"
            class="notice card"
            :class="`level-${n.level || 'info'}`"
          >
            <div class="notice-head">
              <span v-if="n.pinned" class="pin" aria-label="置顶">📌</span>
              <strong>{{ n.title }}</strong>
              <time :datetime="n.createdAt">{{ formatRelative(n.createdAt) }}</time>
            </div>
            <p>{{ n.content }}</p>
          </li>
        </ul>
      </section>

      <!-- 最新相册 -->
      <section class="container section">
        <SectionHeader title="最新相册" subtitle="咔嚓，把时光存档" to="/albums" />
        <SkeletonBlock v-if="content.loading" variant="grid" :count="3" />
        <div v-else-if="latestAlbums.length" class="grid-3">
          <AlbumCard v-for="a in latestAlbums" :key="a.id" :album="a" />
        </div>
        <EmptyState
          v-else
          icon="🖼️"
          title="还没有相册"
          description="快去投稿第一组照片吧！"
          action-text="去投稿"
          action-to="/admin"
        />
      </section>

      <!-- 最新视频 -->
      <section class="container section">
        <SectionHeader title="最新视频" subtitle="动态记录，声临其境" to="/videos" />
        <div v-if="latestVideos.length" class="grid-3">
          <VideoCard v-for="v in latestVideos" :key="v.id" :video="v" />
        </div>
        <EmptyState
          v-else
          icon="🎬"
          title="还没有视频"
          description="上传一段班级短片试试？"
          action-text="去投稿"
          action-to="/admin"
        />
      </section>

      <!-- 最新文章 -->
      <section class="container section">
        <SectionHeader title="最新文章" subtitle="笔尖下的2419" to="/articles" />
        <div v-if="latestArticles.length" class="articles-grid">
          <ArticleCard :article="latestArticles[0]" featured class="featured" />
          <div class="article-list">
            <ArticleCard v-for="a in latestArticles.slice(1)" :key="a.id" :article="a" />
          </div>
        </div>
        <EmptyState
          v-else
          icon="📝"
          title="还没有文章"
          description="写下属于我们的故事吧。"
          action-text="去投稿"
          action-to="/admin"
        />
      </section>
    </template>
  </div>
</template>

<style scoped>
.section {
  margin-top: var(--space-8);
}
.section:first-child {
  margin-top: var(--space-6);
}

/* 班级名片 */
.hero-wrap {
  display: grid;
  gap: var(--space-4);
}
@media (min-width: 900px) {
  .hero-wrap {
    grid-template-columns: 1.7fr 1fr;
    align-items: stretch;
  }
}
.class-card {
  position: relative;
  overflow: hidden;
  padding: 0;
  border: none;
}
.card-bg {
  position: absolute;
  inset: 0;
}
.card-bg :deep(.img) {
  filter: saturate(1.05);
}
.card-content {
  position: relative;
  padding: clamp(22px, 4vw, 40px);
  background: linear-gradient(
    105deg,
    rgba(8, 16, 36, 0.92) 0%,
    rgba(8, 16, 36, 0.78) 45%,
    rgba(8, 16, 36, 0.42) 100%
  );
  color: #fff;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  letter-spacing: 2px;
  opacity: 0.9;
  font-weight: 600;
}
.eyebrow-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: #34d399;
  box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.25);
}
.class-name {
  color: #fff;
  font-size: clamp(1.45rem, 4vw, 2.15rem);
  text-shadow: 0 2px 14px rgba(0, 0, 0, 0.35);
}
.motto {
  font-size: 1.05rem;
  font-weight: 700;
  color: #a5f3fc;
}
.slogan {
  font-size: 0.88rem;
  font-weight: 600;
  opacity: 0.8;
  letter-spacing: 1px;
}
.intro {
  font-size: 0.88rem;
  line-height: 1.85;
  opacity: 0.88;
  max-width: 58ch;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-top: 2px;
}
.stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: auto;
}
.stat-chip {
  display: flex;
  flex-direction: column;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: var(--radius-sm);
  backdrop-filter: blur(6px);
  min-width: 86px;
}
.stat-chip strong {
  font-size: 1.12rem;
  font-variant-numeric: tabular-nums;
  line-height: 1.3;
}
.stat-chip span {
  font-size: 0.7rem;
  opacity: 0.8;
}
.hero-actions {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-top: var(--space-2);
}
.hero-btn-primary {
  background: #fff;
  color: #0f172a;
  border-radius: var(--radius-full);
  padding: 0.55em 1.4em;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
}
.hero-btn-primary:hover {
  background: #e2e8f0;
  color: #0f172a;
}
.hero-btn-ghost {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.35);
  color: #fff;
  border-radius: var(--radius-full);
  padding: 0.55em 1.4em;
  backdrop-filter: blur(4px);
}
.hero-btn-ghost:hover {
  background: rgba(255, 255, 255, 0.24);
  color: #fff;
}

.countdown-card {
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  justify-content: center;
  background: var(--card);
  position: relative;
  overflow: hidden;
}
.countdown-card::before {
  content: '';
  position: absolute;
  top: -40px;
  right: -40px;
  width: 140px;
  height: 140px;
  border-radius: var(--radius-full);
  background: var(--primary-soft);
  pointer-events: none;
}
.count-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  flex-wrap: wrap;
  position: relative;
}
.count-label {
  color: var(--text-2);
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.count-date-chip {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--primary);
  background: var(--primary-soft);
  border: 1px solid var(--primary-soft-2);
  padding: 2px 10px;
  border-radius: var(--radius-full);
  font-variant-numeric: tabular-nums;
}
.count-note {
  color: var(--text-3);
  font-size: 0.85rem;
}
.count-link {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--primary);
  width: fit-content;
}

/* 公告 */
.notice-list {
  display: grid;
  gap: var(--space-3);
}
.notice {
  padding: var(--space-4);
  border-left: 4px solid var(--border-strong);
}
.notice.level-warning {
  border-left-color: var(--warning);
}
.notice.level-success {
  border-left-color: var(--success);
}
.notice.level-info {
  border-left-color: var(--info);
}
.notice-head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: 6px;
}
.notice-head time {
  margin-left: auto;
  color: var(--text-3);
  font-size: 0.78rem;
  flex: none;
}
.notice p {
  color: var(--text-2);
  font-size: 0.9rem;
}
.pin {
  font-size: 0.9rem;
}

/* 网格 */
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

.articles-grid {
  display: grid;
  gap: var(--space-4);
}
@media (min-width: 960px) {
  .articles-grid {
    grid-template-columns: 1.2fr 1fr;
    align-items: start;
  }
  .featured {
    position: sticky;
    top: calc(var(--header-h) + 16px);
  }
}
.article-list {
  display: grid;
  gap: var(--space-3);
}
</style>
