<script setup lang="ts">
/**
 * 详情页面包屑：首页 › 列表页 › 当前标题。
 *
 * 相册与视频详情页原来各写了一份结构和样式完全相同的 nav，
 * 差异只有「当前项要不要省略号」；统一后长标题一律单行省略，
 * 不会把面包屑撑成两行。
 */
import AppIcon from '@/components/common/AppIcon.vue'

export interface Crumb {
  label: string
  /** 省略则视为当前页 */
  to?: string
}

defineProps<{ items: Crumb[] }>()
</script>

<template>
  <nav class="crumbs" aria-label="面包屑">
    <template v-for="(item, i) in items" :key="item.label + i">
      <AppIcon v-if="i > 0" name="chevronRight" :size="13" />
      <RouterLink v-if="item.to" :to="item.to">{{ item.label }}</RouterLink>
      <span v-else class="current" aria-current="page">{{ item.label }}</span>
    </template>
  </nav>
</template>

<style scoped>
.crumbs {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: var(--space-4);
  font-size: var(--fs-xs);
  color: var(--text-3);
}
.crumbs a {
  color: var(--text-3);
}
.crumbs a:hover {
  color: var(--accent-ink);
}
.current {
  min-width: 0;
  max-width: min(52vw, 46ch);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--text);
  font-weight: 600;
}
</style>
