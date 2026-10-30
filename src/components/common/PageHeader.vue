<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  kicker?: string
}>()
</script>

<template>
  <header class="page-head">
    <div class="head-text">
      <p v-if="kicker" class="kicker">{{ kicker }}</p>
      <h1 class="page-title">{{ title }}</h1>
      <p v-if="subtitle" class="page-sub">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="head-actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.head-text {
  min-width: 0;
}
.kicker {
  margin-bottom: 8px;
}
.page-title {
  font-size: var(--fs-2xl);
}
.head-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}
</style>
