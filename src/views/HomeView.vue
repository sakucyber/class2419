<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import AppIcon from '@/components/common/AppIcon.vue'
import Carousel from '@/components/common/Carousel.vue'
import CountdownTimer from '@/components/common/CountdownTimer.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import LazyImage from '@/components/common/LazyImage.vue'
import PolaroidModal from '@/components/common/PolaroidModal.vue'
import SectionHeader from '@/components/common/SectionHeader.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import HeroBadge from '@/components/effects/HeroBadge.vue'
import AlbumCard from '@/components/media/AlbumCard.vue'
import ArticleCard from '@/components/media/ArticleCard.vue'
import VideoCard from '@/components/media/VideoCard.vue'
import { useContentStore } from '@/store/content'
import type { PolaroidPhoto } from '@/types'
import { formatDate, formatRelative } from '@/utils/format'

const content = useContentStore()

const latestAlbums = computed(() => content.publicAlbums.slice(0, 3))
const latestVideos = computed(() => content.publicVideos.slice(0, 3))
const latestArticles = computed(() => content.publicArticles.slice(0, 4))
const notices = computed(() => content.publicAnnouncements.slice(0, 4))

/* ─────────────── 随机回忆（拍立得） ───────────────
 * 数据源是**已发布相册**的全部照片（当前 37 张），不新增任何数据结构：
 * 照片本身没有日期，`date` 取所属相册的 createdAt，界面写「收录于」。
 */
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
  // 只有一张时不做排除，否则会抽不出东西
  const candidates = pool.length > 1 ? pool.filter((p) => p.id !== lastPhotoId) : pool
  const picked = candidates[Math.floor(Math.random() * candidates.length)]
  lastPhotoId = picked.id
  polaroid.value = picked
}

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
          <!-- 装饰性 3D/2.5D 徽章：aria-hidden + pointer-events:none，不遮挡右侧文案 -->
          <HeroBadge />
          <div class="card-content">
            <p class="eyebrow">
              <span class="eyebrow-dot" aria-hidden="true"></span>
              {{ content.classInfo.school }} · {{ content.classInfo.grade }}
            </p>
            <h1 class="class-name">
              <span class="cn-pre">我们是</span
              ><span class="grad-text">{{ content.classInfo.shortName }}</span>
            </h1>
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
              <button type="button" class="btn hero-btn-ghost" @click="openRandomMemory">
                <AppIcon name="camera" :size="15" :stroke-width="1.9" />
                随机回忆
              </button>
            </div>
          </div>
        </article>

        <aside v-reveal="{ type: 'left', delay: 1 }" class="countdown-card card" aria-label="中考倒计时">
          <div class="count-head">
            <span class="count-label">
              <AppIcon name="hourglass" :size="15" />
              距离中考
            </span>
            <span class="count-date-chip">{{ formatDate(content.classInfo.examAt, true) }}</span>
          </div>
          <CountdownTimer label="中考" :target="content.classInfo.examAt" />
          <p class="count-note">笔锋所至，皆是心之所向。稳住，2419。</p>
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

    <!-- 随机回忆拍立得（内部 Teleport 到 body） -->
    <PolaroidModal :photo="polaroid" @close="polaroid = null" />
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
  /* 3D 徽章宽度的唯一来源：HeroBadge.vue 与下面 .intro 的避让都读这个变量，
     避免两处各写一份 clamp 导致对不上 */
  --hero-badge-w: clamp(150px, 17vw, 230px);
  padding: 0;
  border-radius: var(--radius-xl);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-2);
  min-height: clamp(320px, 38vw, 420px);
  isolation: isolate;
}
/* 遮罩单独一层，这样右侧能留出更多图片空间，文字区也能收窄 */
.class-card::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background: linear-gradient(
    100deg,
    rgba(6, 8, 18, 0.95) 0%,
    rgba(6, 8, 18, 0.86) 48%,
    rgba(6, 8, 18, 0.34) 100%
  );
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
  padding: clamp(24px, 3.5vw, 40px);
  color: #fff;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 660px;
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
  font-size: clamp(1.75rem, 4.6vw, 2.6rem);
  font-weight: 900;
  line-height: 1.2;
  letter-spacing: 1px;
  margin-top: 4px;
  text-shadow: 0 2px 18px rgba(0, 0, 0, 0.4);
}
/* 「我们是」压到 0.55 倍，让班号成为唯一视觉焦点 */
.cn-pre {
  font-size: 0.55em;
  font-weight: 700;
  letter-spacing: 3px;
  margin-right: 0.25em;
  vertical-align: 0.14em;
  opacity: 0.85;
}
/* 班训已移除，这句标语成为标题下的唯一引导行，字重与透明度相应加强 */
.slogan {
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 2px;
  color: rgba(255, 255, 255, 0.78);
}
.intro {
  margin-top: 6px;
  font-size: 0.86rem;
  line-height: 1.85;
  color: rgba(255, 255, 255, 0.78);
  max-width: 56ch;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
/* 徽章可见时给它留出避让间距：实测在 1280 宽下 .intro 的 56ch 右边缘正好
   压在徽章左边缘上（0px 间隙），省略号会贴着徽章，看着像被盖住。
   只在 ≥900px（徽章显示区间）生效，且保留上面的 56ch 作为 min() 不受支持时的回退。 */
@media (min-width: 900px) {
  .intro {
    max-width: min(56ch, calc(100% - var(--hero-badge-w) - 12px));
  }
}
.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: auto;
  padding-top: var(--space-4);
}
/* 扁胶囊：数值与标签同一行，比原来的两行大方块紧凑很多 */
.stat-chip {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  padding: 7px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: var(--radius-full);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  transition: all var(--duration) var(--ease-spring);
}
.stat-chip:hover {
  transform: translateY(-3px);
  background: rgba(255, 255, 255, 0.18);
}
.stat-chip strong {
  font-size: 1.02rem;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}
.stat-chip span {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.72);
}
.hero-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: var(--space-3);
}
.hero-btn-primary,
.hero-btn-ghost {
  padding: 0.58em 1.5em;
  font-size: 0.9rem;
}
.hero-btn-primary {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}
.hero-btn-ghost {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.28);
  color: #fff;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
.hero-btn-ghost:hover {
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
  box-shadow: none;
}

@media (max-width: 720px) {
  .card-content {
    max-width: 100%;
    gap: 8px;
  }
  .intro {
    -webkit-line-clamp: 2;
  }
}

.countdown-card {
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  /* 卡片高度由 hero 撑开，用 space-between 让"标签—数字—备注"分布到上下，
     否则内容居中会在亮色大卡片上留下两大块空白 */
  justify-content: space-between;
  background: var(--card);
  position: relative;
  overflow: hidden;
}
/* 数字块撑满卡片宽度，避免宽屏下右侧留白 */
.countdown-card :deep(.countdown) {
  width: 100%;
}
.countdown-card :deep(.unit) {
  flex: 1;
}
.countdown-card :deep(.sep) {
  flex: none;
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
  display: inline-flex;
  align-items: center;
  gap: 6px;
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

/* 网格：卡片宽度保持在 300~400px 区间，宽屏靠增加列数而不是拉大卡片 */
.grid-3 {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: 1fr;
}
@media (min-width: 620px) {
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
