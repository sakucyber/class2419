<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import AppIcon from '@/components/common/AppIcon.vue'
import Breadcrumb from '@/components/common/Breadcrumb.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import MediaActions from '@/components/media/MediaActions.vue'
import { useContentStore } from '@/store/content'
import { useInteractionStore } from '@/store/interaction'
import { formatDate, throttle } from '@/utils/format'
import { attachHeadingIds, renderMarkdown, type TocItem } from '@/utils/markdown'

const route = useRoute()
const content = useContentStore()
const interaction = useInteractionStore()

const article = computed(() => content.getArticle(String(route.params.id)))
const html = ref('')
const toc = ref<TocItem[]>([])
const renderError = ref('')
const progress = ref(0)
const coverFailed = ref(false)
const showCover = computed(() => !!article.value?.cover && !coverFailed.value)
const activeHeading = ref('')
const tocOpen = ref(false)

async function render() {
  renderError.value = ''
  if (!article.value) return
  try {
    const raw = await renderMarkdown(article.value.content)
    const { html: withIds, toc: items } = attachHeadingIds(raw)
    html.value = withIds
    toc.value = items
  } catch {
    renderError.value = '文章渲染失败，请稍后重试'
    html.value = ''
  }
  await nextTick()
  restoreScroll()
}

function restoreScroll() {
  if (!article.value) return
  const y = interaction.getArticleScroll(article.value.id)
  if (y > 0) window.scrollTo({ top: y })
}

const onScroll = throttle(() => {
  const doc = document.documentElement
  const scrollTop = window.scrollY || doc.scrollTop
  const max = doc.scrollHeight - window.innerHeight
  progress.value = max > 0 ? Math.min(100, Math.round((scrollTop / max) * 100)) : 0

  if (article.value) interaction.setArticleScroll(article.value.id, scrollTop)

  let current = ''
  for (const item of toc.value) {
    const el = document.getElementById(item.id)
    if (el && el.getBoundingClientRect().top <= 110) current = item.id
  }
  activeHeading.value = current
}, 150)

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  render()
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
})

watch(
  () => route.params.id,
  () => {
    progress.value = 0
    html.value = ''
    toc.value = []
    coverFailed.value = false
    tocOpen.value = false
    render()
  },
)

function goTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  tocOpen.value = false
}

const neighbors = computed(() => {
  const list = content.publicArticles
  const idx = list.findIndex((a) => a.id === article.value?.id)
  return {
    prev: idx > 0 ? list[idx - 1] : null,
    next: idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null,
  }
})
</script>

<template>
  <div>
    <!-- 阅读进度：贴在视口最上方，随滚动增长 -->
    <div v-if="article && progress > 0" class="read-progress" aria-hidden="true">
      <ProgressBar :value="progress" label="阅读进度" />
    </div>

    <div class="container page">
      <ErrorState v-if="content.error" :message="content.error" @retry="content.init()" />

      <EmptyState
        v-else-if="!content.loading && !article"
        icon="article"
        title="文章不存在"
        description="它可能已被删除，或链接不正确。"
        action-text="返回文章列表"
        action-to="/articles"
      />

      <template v-else-if="article">
        <article class="article">
          <div class="article-layout">
            <div class="article-crumbs">
              <Breadcrumb
                :items="[
                  { label: '首页', to: '/' },
                  { label: '文章', to: '/articles' },
                  { label: article.title },
                ]"
              />
            </div>
            <header class="article-head" :class="{ 'has-cover': showCover }">
              <div v-if="showCover" class="head-cover" aria-hidden="true">
                <img :src="article.cover" alt="" decoding="async" @error="coverFailed = true" />
              </div>
              <div class="head-body">
                <div class="chips">
                  <span class="chip chip--primary">{{ article.category }}</span>
                  <span v-for="t in article.tags" :key="t" class="chip">#{{ t }}</span>
                </div>
                <h1>{{ article.title }}</h1>
                <p class="detail-meta">
                  <span>
                    <AppIcon name="pencil" :size="14" :stroke-width="1.9" />
                    {{ article.author }}
                  </span>
                  <time class="num" :datetime="article.createdAt">
                    {{ formatDate(article.createdAt) }}
                  </time>
                  <span>约 {{ article.readingMinutes }} 分钟阅读</span>
                  <span class="read-now num">已读 {{ progress }}%</span>
                </p>
              </div>
            </header>

            <div v-if="toc.length" class="toc-toggle-wrap">
              <button
                class="btn btn--ghost btn--sm"
                type="button"
                :aria-expanded="tocOpen"
                @click="tocOpen = !tocOpen"
              >
                <AppIcon name="list" :size="15" :stroke-width="1.9" />
                目录（{{ toc.length }}）
              </button>
            </div>

            <div class="prose-wrap card">
              <div v-if="renderError" class="state-block">
                <span class="state-icon" aria-hidden="true">
                  <AppIcon name="warning" :size="38" :stroke-width="1.35" />
                </span>
                <p class="state-title">{{ renderError }}</p>
              </div>
              <!-- Markdown 渲染结果已经过 DOMPurify 消毒 -->
              <!-- eslint-disable-next-line vue/no-v-html -->
              <div v-else class="prose" v-html="html"></div>

              <footer class="article-foot">
                <MediaActions :id="article.id" kind="article" :share-title="article.title" />
              </footer>
            </div>

            <aside
              v-if="toc.length"
              class="toc card"
              :class="{ open: tocOpen }"
              aria-label="文章目录"
            >
              <p class="toc-title">目录</p>
              <ul>
                <li v-for="item in toc" :key="item.id">
                  <button
                    class="toc-link"
                    type="button"
                    :class="{ active: activeHeading === item.id, level3: item.level === 3 }"
                    @click="goTo(item.id)"
                  >
                    {{ item.text }}
                  </button>
                </li>
              </ul>
            </aside>
          </div>
        </article>

        <nav class="pager" aria-label="上一篇 / 下一篇">
          <RouterLink
            v-if="neighbors.prev"
            :to="`/articles/${neighbors.prev.id}`"
            class="pager-link card"
          >
            <span class="pager-label">← 上一篇</span>
            <strong>{{ neighbors.prev.title }}</strong>
          </RouterLink>
          <span v-else class="pager-placeholder"></span>
          <RouterLink
            v-if="neighbors.next"
            :to="`/articles/${neighbors.next.id}`"
            class="pager-link card next"
          >
            <span class="pager-label">下一篇 →</span>
            <strong>{{ neighbors.next.title }}</strong>
          </RouterLink>
        </nav>
      </template>
    </div>
  </div>
</template>

<style scoped>
.read-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: calc(var(--z-header) + 2);
  pointer-events: none;
}
.read-progress :deep(.progress) {
  border: none;
  border-radius: 0;
}
.page {
  max-width: 1100px;
}
/* 面包屑与正文同宽并对齐卡片左边缘（正文在 1024px 以上是两栏，占第 1 列） */
.article-crumbs {
  grid-column: 1;
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
}

.article-head {
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  padding-inline: clamp(20px, 4vw, 40px);
}
.head-body {
  position: relative;
  z-index: 1;
}
.article-head.has-cover {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  padding-inline: 0;
  border: var(--card-bd-w) solid var(--line);
  border-radius: var(--card-radius);
  background: var(--bg-soft);
  box-shadow: var(--card-shadow);
}
.head-cover {
  position: absolute;
  inset: 0;
  z-index: 0;
}
.head-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.article-head.has-cover::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: var(--scrim);
}
.article-head.has-cover .head-body {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-height: clamp(240px, 27vw, 330px);
  padding: clamp(24px, 4vw, 40px) clamp(20px, 4vw, 40px);
}
.article-head.has-cover h1 {
  color: #fff;
  text-shadow: 0 2px 22px rgba(0, 0, 0, 0.42);
}
.article-head.has-cover .detail-meta {
  color: rgba(255, 255, 255, 0.82);
}
.article-head.has-cover .chip {
  background: rgba(255, 255, 255, 0.16);
  border-color: rgba(255, 255, 255, 0.32);
  color: #fff;
}
.article-head.has-cover .chip--primary {
  background: #fff;
  border-color: transparent;
  color: #16283d;
}
.article-head.has-cover :deep(.img) {
  filter: grayscale(0.35) contrast(1.03);
}

.article-head .chips {
  margin-bottom: var(--space-3);
}
.article-head h1 {
  margin-bottom: var(--space-3);
  font-size: clamp(1.55rem, 4vw, 2.3rem);
  line-height: 1.32;
}
.read-now {
  color: var(--accent-ink);
}

.toc-toggle-wrap {
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  padding-inline: clamp(20px, 4vw, 40px);
}

.article-layout {
  display: grid;
  gap: var(--space-5);
}
@media (min-width: 1024px) {
  /* 用命名区域固定「左侧一列内容 + 右侧目录」的关系：
     目录跨满全部行，但第 1 行的面包屑不会被它的高度撑高。 */
  .article-layout {
    grid-template-columns: minmax(0, 1fr) 240px;
    /* 折叠目录按钮在宽屏隐藏，因此不占一行，避免多出一个空行的间距 */
    grid-template-areas:
      'crumbs none'
      'head   toc'
      'prose  toc';
    align-items: start;
  }
  .article-crumbs {
    grid-area: crumbs;
  }
  .article-head {
    grid-area: head;
  }
  .toc-toggle-wrap {
    grid-area: toggle;
    display: none;
  }
  .prose-wrap {
    grid-area: prose;
  }
  .toc {
    grid-area: toc;
    position: sticky;
    top: calc(var(--header-h) + 24px);
    display: block !important;
  }
}

.prose-wrap {
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  padding: clamp(20px, 4vw, 40px);
}
.article-foot {
  margin-top: var(--space-8);
  padding-top: var(--space-5);
  border-top: 1px solid var(--line);
}

.toc {
  display: none;
  max-height: 70vh;
  overflow-y: auto;
  padding: var(--space-4);
}
.toc.open {
  display: block;
}
.toc-title {
  margin-bottom: var(--space-3);
  font-size: var(--fs-sm);
  font-weight: 700;
  color: var(--text-2);
}
.toc-link {
  display: block;
  width: 100%;
  padding: 6px 10px;
  border: none;
  border-left: 2px solid var(--line);
  background: none;
  color: var(--text-2);
  font-size: var(--fs-xs);
  text-align: left;
  transition:
    color var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease),
    background-color var(--dur-fast) var(--ease);
}
.toc-link:hover {
  color: var(--accent-ink);
  border-left-color: var(--accent-soft-2);
}
.toc-link.active {
  color: var(--accent-ink);
  border-left-color: var(--accent-ink);
  background: var(--accent-soft);
  font-weight: 600;
}
.toc-link.level3 {
  padding-left: 22px;
  font-size: 0.78rem;
}

.pager {
  display: grid;
  gap: var(--space-3);
  max-width: 760px;
  margin: var(--space-8) auto 0;
}
@media (min-width: 640px) {
  .pager {
    grid-template-columns: 1fr 1fr;
  }
}
.pager-link {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: var(--space-4);
  color: var(--text);
}
.pager-link:hover {
  color: var(--text);
  border-color: var(--line-hover);
}
.pager-link.next {
  text-align: right;
}
@media (min-width: 640px) {
  .pager-link:only-of-type {
    grid-column: 1 / -1;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
  }
}
.pager-label {
  font-size: var(--fs-2xs);
  color: var(--text-3);
}
.pager-link strong {
  font-family: var(--font-display);
  font-size: var(--fs-md);
  transition: color var(--dur) var(--ease);
}
.pager-link:hover strong {
  color: var(--accent-ink);
}

/* 风格 */
[data-style='annual'] .article-head h1 {
  font-weight: 600;
}
[data-style='annual'] .head-cover img {
  filter: grayscale(0.5) sepia(0.16) contrast(1.03);
}
[data-style='annual'] .article-head.has-cover::after {
  background: linear-gradient(
    180deg,
    rgba(22, 40, 61, 0.16) 0%,
    rgba(22, 40, 61, 0.62) 52%,
    rgba(22, 40, 61, 0.92) 100%
  );
}
[data-style='annual'] .prose-wrap {
  border-top: 3px double var(--line-2);
}
[data-style='japandi'] .article-head.has-cover {
  border-color: transparent;
  box-shadow: var(--shadow-2);
}
[data-style='japandi'] .head-cover img {
  filter: saturate(0.62) sepia(0.06);
}
[data-style='japandi'] .article-head.has-cover::after {
  background: linear-gradient(
    180deg,
    rgba(30, 38, 32, 0.08) 0%,
    rgba(30, 38, 32, 0.55) 50%,
    rgba(30, 38, 32, 0.86) 100%
  );
}
[data-style='japandi'] .article-head.has-cover h1 {
  text-shadow: 0 2px 18px rgba(30, 38, 32, 0.4);
}
[data-style='brutal'] .article-head.has-cover {
  border: 3px solid #111;
  box-shadow: 8px 8px 0 #111;
}
[data-style='brutal'] .head-cover img {
  filter: saturate(1.35) contrast(1.1);
}
[data-style='brutal'] .prose-wrap {
  border: 3px solid #111;
  box-shadow: 6px 6px 0 #111;
}
[data-style='brutal'] .toc-link.active {
  border-left-width: 6px;
}
</style>
