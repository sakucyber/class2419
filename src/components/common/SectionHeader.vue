<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  to?: string
  moreText?: string
}>()
</script>

<template>
  <div class="section-header">
    <div class="heading">
      <h2 class="title">{{ title }}</h2>
      <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
    </div>
    <RouterLink v-if="to" class="more" :to="to">
      {{ moreText || '查看更多' }}
      <span aria-hidden="true">→</span>
    </RouterLink>
  </div>
</template>

<style scoped>
.section-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}
.title {
  font-size: clamp(1.2rem, 2.5vw, 1.5rem);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.title::before {
  content: '';
  width: 6px;
  height: 1.15em;
  border-radius: var(--radius-full);
  background: var(--primary-gradient);
}
.subtitle {
  margin-top: 4px;
  color: var(--text-3);
  font-size: 0.88rem;
  padding-left: 14px;
}
.more {
  flex: none;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--primary);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>
