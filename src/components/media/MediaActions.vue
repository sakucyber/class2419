<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { useInteractionStore, type Kind } from '@/store/interaction'

const props = defineProps<{
  kind: Kind
  id: string
  baseLikes: number
  shareTitle?: string
}>()

const interaction = useInteractionStore()

const liked = () => interaction.isLiked(props.kind, props.id)
const faved = () => interaction.isFavorite(props.kind, props.id)
const likeCount = () => props.baseLikes + (liked() ? 1 : 0)

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
      :class="{ on: liked() }"
      :aria-pressed="liked()"
      :aria-label="liked() ? '取消点赞' : '点赞'"
      @click="interaction.toggleLike(kind, id)"
    >
      <AppIcon name="heart" :size="17" :filled="liked()" />
      <span>点赞 {{ likeCount() }}</span>
    </button>
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
.action-btn.on {
  color: #e11d48;
  border-color: #fecdd3;
  background: #fff1f2;
}
[data-theme='dark'] .action-btn.on {
  background: rgba(225, 29, 72, 0.12);
  border-color: rgba(225, 29, 72, 0.35);
}
</style>
