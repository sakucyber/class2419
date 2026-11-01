<script setup lang="ts">
/**
 * 关键词高亮：把文本按命中片段切成「普通 / 命中」两段渲染。
 *
 * 用分段渲染而不是 v-html —— 搜索结果来自本地数据，
 * 但拿字符串拼 HTML 始终是 XSS 的入口，这里从结构上排除这种可能。
 */
import { computed } from 'vue'

const props = defineProps<{ text: string; keyword: string }>()

interface Segment {
  text: string
  hit: boolean
}

const segments = computed<Segment[]>(() => {
  const keyword = props.keyword.trim()
  if (!keyword) return [{ text: props.text, hit: false }]

  const haystack = props.text.toLowerCase()
  const needle = keyword.toLowerCase()
  const result: Segment[] = []
  let from = 0
  for (;;) {
    const at = haystack.indexOf(needle, from)
    if (at === -1) break
    if (at > from) result.push({ text: props.text.slice(from, at), hit: false })
    result.push({ text: props.text.slice(at, at + keyword.length), hit: true })
    from = at + keyword.length
  }
  if (!result.length) return [{ text: props.text, hit: false }]
  if (from < props.text.length) result.push({ text: props.text.slice(from), hit: false })
  return result
})
</script>

<template>
  <span>
    <template v-for="(segment, index) in segments" :key="index">
      <mark v-if="segment.hit">{{ segment.text }}</mark>
      <template v-else>{{ segment.text }}</template>
    </template>
  </span>
</template>

<style scoped>
mark {
  padding: 0 1px;
  border-radius: 2px;
  background: var(--accent-soft-2);
  color: var(--text);
  font-weight: inherit;
}
</style>
