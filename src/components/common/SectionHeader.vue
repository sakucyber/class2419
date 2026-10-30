<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'

withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    to?: string
    moreText?: string
    tag?: string
    /** 是否显示右上角「查看更多」链接 */
    linkable?: boolean
  }>(),
  { subtitle: '', to: '', moreText: '', tag: '', linkable: true },
)
</script>

<template>
  <div class="section-header">
    <div class="heading">
      <span v-if="tag" class="kicker">{{ tag }}</span>
      <h2 class="title">{{ title }}</h2>
      <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
    </div>
    <RouterLink v-if="linkable && to" class="more" :to="to">
      {{ moreText || '查看全部' }}
      <AppIcon name="arrowRight" :size="15" :stroke-width="2" />
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
.kicker {
  margin-bottom: 8px;
}
.title {
  font-size: clamp(1.3rem, 2.4vw, 1.72rem);
}
.subtitle {
  margin-top: 6px;
  color: var(--text-3);
  font-size: var(--fs-sm);
}
.more {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 2px;
  color: var(--text-2);
  font-size: var(--fs-sm);
  font-weight: 600;
  border-bottom: 1px solid var(--line-2);
  transition:
    color var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease);
}
.more:hover {
  color: var(--accent-ink);
  border-bottom-color: var(--accent-ink);
}

[data-style='annual'] .section-header {
  padding-top: var(--space-4);
  border-top: 1px solid var(--line-2);
}
[data-style='japandi'] .section-header {
  align-items: flex-start;
}
[data-style='brutal'] .section-header {
  padding-bottom: var(--space-3);
  border-bottom: 3px solid #111;
}
[data-style='brutal'] .more {
  padding: 4px 10px;
  border: 3px solid #111;
  background: #fffdf7;
  box-shadow: 3px 3px 0 #111;
  font-weight: 900;
  color: #111;
}
[data-style='brutal'] .more:hover {
  background: var(--accent);
  color: #111;
}

/* ---------- 校园：纸条标签 + 手绘下划线 ----------
   下划线的形状与动画在 base.css（与 PageHeader 共用），这里只管页面级的排布。 */
[data-style='campus'] .section-header {
  align-items: flex-end;
}
[data-style='campus'] .subtitle {
  font-size: var(--fs-sm);
}
[data-style='campus'] .more {
  padding: 5px 12px;
  border: 1px solid var(--campus-blue-l);
  border-radius: 999px;
  background: var(--surface);
  color: var(--campus-blue-d);
  font-weight: 700;
  box-shadow: 0 3px 0 rgba(51, 71, 91, 0.08);
}
[data-style='campus'] .more:hover {
  border-color: var(--campus-blue);
  background: var(--accent-soft);
  color: var(--campus-blue-d);
}
[data-style='campus'][data-theme='dark'] .more {
  border-color: var(--line-2);
  color: var(--accent-ink);
  box-shadow: none;
}

@media (max-width: 560px) {
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-3);
  }
}
</style>
