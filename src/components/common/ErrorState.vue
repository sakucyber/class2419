<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'

withDefaults(defineProps<{ title?: string; message?: string }>(), {
  title: '加载失败了',
  message: '请检查网络后重试；若持续失败，可能是浏览器存储被禁用。',
})
const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="state-block" role="alert">
    <span class="state-icon" aria-hidden="true"
      ><AppIcon name="warning" :size="42" :stroke-width="1.4"
    /></span>
    <p class="state-title">{{ title }}</p>
    <p class="state-desc">{{ message }}</p>
    <button class="btn btn--soft btn--sm" @click="emit('retry')">重新加载</button>
  </div>
</template>

<style scoped>
.state-icon {
  color: var(--warning);
}
.state-desc {
  font-size: 0.9rem;
  max-width: 360px;
}
</style>
