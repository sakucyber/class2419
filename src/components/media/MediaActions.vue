<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { useInteractionStore, type Kind } from '@/store/interaction'
import { toast } from '@/utils/toast'

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
    toast('链接已复制，快去分享吧！')
  } catch {
    // 非安全上下文（如局域网 http）拿不到剪贴板权限，只能把地址摆出来让用户手动复制
    alert(url)
  }
}
</script>

<template>
  <div class="media-actions">
    <button
      class="action-btn"
      type="button"
      :class="{ on: faved() }"
      :aria-pressed="faved()"
      :aria-label="faved() ? '取消收藏' : '收藏'"
      @click="interaction.toggleFavorite(kind, id)"
    >
      <AppIcon name="star" :size="16" :filled="faved()" />
      <span>{{ faved() ? '已收藏' : '收藏' }}</span>
    </button>
    <button class="action-btn" type="button" aria-label="分享" @click="share">
      <AppIcon name="link" :size="16" />
      <span>分享</span>
    </button>
    <slot />
  </div>
</template>

<style scoped>
/* .action-btn 的样式在 base.css：插槽内容属于父组件作用域，
   写在组件的 scoped 里对「全部下载」这类按钮无效。 */
.media-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
</style>
