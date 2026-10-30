<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import AppIcon from '@/components/common/AppIcon.vue'
import { useContentStore } from '@/store/content'
import { useFocusTrap } from '@/utils/overlay'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const router = useRouter()
const content = useContentStore()

const keyword = ref('')
const overlayEl = ref<HTMLElement | null>(null)
const results = computed(() => content.search(keyword.value))

const close = () => emit('update:open', false)

watch(
  () => props.open,
  (open) => {
    if (!open) keyword.value = ''
  },
)

useFocusTrap(overlayEl, () => props.open, { onEscape: close })

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
      ref="overlayEl"
      class="search-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="全站搜索"
    >
      <div class="mask" @click="close"></div>
      <div class="panel">
        <form class="bar" role="search" @submit.prevent="submit">
          <AppIcon class="icon" name="search" :size="18" :stroke-width="1.9" />
          <input
            v-model="keyword"
            type="search"
            class="input"
            placeholder="搜索相册、视频、文章或标签…"
            aria-label="搜索关键词"
          />
          <button type="button" class="btn btn--ghost btn--sm" @click="close">取消</button>
        </form>

        <div class="body">
          <p v-if="!keyword.trim()" class="tip">
            试试搜索「运动会」「研学」「合唱」，或点按标签浏览。
          </p>
          <template v-else>
            <p class="count">找到 {{ results.length }} 条结果</p>
            <ul v-if="results.length" class="list">
              <li v-for="hit in results" :key="hit.type + hit.id">
                <button type="button" class="item" @click="go(hit)">
                  <img v-if="hit.cover" :src="hit.cover" alt="" class="cover" loading="lazy" />
                  <span v-else class="cover cover--tag" aria-hidden="true">#</span>
                  <span class="meta">
                    <strong>{{ hit.title }}</strong>
                    <small>{{ hit.subtitle }}</small>
                  </span>
                  <span class="type">{{ typeLabel[hit.type] }}</span>
                </button>
              </li>
            </ul>
            <div v-else class="state-block">
              <span class="state-icon" aria-hidden="true">
                <AppIcon name="compass" :size="36" :stroke-width="1.35" />
              </span>
              <p class="state-title">没有找到相关内容</p>
              <p class="state-desc">
                换个关键词试试，或前往 <RouterLink to="/articles" @click="close">文章列表</RouterLink>
                看看。
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
.mask {
  position: absolute;
  inset: 0;
  background: var(--overlay);
  backdrop-filter: blur(4px);
}
.panel {
  position: relative;
  width: min(640px, 100%);
  max-height: 82vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--surface);
  border: var(--card-bd-w) solid var(--line);
  border-radius: var(--card-radius);
  box-shadow: var(--shadow-3);
  animation: panel-in var(--dur) var(--ease-out);
}
@keyframes panel-in {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
}
.bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--line);
}
.icon {
  color: var(--text-3);
  flex: none;
}
.bar .input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  padding: 0.4em 0;
  font-size: 1.02rem;
}
.bar .input:focus {
  box-shadow: none;
}
.body {
  overflow-y: auto;
  padding: var(--space-3) var(--space-4) var(--space-4);
}
.tip,
.count {
  color: var(--text-3);
  font-size: var(--fs-sm);
  margin: var(--space-2) 0 var(--space-3);
}
.item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2);
  border: 1px solid transparent;
  border-radius: var(--radius-xs);
  background: transparent;
  text-align: left;
  color: var(--text);
  transition:
    background-color var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease);
}
.item:hover {
  background: var(--accent-soft);
  border-color: var(--accent-soft-2);
}
.cover {
  width: 58px;
  height: 42px;
  object-fit: cover;
  flex: none;
  border-radius: var(--radius-xs);
  background: var(--bg-soft);
}
.cover--tag {
  display: grid;
  place-items: center;
  color: var(--accent-ink);
  font-weight: 700;
}
.meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.meta strong {
  font-size: var(--fs-md);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.meta small {
  color: var(--text-3);
  font-size: var(--fs-xs);
}
.type {
  flex: none;
  font-size: var(--fs-2xs);
  font-weight: 700;
  color: var(--accent-ink);
  background: var(--accent-soft);
  padding: 2px 8px;
  border-radius: var(--radius-xs);
}
[data-style='japandi'] .type {
  border-radius: 999px;
}
[data-style='brutal'] .panel {
  border-width: 3px;
  box-shadow: 8px 8px 0 #111;
}
[data-style='brutal'] .type {
  border: 2px solid #111;
  background: var(--accent);
  color: #111;
  font-weight: 900;
}
</style>
