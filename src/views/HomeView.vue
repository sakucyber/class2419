<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import AppIcon from '@/components/common/AppIcon.vue'
import Carousel from '@/components/common/Carousel.vue'
import CountdownTimer from '@/components/common/CountdownTimer.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import LazyImage from '@/components/common/LazyImage.vue'
import PolaroidModal from '@/components/common/PolaroidModal.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import SectionHeader from '@/components/common/SectionHeader.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import HeroBadge from '@/components/effects/HeroBadge.vue'
import AlbumCard from '@/components/media/AlbumCard.vue'
import ArticleCard from '@/components/media/ArticleCard.vue'
import VideoCard from '@/components/media/VideoCard.vue'
import { useContentStore } from '@/store/content'
import type { PolaroidPhoto } from '@/types'
import { withBase } from '@/utils/base'
import { formatDate, formatRelative } from '@/utils/format'

const heroBg = withBase('/images/misc/class-card-bg.svg')
const content = useContentStore()

const latestAlbums = computed(() => content.publicAlbums.slice(0, 3))
const latestVideos = computed(() => content.publicVideos.slice(0, 3))
const latestArticles = computed(() => content.publicArticles.slice(0, 4))
const notices = computed(() => content.publicAnnouncements.slice(0, 3))

/** 三年行程进度：建班 → 中考，给倒计时卡一个「已经走了多远」的参照 */
const journeyPct = computed(() => {
  const start = new Date(content.classInfo.foundedAt).getTime()
  const end = new Date(content.classInfo.examAt).getTime()
  const now = Date.now()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0
  return Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)))
})

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

function openRandomMemory(): void {
  const pool = allPhotos.value
  if (pool.length === 0) return
  const candidates = pool.length > 1 ? pool.filter((p) => p.id !== lastPhotoId) : pool
  const picked = candidates[Math.floor(Math.random() * candidates.length)]
  lastPhotoId = picked.id
  polaroid.value = picked
}

/* hero 背景轻微视差：只有原版风格（满幅背景）需要它。
   用 rAF 合并同一帧内的多次 scroll，避免每像素一次组件重渲染。 */
const parallax = ref(0)
let parallaxRaf = 0
function onScroll() {
  if (parallaxRaf) return
  parallaxRaf = requestAnimationFrame(() => {
    parallaxRaf = 0
    const y = window.scrollY
    parallax.value = y < window.innerHeight ? y : window.innerHeight
  })
}
onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  if (parallaxRaf) cancelAnimationFrame(parallaxRaf)
})
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
      <section class="container hero-wrap">
        <article class="hero card">
          <div class="hero-body">
            <div class="hero-head">
              <HeroBadge />
              <div class="hero-head-text">
                <p class="kicker">Class of 2027</p>
                <p class="eyebrow">{{ content.classInfo.school }} · {{ content.classInfo.grade }}</p>
              </div>
            </div>

            <h1 class="hero-title">
              <span class="pre">我们是</span>
              <span class="name">{{ content.classInfo.shortName }}</span>
            </h1>

            <p class="slogan">{{ content.classInfo.slogan }}</p>
            <p class="intro">{{ content.classInfo.description }}</p>

            <ul class="stats" aria-label="班级数据">
              <li v-for="s in content.classInfo.stats" :key="s.label" class="stat">
                <strong class="num">{{ s.value }}</strong>
                <span>{{ s.label }}</span>
              </li>
            </ul>

            <div class="actions">
              <RouterLink to="/about" class="btn">
                了解我们
                <AppIcon name="arrowRight" :size="15" :stroke-width="2" />
              </RouterLink>
              <RouterLink to="/albums" class="btn btn--ghost">逛逛相册</RouterLink>
              <button type="button" class="btn btn--ghost" @click="openRandomMemory">
                <AppIcon name="camera" :size="15" :stroke-width="1.9" />
                随机回忆
              </button>
            </div>
          </div>

          <div
            class="hero-media"
            :style="{
              transform: `translateY(${Math.min(parallax * 0.06, 18)}px) scale(1.02)`,
            }"
          >
            <LazyImage :src="heroBg" alt="" aspect="16 / 10" radius="0" eager />
            <span class="hero-caption" aria-hidden="true">Plate I · 2024—2027</span>
          </div>
        </article>

        <aside class="count card" aria-label="中考倒计时">
          <div class="count-top">
            <span class="count-label">
              <AppIcon name="hourglass" :size="14" :stroke-width="1.9" />
              距离中考
            </span>
            <span class="count-date num">{{ formatDate(content.classInfo.examAt) }}</span>
          </div>

          <CountdownTimer
            :target="content.classInfo.examAt"
            label="中考"
            caption="COUNTDOWN TO THE EXAM"
          />

          <div class="journey">
            <div class="journey-head">
              <span>初中三年</span>
              <span class="num">{{ journeyPct }}%</span>
            </div>
            <ProgressBar :value="journeyPct" label="初中三年进度" />
          </div>

          <p class="count-note">笔锋所至，皆是心之所向。稳住，2419。</p>
        </aside>
      </section>

      <!-- 轮播 -->
      <section v-reveal class="container section" aria-label="班级风采">
        <Carousel :slides="content.slides" />
      </section>

      <!-- 公告 -->
      <section v-if="notices.length" id="notices" v-reveal class="container section">
        <SectionHeader
          tag="Notice"
          title="班级公告"
          subtitle="访问地址说明与站点更新，都在这里"
          :linkable="false"
        />
        <ul class="notice-list">
          <li
            v-for="n in notices"
            :key="n.id"
            class="notice card"
            :class="`notice--${n.level || 'info'}`"
          >
            <div class="notice-head">
              <span class="notice-badge">{{ n.pinned ? '置顶' : '公告' }}</span>
              <strong>{{ n.title }}</strong>
              <time class="num" :datetime="n.createdAt">{{ formatRelative(n.createdAt) }}</time>
            </div>
            <p>{{ n.content }}</p>
          </li>
        </ul>
      </section>

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
.section {
  margin-top: var(--section-gap);
}

.hero-wrap {
  display: grid;
  gap: var(--space-4);
  padding-top: var(--space-6);
}
@media (min-width: 960px) {
  .hero-wrap {
    grid-template-columns: minmax(0, 1.62fr) minmax(300px, 0.92fr);
    align-items: stretch;
  }
}

/* ---------- 班级名片 ---------- */
.hero {
  display: grid;
  grid-template-columns: 1fr;
  overflow: hidden;
  padding: 0;
  min-height: 0;
}
@media (min-width: 900px) {
  .hero {
    grid-template-columns: minmax(0, 1.32fr) minmax(240px, 0.88fr);
  }
}
.hero-body {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: clamp(22px, 3.2vw, 40px);
}
.hero-head {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: 2px;
}
.hero-head-text {
  min-width: 0;
}
.hero-head-text .kicker {
  margin-bottom: 4px;
}
.eyebrow {
  font-size: var(--fs-xs);
  color: var(--text-3);
  letter-spacing: 1px;
}
.hero-title {
  font-size: clamp(2rem, 4.6vw, 3.15rem);
  line-height: 1.08;
  letter-spacing: var(--display-tracking);
}
.hero-title .pre {
  display: block;
  margin-bottom: 6px;
  font-family: var(--font-sans);
  font-size: 0.3em;
  font-weight: 600;
  letter-spacing: 3px;
  color: var(--text-3);
}
.hero-title .name {
  display: block;
  color: var(--text);
}
.slogan {
  font-family: var(--font-quote);
  font-style: italic;
  font-size: var(--fs-md);
  color: var(--accent-ink);
  letter-spacing: 1px;
}
.intro {
  max-width: 54ch;
  color: var(--text-2);
  font-size: var(--fs-sm);
  line-height: 1.85;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  margin-top: auto;
  padding-top: var(--space-4);
  border-top: 1px solid var(--line);
}
.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-right: var(--space-5);
  margin-right: var(--space-5);
  border-right: 1px solid var(--line);
}
.stat:last-child {
  border-right: none;
  margin-right: 0;
  padding-right: 0;
}
.stat strong {
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: var(--display-weight);
  line-height: 1.2;
}
.stat span {
  font-size: var(--fs-2xs);
  color: var(--text-3);
  letter-spacing: 0.5px;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.hero-media {
  position: relative;
  order: -1;
  overflow: hidden;
  border-bottom: 1px solid var(--line);
  will-change: transform;
}
.hero-media :deep(.img) {
  filter: grayscale(0.5) sepia(0.16) contrast(1.02);
}
@media (min-width: 900px) {
  .hero-media {
    order: 0;
    border-bottom: none;
    border-left: 1px solid var(--line);
  }
  /* 桌面端图片撑满正文高度；移动端交给 16/10 的固有比例，否则会被拉成方块 */
  .hero-media :deep(.lazy-image) {
    height: 100%;
  }
}
.hero-caption {
  position: absolute;
  right: 12px;
  bottom: 10px;
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.86);
  color: #16283d;
  font-size: 0.58rem;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

/* ---------- 倒计时 ---------- */
.count {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  justify-content: space-between;
  padding: clamp(20px, 2.6vw, 28px);
}
.count-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.count-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--text-2);
  letter-spacing: 0.5px;
}
.count-date {
  font-size: var(--fs-2xs);
  color: var(--accent-ink);
  letter-spacing: 1px;
}
.journey {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.journey-head {
  display: flex;
  justify-content: space-between;
  font-size: var(--fs-2xs);
  color: var(--text-3);
  letter-spacing: 1px;
}
.count-note {
  font-family: var(--font-quote);
  font-style: italic;
  font-size: var(--fs-sm);
  color: var(--text-3);
  line-height: 1.7;
}

/* ---------- 公告 ---------- */
.notice-list {
  display: grid;
  gap: var(--space-3);
}
.notice {
  padding: var(--space-4) var(--space-5);
  border-left: 3px solid var(--notice-accent, var(--line-2));
}
.notice--info {
  --notice-accent: var(--info);
}
.notice--success {
  --notice-accent: var(--success);
}
.notice--warning {
  --notice-accent: var(--warning);
}
.notice-head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: 6px;
  flex-wrap: wrap;
}
.notice-badge {
  flex: none;
  padding: 1px 6px;
  border: 1px solid var(--notice-accent, var(--line-2));
  color: var(--notice-accent, var(--text-3));
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 1px;
}
.notice-head strong {
  font-family: var(--font-display);
  font-size: var(--fs-md);
  font-weight: var(--display-weight);
}
.notice-head time {
  margin-left: auto;
  flex: none;
  color: var(--text-3);
  font-size: var(--fs-2xs);
}
.notice p {
  color: var(--text-2);
  font-size: var(--fs-sm);
  line-height: 1.75;
}

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

/* ---------- 风格差异 ---------- */
[data-style='annual'] .hero-title .name {
  font-family: var(--font-serif);
  font-weight: 600;
}
[data-style='annual'] .hero-media :deep(.img) {
  filter: grayscale(0.72) sepia(0.2) contrast(1.04);
}
[data-style='annual'] .notice {
  background: #fff;
  border-left-width: 2px;
}

[data-style='japandi'] .hero {
  border-color: transparent;
  box-shadow: var(--shadow-2);
}
[data-style='japandi'] .hero-media {
  border-bottom: none;
  border-left: none;
  padding: 10px 10px 0;
}
[data-style='japandi'] .hero-media :deep(.lazy-image) {
  border-radius: 14px;
}
[data-style='japandi'] .hero-media :deep(.img) {
  filter: saturate(0.68) sepia(0.08);
}
[data-style='japandi'] .hero-caption {
  right: 20px;
  bottom: 20px;
  background: rgba(255, 254, 251, 0.9);
  color: var(--text-2);
  border-radius: 999px;
}
[data-style='japandi'] .count {
  border: none;
  background: transparent;
  box-shadow: none;
  padding-left: 6px;
}
[data-style='japandi'] .notice {
  border-left: none;
  background: var(--surface);
}
[data-style='japandi'] .notice-head::before {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--notice-accent, var(--accent));
  flex: none;
}
[data-style='japandi'] .notice-badge {
  border: none;
  background: var(--accent-soft);
  border-radius: 999px;
  padding: 1px 8px;
}

[data-style='brutal'] .hero {
  border: 3px solid #111;
  box-shadow: 8px 8px 0 #111;
}
[data-style='brutal'] .hero-media {
  border-bottom: 3px solid #111;
  border-left: none;
}
[data-style='brutal'] .hero-media :deep(.img) {
  filter: saturate(1.4) contrast(1.12);
}
[data-style='brutal'] .hero-title .name {
  font-weight: 900;
  letter-spacing: -0.5px;
}
[data-style='brutal'] .hero-title .pre {
  font-weight: 900;
  color: var(--text);
}
[data-style='brutal'] .slogan {
  align-self: flex-start;
  padding: 2px 8px;
  background: var(--accent);
  color: #111;
  font-family: var(--font-sans);
  font-style: normal;
  font-weight: 900;
  letter-spacing: 0;
}
[data-style='brutal'] .stats {
  border-top: 3px solid #111;
}
[data-style='brutal'] .stat {
  border-right: 3px solid #111;
}
[data-style='brutal'] .count {
  background: var(--accent);
  border: 3px solid #111;
  box-shadow: 6px 6px 0 #111;
  color: #111;
}
[data-style='brutal'] .count-label,
[data-style='brutal'] .count-note,
[data-style='brutal'] .journey-head,
[data-style='brutal'] .count-date {
  /* 倒计时卡在两种主题下都是亮黄底，文字必须固定墨色 */
  color: #111;
}
[data-style='brutal'] .notice {
  border: 3px solid #111;
  border-left-width: 10px;
  box-shadow: 4px 4px 0 #111;
}
[data-style='brutal'] .notice-badge {
  border-width: 2px;
  background: var(--accent);
  color: #111;
  font-weight: 900;
}

/* 原版：满幅图片 + 深色遮罩，保留改动前的观感 */
[data-style='legacy'] .hero {
  display: block;
  min-height: clamp(360px, 40vw, 460px);
}
[data-style='legacy'] .hero-media {
  position: absolute;
  inset: 0;
  order: 0;
  border: none;
  transform: none !important;
}
[data-style='legacy'] .hero-media :deep(.lazy-image) {
  height: 100%;
}
[data-style='legacy'] .hero-media::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--scrim);
}
[data-style='legacy'] .hero-media :deep(.img) {
  filter: saturate(1.1) contrast(1.05);
}
[data-style='legacy'] .hero-body {
  min-height: clamp(360px, 40vw, 460px);
  max-width: 660px;
  justify-content: center;
  color: #fff;
  gap: 10px;
}
[data-style='legacy'] .hero-body :deep(.hero-badge) {
  position: absolute;
  right: clamp(18px, 4vw, 56px);
  top: 50%;
  transform: translateY(-50%);
}
@media (max-width: 899px) {
  [data-style='legacy'] .hero-body :deep(.hero-badge) {
    display: none;
  }
}
[data-style='legacy'] .hero-title .name,
[data-style='legacy'] .hero-title .pre {
  color: #fff;
}
[data-style='legacy'] .hero-head-text .kicker {
  color: #f0c56a;
}
[data-style='legacy'] .eyebrow {
  color: rgba(255, 255, 255, 0.72);
}
[data-style='legacy'] .slogan {
  color: rgba(255, 255, 255, 0.8);
  font-style: normal;
  font-family: var(--font-sans);
  font-weight: 600;
  letter-spacing: 1px;
}
[data-style='legacy'] .intro {
  color: rgba(255, 255, 255, 0.78);
}
@media (min-width: 900px) {
  /* 徽章压在右侧，正文必须让出它的宽度；否则省略号会贴着徽章，像被盖住 */
  [data-style='legacy'] .intro {
    max-width: min(54ch, calc(100% - var(--badge-size) - 28px));
  }
}
[data-style='legacy'] .stats {
  border-top-color: rgba(255, 255, 255, 0.18);
}
[data-style='legacy'] .stat {
  border-right-color: rgba(255, 255, 255, 0.18);
}
[data-style='legacy'] .stat strong {
  color: #fff;
}
[data-style='legacy'] .stat span {
  color: rgba(255, 255, 255, 0.66);
}
[data-style='legacy'] .hero-caption {
  display: none;
}
[data-style='legacy'] .count {
  background: var(--surface);
}
</style>
