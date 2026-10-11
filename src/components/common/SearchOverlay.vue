<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import AppIcon from '@/components/common/AppIcon.vue'
import { useContentStore } from '@/store/content'
import { debounce } from '@/utils/format'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const router = useRouter()
const content = useContentStore()

const keyword = ref('')
const inputEl = ref<HTMLInputElement | null>(null)
const results = computed(() => content.search(keyword.value))

const close = () => emit('update:open', false)

const runSearch = debounce(() => {
  /* keyword 是响应式的，结果由 computed 实时计算；防抖用于未来接后端时的请求 */
}, 250)

watch(keyword, () => runSearch())

watch(
  () => props.open,
  async (open) => {
    if (open) {
      await nextTick()
      inputEl.value?.focus()
    } else {
      keyword.value = ''
    }
  },
)

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

function go(hit: { to: string }) {
  close()
  router.push(hit.to)
}

function submit() {
  if (!keyword.value.trim()) return
  close()
  router.push({ path: '/search', query: { q: keyword.value.trim() } })
}

const typeLabel: Record<string, string> = {
  album: '相册',
  video: '视频',
  article: '文章',
  tag: '标签',
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="search-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="全站搜索"
      @keydown="onKeydown"
    >
      <div class="search-mask" @click="close"></div>
      <div class="search-panel">
        <form class="search-bar" role="search" @submit.prevent="submit">
          <AppIcon class="search-icon" name="search" :size="18" :stroke-width="2" />
          <input
            ref="inputEl"
            v-model="keyword"
            type="search"
            class="search-input"
            placeholder="搜索相册、视频、文章或标签…"
            aria-label="搜索关键词"
          />
          <button type="button" class="btn btn--ghost btn--sm" @click="close">取消</button>
        </form>

        <div class="search-body">
          <p v-if="!keyword.trim()" class="search-tip">
            试试搜索「运动会」「研学」「合唱」，或点按标签浏览。
          </p>
          <template v-else>
            <p class="search-count">找到 {{ results.length }} 条结果</p>
            <ul v-if="results.length" class="search-list">
              <li v-for="hit in results" :key="hit.type + hit.id">
                <button class="search-item" @click="go(hit)">
                  <img v-if="hit.cover" :src="hit.cover" alt="" class="cover" loading="lazy" />
                  <span v-else class="cover cover--tag" aria-hidden="true">#</span>
                  <span class="meta">
                    <strong>{{ hit.title }}</strong>
                    <small>{{ hit.subtitle }}</small>
                  </span>
                  <span class="type-chip">{{ typeLabel[hit.type] }}</span>
                </button>
              </li>
            </ul>
            <div v-else class="state-block">
              <AppIcon class="state-icon" name="compass" :size="42" :stroke-width="1.4" />
              <p class="state-title">没有找到相关内容</p>
              <p>
                换个关键词试试，或前往
                <RouterLink to="/articles" @click="close">文章列表</RouterLink> 看看。
              </p>
            </div>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.search-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-overlay);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: max(6vh, var(--space-8)) var(--space-4) var(--space-4);
}
.search-mask {
  position: absolute;
  inset: 0;
  background: var(--overlay);
}
.search-panel {
  position: relative;
  width: min(640px, 100%);
  max-height: 80vh;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: pop var(--duration) var(--ease);
}
@keyframes pop {
  from {
    opacity: 0;
    transform: translateY(-12px) scale(0.98);
  }
}
.search-icon {
  color: var(--text-3);
  flex: none;
}
.search-bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border);
}
.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text);
  font-size: 1.05rem;
  min-width: 0;
}
.search-body {
  overflow-y: auto;
  padding: var(--space-3) var(--space-4) var(--space-4);
}
.search-tip,
.search-count {
  color: var(--text-3);
  font-size: 0.85rem;
  margin: var(--space-2) 0 var(--space-3);
}
.search-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2);
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  text-align: left;
  color: var(--text);
  transition: background var(--duration-fast) var(--ease);
}
.search-item:hover {
  background: var(--primary-soft);
}
.cover {
  width: 56px;
  height: 42px;
  object-fit: cover;
  border-radius: var(--radius-xs);
  flex: none;
  background: var(--bg-soft);
}
.cover--tag {
  display: grid;
  place-items: center;
  color: var(--primary);
  font-weight: 700;
}
.meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.meta strong {
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.meta small {
  color: var(--text-3);
  font-size: 0.78rem;
}
.type-chip {
  flex: none;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--primary);
  background: var(--primary-soft);
  padding: 0.15em 0.6em;
  border-radius: var(--radius-full);
}
</style>
