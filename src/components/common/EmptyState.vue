<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import type { IconName } from '@/components/common/icons'

withDefaults(
  defineProps<{
    icon?: IconName
    title?: string
    description?: string
    actionText?: string
    actionTo?: string
  }>(),
  {
    icon: 'inbox',
    title: '这里还空空的',
    description: '换个筛选条件看看，或者稍后再来看看～',
    actionText: '',
    actionTo: '',
  },
)
</script>

<template>
  <div class="state-block" role="status">
    <span class="state-icon" aria-hidden="true"><AppIcon :name="icon" :size="42" :stroke-width="1.4" /></span>
    <p class="state-title">{{ title }}</p>
    <p class="state-desc">{{ description }}</p>
    <RouterLink v-if="actionText && actionTo" class="btn btn--soft btn--sm" :to="actionTo">
      {{ actionText }}
    </RouterLink>
    <slot />
  </div>
</template>

<style scoped>
.state-icon {
  color: var(--text-3);
}
.state-desc {
  font-size: 0.9rem;
  max-width: 320px;
}
</style>
