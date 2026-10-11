<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  to?: string
  moreText?: string
  tag?: string
}>()
</script>

<template>
  <div class="section-header">
    <div class="heading">
      <span v-if="tag" class="sec-tag">{{ tag }}</span>
      <h2 class="title display-title">{{ title }}</h2>
      <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
    </div>
    <RouterLink v-if="to" class="more" :to="to">
      {{ moreText || '查看更多' }}
      <span class="more-arrow" aria-hidden="true">→</span>
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
.heading {
  min-width: 0;
}
.title {
  margin-top: 8px;
  font-size: clamp(1.35rem, 3vw, 1.9rem);
}
.subtitle {
  margin-top: 6px;
  color: var(--text-3);
  font-size: 0.88rem;
}
.more {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0.5em 1.15em;
  border-radius: var(--radius-full);
  border: 1px solid var(--border);
  background: var(--bg-soft);
  color: var(--text-2);
  font-size: 0.85rem;
  font-weight: 700;
  transition: all var(--duration) var(--ease-spring);
}
.more:hover {
  color: var(--primary);
  border-color: var(--primary-soft-2);
  background: var(--primary-soft);
  transform: translateY(-2px);
  box-shadow: 0 6px 18px var(--glow);
}
.more-arrow {
  transition: transform var(--duration) var(--ease-spring);
}
.more:hover .more-arrow {
  transform: translateX(4px);
}

@media (max-width: 560px) {
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-3);
  }
}
</style>
