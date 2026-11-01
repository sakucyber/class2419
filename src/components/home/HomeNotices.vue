<script setup lang="ts">
/**
 * 首页公告区：软木板（校园）/ 图钉便签（其它）由皮肤决定。
 *
 * `id="notices"` 是滚动公告条（AppTicker）的锚点目标，不要改名。
 */
import SectionHeader from '@/components/common/SectionHeader.vue'
import type { Announcement } from '@/types'
import { formatRelative } from '@/utils/format'

defineProps<{ notices: Announcement[] }>()
</script>

<template>
  <section id="notices" v-reveal class="container section">
    <SectionHeader
      tag="Notice"
      title="班级公告"
      subtitle="访问地址说明与站点更新，都在这里"
      :linkable="false"
    />
    <ul class="notice-list">
      <li
        v-for="n in notices"
        :key="n.id"
        class="notice card"
        :class="`notice--${n.level || 'info'}`"
      >
        <div class="notice-head">
          <span class="notice-badge">{{ n.pinned ? '置顶' : '公告' }}</span>
          <strong>{{ n.title }}</strong>
          <time class="num" :datetime="n.createdAt">{{ formatRelative(n.createdAt) }}</time>
        </div>
        <p>{{ n.content }}</p>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.notice-list {
  display: grid;
  gap: var(--space-3);
}
.notice {
  padding: var(--space-4) var(--space-5);
  border-left: 3px solid var(--notice-accent, var(--line-2));
}
.notice--info {
  --notice-accent: var(--info);
}
.notice--success {
  --notice-accent: var(--success);
}
.notice--warning {
  --notice-accent: var(--warning);
}
.notice-head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: 6px;
  flex-wrap: wrap;
}
.notice-badge {
  flex: none;
  padding: 1px 6px;
  border: 1px solid var(--notice-accent, var(--line-2));
  color: var(--notice-accent, var(--text-3));
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 1px;
}
.notice-head strong {
  font-family: var(--font-display);
  font-size: var(--fs-md);
  font-weight: var(--display-weight);
}
.notice-head time {
  margin-left: auto;
  flex: none;
  color: var(--text-3);
  font-size: var(--fs-2xs);
}
.notice p {
  color: var(--text-2);
  font-size: var(--fs-sm);
  line-height: 1.75;
}

[data-style='annual'] .notice {
  background: #fff;
  border-left-width: 2px;
}
/* 暗色下白纸会把浅色正文吞掉，换成墨面纸 */
[data-style='annual'][data-theme='dark'] .notice {
  background: var(--surface);
}

[data-style='japandi'] .notice {
  border-left: none;
  background: var(--surface);
}
[data-style='japandi'] .notice-head::before {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--notice-accent, var(--accent));
  flex: none;
}
[data-style='japandi'] .notice-badge {
  border: none;
  background: var(--accent-soft);
  border-radius: 999px;
  padding: 1px 8px;
}

[data-style='brutal'] .notice {
  border: 3px solid #111;
  border-left-width: 10px;
  box-shadow: 4px 4px 0 #111;
}
[data-style='brutal'] .notice-badge {
  border-width: 2px;
  background: var(--accent);
  color: #111;
  font-weight: 900;
}

/* 校园：整组贴在一块软木板上（示例网页的 .cork），每张卡是一枚图钉卡片 */
[data-style='campus'] .notice-list {
  gap: 14px;
  padding: 24px;
  border: 10px solid var(--campus-wood);
  border-radius: 22px;
  background-color: var(--campus-cork);
  background-image: radial-gradient(rgba(169, 127, 82, 0.18) 1.6px, transparent 1.7px);
  background-size: 18px 18px;
  box-shadow:
    inset 0 0 0 3px var(--campus-wood-d),
    0 22px 44px -28px rgba(169, 127, 82, 0.7);
}
[data-style='campus'] .notice {
  border-left-width: 5px;
  border-radius: 6px 6px 16px 6px;
  box-shadow: 0 10px 20px -14px rgba(90, 64, 32, 0.6);
}
[data-style='campus'] .notice::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 50%;
  width: 13px;
  height: 13px;
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(circle at 34% 30%, rgba(255, 255, 255, 0.75), var(--campus-coral));
  box-shadow: 0 2px 4px rgba(60, 40, 20, 0.35);
}
[data-style='campus'] .notice:nth-child(even)::before {
  background: radial-gradient(circle at 34% 30%, rgba(255, 255, 255, 0.75), var(--campus-blue));
}
[data-style='campus'] .notice:nth-child(odd) {
  transform: rotate(-0.5deg);
}
[data-style='campus'] .notice-badge {
  padding: 2px 9px;
  border-radius: 999px;
  background: var(--surface);
  font-weight: 700;
}
[data-style='campus'] .notice-head strong {
  font-family: var(--font-display);
  font-weight: 400;
}
</style>
