<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'card' | 'text' | 'grid' | 'hero'
    count?: number
  }>(),
  { variant: 'card', count: 3 },
)
</script>

<template>
  <div v-if="variant === 'grid'" class="skel-grid" aria-hidden="true">
    <div v-for="i in count" :key="i" class="skel-card card">
      <div class="skeleton skel-cover"></div>
      <div class="skel-body">
        <div class="skeleton skel-line w80"></div>
        <div class="skeleton skel-line w60"></div>
      </div>
    </div>
  </div>
  <div v-else-if="variant === 'hero'" class="skeleton skel-hero" aria-hidden="true"></div>
  <div v-else-if="variant === 'text'" class="skel-text" aria-hidden="true">
    <div
      v-for="i in count"
      :key="i"
      class="skeleton skel-line"
      :class="i === count ? 'w60' : 'w100'"
    ></div>
  </div>
  <div v-else class="skel-cards" aria-hidden="true">
    <div v-for="i in count" :key="i" class="skel-card card">
      <div class="skeleton skel-cover"></div>
      <div class="skel-body">
        <div class="skeleton skel-line w80"></div>
        <div class="skeleton skel-line w60"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.skel-grid,
.skel-cards {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}
.skel-card {
  overflow: hidden;
  padding: 0;
}
.skel-cover {
  aspect-ratio: 4 / 3;
  border-radius: 0;
}
.skel-body {
  padding: var(--space-3) var(--space-4) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.skel-line {
  height: 14px;
  border-radius: var(--radius-full);
}
.skel-hero {
  height: clamp(180px, 32vw, 360px);
  border-radius: var(--radius-lg);
}
.skel-text {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.w100 {
  width: 100%;
}
.w80 {
  width: 80%;
}
.w60 {
  width: 60%;
}
</style>
