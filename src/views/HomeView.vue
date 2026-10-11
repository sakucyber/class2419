<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import AppIcon from '@/components/common/AppIcon.vue'
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
import { formatDate, formatRelative } from '@/utils/format'

const content = useContentStore()

const latestAlbums = computed(() => content.publicAlbums.slice(0, 3))
const latestVideos = computed(() => content.publicVideos.slice(0, 3))
const latestArticles = computed(() => content.publicArticles.slice(0, 4))
const notices = computed(() => content.publicAnnouncements.slice(0, 4))

/* hero 背景视差：轻微下移 + 渐隐，跟随首屏滚动 */
const parallax = ref(0)
function onScroll() {
  const y = window.scrollY
  parallax.value = y < window.innerHeight ? y : window.innerHeight
}
onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
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
        <article class="class-card">
          <div
            class="card-bg"
            :style="{ transform: `scale(1.12) translateY(${parallax * 0.22}px)` }"
          >
            <LazyImage
              src="/images/misc/class-card-bg.svg"
              alt=""
              aspect="16 / 9"
              radius="0"
              eager
            />
          </div>
          <div class="card-content">
            <p class="eyebrow">
              <span class="eyebrow-dot" aria-hidden="true"></span>
              {{ content.classInfo.school }} · {{ content.classInfo.grade }}
            </p>
            <h1 class="class-name">
              我们是<br />
              <span class="grad-text">{{ content.classInfo.shortName }}</span>
            </h1>
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
              <RouterLink to="/about" class="btn btn--gradient hero-btn-primary"
                >了解我们 →</RouterLink
              >
              <RouterLink to="/albums" class="btn hero-btn-ghost">逛逛相册</RouterLink>
            </div>
          </div>
        </article>

        <aside v-reveal="{ type: 'left', delay: 1 }" class="countdown-card card" aria-label="中考倒计时">
          <div class="count-head">
            <span class="count-label">⏳ 距离中考</span>
            <span class="count-date-chip">{{ formatDate(content.classInfo.examAt, true) }}</span>
          </div>
          <CountdownTimer label="中考" :target="content.classInfo.examAt" />
          <p class="count-note">笔锋所至，皆是心之所向。稳住，2419。</p>
          <RouterLink to="/about" class="count-link">查看班级时间线 →</RouterLink>
        </aside>
      </section>

      <!-- 轮播 -->
      <section v-reveal class="container section" aria-label="班级风采">
        <Carousel :slides="content.slides" />
      </section>

      <!-- 公告 -->
      <section v-if="notices.length" v-reveal class="container section">
        <SectionHeader
          tag="Release"
          title="班级空间正式发布"
          subtitle="这个小站上线啦，相册、视频与文章会持续更新"
        />
        <ul class="notice-list">
          <li
            v-for="n in notices"
            :key="n.id"
            class="notice card"
            :class="`level-${n.level || 'info'}`"
          >
            <div class="notice-head">
              <AppIcon v-if="n.pinned" class="pin" name="pin" :size="15" aria-label="置顶" />
              <strong>{{ n.title }}</strong>
              <time :datetime="n.createdAt">{{ formatRelative(n.createdAt) }}</time>
            </div>
            <p>{{ n.content }}</p>
          </li>
        </ul>
      </section>

      <!-- 最新相册 -->
      <section v-reveal class="container section">
        <SectionHeader tag="Album" title="最新相册" subtitle="咔嚓，把时光存档" to="/albums" />
        <SkeletonBlock v-if="content.loading" variant="grid" :count="3" />
        <div v-else-if="latestAlbums.length" class="grid-3">
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
        <div v-if="latestVideos.length" class="grid-3">
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
        <div v-if="latestArticles.length" class="articles-grid">
          <ArticleCard :article="latestArticles[0]" featured class="featured" />
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
  border-radius: var(--radius-xl);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-2);
  min-height: clamp(360px, 46vw, 460px);
  isolation: isolate;
}
.card-bg {
  position: absolute;
  inset: 0;
  will-change: transform;
}
.card-bg :deep(.img) {
  filter: saturate(1.1) contrast(1.05);
  height: 100% !important;
}
.card-content {
  position: relative;
  z-index: 1;
  padding: clamp(24px, 4vw, 44px);
  background: linear-gradient(
    105deg,
    rgba(6, 8, 18, 0.94) 0%,
    rgba(6, 8, 18, 0.82) 46%,
    rgba(6, 8, 18, 0.38) 100%
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
  align-self: flex-start;
  gap: 8px;
  padding: 7px 18px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  font-size: 0.76rem;
  letter-spacing: 2px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.92);
}
.eyebrow-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: #34d399;
  box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.28);
  animation: pulse-dot 2.4s ease-in-out infinite;
}
@keyframes pulse-dot {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}
.class-name {
  font-family: var(--font-display);
  color: #fff;
  font-size: clamp(1.8rem, 5vw, 3rem);
  font-weight: 900;
  line-height: 1.2;
  letter-spacing: 1px;
  text-shadow: 0 2px 18px rgba(0, 0, 0, 0.4);
}
.motto {
  font-size: clamp(1rem, 2vw, 1.2rem);
  font-weight: 800;
  color: #f9a8d4;
  letter-spacing: 1px;
}
.slogan {
  font-size: 0.9rem;
  font-weight: 600;
  opacity: 0.78;
  letter-spacing: 2px;
}
.intro {
  font-size: 0.88rem;
  line-height: 1.9;
  opacity: 0.88;
  max-width: 58ch;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-top: 2px;
}
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(84px, 1fr));
  gap: var(--space-2);
  margin-top: auto;
}
.stat-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 10px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: var(--radius-md);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transition: all var(--duration) var(--ease-spring);
}
.stat-chip:hover {
  transform: translateY(-4px) scale(1.04);
  background: rgba(255, 255, 255, 0.18);
}
.stat-chip strong {
  font-size: 1.15rem;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  line-height: 1.3;
}
.stat-chip span {
  font-size: 0.7rem;
  opacity: 0.78;
  margin-top: 2px;
}
.hero-actions {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-top: var(--space-2);
}
.hero-btn-primary {
  padding: 0.6em 1.6em;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}
.hero-btn-ghost {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.32);
  color: #fff;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
.hero-btn-ghost:hover {
  background: rgba(255, 255, 255, 0.24);
  color: #fff;
  box-shadow: none;
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
