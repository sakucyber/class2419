<script setup lang="ts">
withDefaults(defineProps<{ title?: string; message?: string }>(), {
  title: '加载失败了',
  message: '请检查网络后重试；若持续失败，可能是浏览器存储被禁用。',
})
const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="state-block" role="alert">
    <span class="state-icon" aria-hidden="true">⚠️</span>
    <p class="state-title">{{ title }}</p>
    <p class="state-desc">{{ message }}</p>
    <button class="btn btn--soft btn--sm" @click="emit('retry')">重新加载</button>
  </div>
</template>

<style scoped>
.state-desc {
  font-size: 0.9rem;
  max-width: 360px;
}
</style>
