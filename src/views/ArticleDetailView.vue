<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
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

  // 高亮当前目录项
  let current = ''
  for (const item of toc.value) {
    const el = document.getElementById(item.id)
    if (el && el.getBoundingClientRect().top <= 100) current = item.id
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
    <!--
      阅读进度条：Teleport 到 body。
      页面切换动画会给视图根节点加 transform，会让 position:fixed 的子元素
      以该节点为包含块，进度条会错位；放到 body 下才能始终吸附视口顶部。
    -->
    <Teleport to="body">
      <div
        class="read-progress"
        role="progressbar"
        aria-label="阅读进度"
        :aria-valuenow="progress"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div class="bar" :style="{ width: progress + '%' }"></div>
      </div>
    </Teleport>

    <div class="container page">
      <ErrorState v-if="content.error" :message="content.error" @retry="content.init()" />

      <EmptyState
        v-else-if="!content.loading && !article"
        icon="🫥"
        title="文章不存在"
        description="它可能已被删除，或链接不正确。"
        action-text="返回文章列表"
        action-to="/articles"
      />

      <template v-else-if="article">
        <article class="article">
          <header class="article-head">
            <div class="chips">
              <span class="chip chip--primary">{{ article.category }}</span>
              <span v-for="t in article.tags" :key="t" class="chip">#{{ t }}</span>
            </div>
            <h1>{{ article.title }}</h1>
            <p class="meta">
              <span>✍️ {{ article.author }}</span>
              <time :datetime="article.createdAt">{{ formatDate(article.createdAt) }}</time>
              <span>约 {{ article.readingMinutes }} 分钟阅读</span>
              <span>已读 {{ progress }}%</span>
            </p>
          </header>

          <div v-if="toc.length" class="toc-toggle-wrap">
            <button
              class="btn btn--ghost btn--sm"
              :aria-expanded="tocOpen"
              @click="tocOpen = !tocOpen"
            >
              ☰ 目录（{{ toc.length }}）
            </button>
          </div>

          <div class="article-layout">
            <div class="prose-wrap card">
              <div v-if="renderError" class="state-block">
                <span class="state-icon">⚠️</span>
                <p class="state-title">{{ renderError }}</p>
              </div>
              <!-- Markdown 渲染结果已经过 DOMPurify 消毒 -->
              <!-- eslint-disable-next-line vue/no-v-html -->
              <div v-else class="prose" v-html="html"></div>

              <footer class="article-foot">
                <MediaActions
                  :id="article.id"
                  kind="article"
                  :base-likes="0"
                  :share-title="article.title"
                />
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
  top: var(--header-h);
  left: 0;
  right: 0;
  height: 3px;
  background: transparent;
  z-index: calc(var(--z-header) + 1);
}
.bar {
  height: 100%;
  background: var(--primary-gradient);
  transition: width 120ms linear;
}

.page {
  padding-top: var(--space-6);
  max-width: 1100px;
}
.article-head {
  max-width: 720px;
  margin: 0 auto var(--space-5);
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}
.article-head h1 {
  font-size: clamp(1.5rem, 4vw, 2.2rem);
  line-height: 1.35;
  margin-bottom: var(--space-3);
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  color: var(--text-3);
  font-size: 0.85rem;
}

.toc-toggle-wrap {
  max-width: 720px;
  margin: 0 auto var(--space-4);
}

.article-layout {
  display: grid;
  gap: var(--space-5);
}
@media (min-width: 1024px) {
  .article-layout {
    grid-template-columns: minmax(0, 1fr) 240px;
    align-items: start;
  }
  .toc {
    position: sticky;
    top: calc(var(--header-h) + 24px);
    display: block !important;
  }
}

.prose-wrap {
  padding: clamp(20px, 4vw, 40px);
  max-width: 760px;
  margin: 0 auto;
  width: 100%;
}
.article-foot {
  margin-top: var(--space-8);
  padding-top: var(--space-5);
  border-top: 1px solid var(--border);
}

.toc {
  display: none;
  padding: var(--space-4);
  max-height: 70vh;
  overflow-y: auto;
}
.toc.open {
  display: block;
}
.toc-title {
  font-weight: 700;
  color: var(--text-2);
  margin-bottom: var(--space-3);
  font-size: 0.9rem;
}
.toc-link {
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  background: none;
  color: var(--text-2);
  font-size: 0.86rem;
  padding: 6px 8px;
  border-left: 2px solid var(--border);
  border-radius: 0 var(--radius-xs) var(--radius-xs) 0;
  transition: all var(--duration-fast) var(--ease);
}
.toc-link:hover {
  color: var(--primary);
  border-left-color: var(--primary-soft-2);
}
.toc-link.active {
  color: var(--primary);
  border-left-color: var(--primary);
  background: var(--primary-soft);
  font-weight: 600;
}
.toc-link.level3 {
  padding-left: 20px;
  font-size: 0.82rem;
}

.pager {
  display: grid;
  gap: var(--space-3);
  margin-top: var(--space-8);
  max-width: 760px;
  margin-left: auto;
  margin-right: auto;
}
@media (min-width: 640px) {
  .pager {
    grid-template-columns: 1fr 1fr;
  }
}
.pager-link {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--text);
}
.pager-link:hover {
  color: var(--text);
  border-color: var(--primary-soft-2);
}
.pager-link.next {
  text-align: right;
}
.pager-label {
  font-size: 0.8rem;
  color: var(--text-3);
}
</style>
