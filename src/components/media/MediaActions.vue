<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { useInteractionStore, type Kind } from '@/store/interaction'

const props = defineProps<{
  kind: Kind
  id: string
  shareTitle?: string
}>()

const interaction = useInteractionStore()

const faved = () => interaction.isFavorite(props.kind, props.id)

async function share() {
  const url = window.location.href
  const title = props.shareTitle || document.title
  if (navigator.share) {
    try {
      await navigator.share({ title, url })
      return
    } catch {
      /* 用户取消 */
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    alert('链接已复制，快去分享吧！')
  } catch {
    alert(url)
  }
}
</script>

<template>
  <div class="media-actions">
    <button
      class="action-btn"
      :class="{ on: faved() }"
      :aria-pressed="faved()"
      :aria-label="faved() ? '取消收藏' : '收藏'"
      @click="interaction.toggleFavorite(kind, id)"
    >
      <AppIcon name="star" :size="17" :filled="faved()" />
      <span>{{ faved() ? '已收藏' : '收藏' }}</span>
    </button>
    <button class="action-btn" aria-label="分享" @click="share">
      <AppIcon name="link" :size="17" />
      <span>分享</span>
    </button>
    <slot />
  </div>
</template>

<style scoped>
.media-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0.45em 1em;
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  background: var(--card);
  color: var(--text-2);
  font-size: 0.9rem;
  font-weight: 600;
  transition: all var(--duration-fast) var(--ease);
}
.action-btn:hover {
  border-color: var(--primary-soft-2);
  color: var(--primary);
  background: var(--primary-soft);
}
/* 收藏选中态：琥珀色 */
.action-btn.on {
  color: #d97706;
  border-color: rgba(217, 119, 6, 0.35);
  background: rgba(217, 119, 6, 0.1);
}
[data-theme='dark'] .action-btn.on {
  color: #fbbf24;
  border-color: rgba(251, 191, 36, 0.35);
  background: rgba(251, 191, 36, 0.12);
}
</style>
