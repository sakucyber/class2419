<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import SectionHeader from '@/components/common/SectionHeader.vue'
import { useContentStore } from '@/store/content'

const content = useContentStore()
</script>

<template>
  <div class="container page">
    <!-- 班级介绍 -->
    <section v-reveal class="intro card">
      <div class="intro-text">
        <span class="sec-tag">{{ content.classInfo.school }}</span>
        <h1 class="class-name">{{ content.classInfo.fullName }}</h1>
        <p class="desc">{{ content.classInfo.description }}</p>
        <ul class="stats">
          <li v-for="s in content.classInfo.stats" :key="s.label">
            <strong>{{ s.value }}</strong>
            <span>{{ s.label }}</span>
          </li>
        </ul>
      </div>

      <!-- 只列 stats 里没有的信息，避免重复 -->
      <dl class="facts">
        <div>
          <dt>毕业时间</dt>
          <dd>{{ content.classInfo.graduationAt }}</dd>
        </div>
        <div>
          <dt>班主任</dt>
          <dd>{{ content.classInfo.teacher }}</dd>
        </div>
      </dl>
    </section>

    <!-- 荣誉墙 -->
    <section v-reveal class="section">
      <SectionHeader tag="Honor" title="荣誉墙" subtitle="每一座奖杯背后，都有一群拼命的我们" />
      <ul class="honor-grid">
        <li v-for="h in content.honors" :key="h.id" class="honor card card-hover">
          <span class="honor-icon" aria-hidden="true"><AppIcon :name="h.icon" :size="30" :stroke-width="1.5" /></span>
          <div>
            <div class="honor-head">
              <strong>{{ h.title }}</strong>
              <span class="level">{{ h.level }}</span>
            </div>
            <time :datetime="h.date">{{ h.date }}</time>
            <p>{{ h.description }}</p>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.page {
  padding-top: var(--space-6);
}
.section {
  margin-top: var(--space-12);
}

/* 班级介绍：玻璃卡片 + 顶部渐变条 + 右上柔和光斑，不再整块铺主色 */
.intro {
  position: relative;
  display: grid;
  gap: var(--space-6);
  padding: clamp(24px, 4vw, 40px);
  overflow: hidden;
}
.intro::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: var(--primary-gradient);
}
.intro::after {
  content: '';
  position: absolute;
  top: -90px;
  right: -70px;
  width: 280px;
  height: 280px;
  border-radius: var(--radius-full);
  background: var(--primary-soft);
  filter: blur(46px);
  pointer-events: none;
}
@media (min-width: 860px) {
  .intro {
    grid-template-columns: 1.6fr 1fr;
    /* 原本是 start：右侧事实卡只有两项、高度远小于左列，
       下方会空出一大片。改成 stretch 让右卡补齐列高，内容垂直居中，
       看起来才像一个完整的侧栏而不是"没填满的卡片"。 */
    align-items: stretch;
    gap: var(--space-6);
  }
  .facts {
    align-content: center;
  }
}
.intro-text {
  position: relative;
  z-index: 1;
}
.class-name {
  font-family: var(--font-display);
  font-size: clamp(1.55rem, 4vw, 2.3rem);
  font-weight: 900;
  letter-spacing: 1px;
  line-height: 1.25;
  margin: var(--space-3) 0 var(--space-2);
}
.desc {
  margin-top: var(--space-3);
  line-height: 1.95;
  color: var(--text-2);
  max-width: 62ch;
}
.stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-5);
}
.stats li {
  display: flex;
  flex-direction: column;
  gap: 3px;
  /* 原来 10/20 的padding + 1.35rem 字重，比首页 hero 的数据胶囊大一整档，
     在这一页显得像两个大按钮；收一档，保持同一套语言 */
  padding: 9px 16px;
  border-radius: var(--radius-md);
  background: var(--primary-soft);
  border: 1px solid var(--primary-soft-2);
  transition: transform var(--duration) var(--ease-spring);
}
.stats li:hover {
  transform: translateY(-3px) scale(1.04);
}
.stats strong {
  font-size: 1.18rem;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.stats span {
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--text-3);
}

.facts {
  position: relative;
  z-index: 1;
  margin: 0;
  display: grid;
  gap: 2px;
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--bg-soft);
  border: 1px solid var(--border);
}
.facts > div {
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  transition: background var(--duration) var(--ease-out-quart);
}
.facts > div:hover {
  background: var(--card-hover);
}
.facts dt {
  font-size: 0.72rem;
  letter-spacing: 1px;
  color: var(--text-3);
}
.facts dd {
  margin: 3px 0 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text);
}

.honor-grid {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: 1fr;
}
@media (min-width: 720px) {
  .honor-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (min-width: 1200px) {
  .honor-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (min-width: 1600px) {
  .honor-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
.honor {
  display: flex;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-5);
}
.honor-icon {
  color: var(--primary);
  line-height: 1;
}
.honor-head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.level {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--warning);
  background: color-mix(in srgb, var(--warning) 12%, transparent);
  padding: 1px 8px;
  border-radius: var(--radius-full);
}
.honor time {
  font-size: 0.78rem;
  color: var(--text-3);
}
.honor p {
  margin-top: 6px;
  color: var(--text-2);
  font-size: 0.88rem;
}
</style>
