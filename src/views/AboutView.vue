<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import SectionHeader from '@/components/common/SectionHeader.vue'
import { useContentStore } from '@/store/content'

const content = useContentStore()
</script>

<template>
  <div class="container page">
    <PageHeader
      kicker="About the class"
      title="关于班级"
      subtitle="一所学校，一间教室，五十一个人，和三年里数不清的小事。"
    />

    <!-- 班级介绍 -->
    <section v-reveal class="intro card">
      <div class="intro-text">
        <p class="kicker">{{ content.classInfo.school }}</p>
        <h2 class="class-name">{{ content.classInfo.fullName }}</h2>
        <p class="desc">{{ content.classInfo.description }}</p>
        <ul class="stats">
          <li v-for="s in content.classInfo.stats" :key="s.label">
            <strong class="num">{{ s.value }}</strong>
            <span>{{ s.label }}</span>
          </li>
        </ul>
      </div>

      <!-- 只列 stats 里没有的信息，避免重复 -->
      <dl class="facts">
        <div class="fact">
          <dt>毕业时间</dt>
          <dd class="num">{{ content.classInfo.graduationAt }}</dd>
        </div>
        <div class="fact">
          <dt>班主任</dt>
          <dd>{{ content.classInfo.teacher }}</dd>
        </div>
        <div class="fact">
          <dt>访问地址</dt>
          <dd class="fact-access">
            <a href="https://class2419.pages.dev/" target="_blank" rel="noopener noreferrer">
              class2419.pages.dev
            </a>
            <a
              class="fact-backup"
              href="https://class2419.zh.kg/"
              target="_blank"
              rel="noopener noreferrer"
              title="阿里云 CDN 加速链接，可能失效"
            >
              备用 · class2419.zh.kg
            </a>
          </dd>
        </div>
      </dl>
    </section>

    <!-- 荣誉墙 -->
    <section v-reveal class="section">
      <SectionHeader
        tag="Honor"
        title="荣誉墙"
        subtitle="每一座奖杯背后，都有一群拼命的我们"
        :linkable="false"
      />
      <ul class="honor-grid">
        <li v-for="(h, i) in content.honors" :key="h.id" class="honor card card-hover">
          <span class="honor-index num" aria-hidden="true">{{
            String(i + 1).padStart(2, '0')
          }}</span>
          <span class="honor-icon" aria-hidden="true">
            <AppIcon :name="h.icon" :size="22" :stroke-width="1.5" />
          </span>
          <div class="honor-body">
            <div class="honor-head">
              <strong>{{ h.title }}</strong>
              <span class="level">{{ h.level }}</span>
            </div>
            <time class="num" :datetime="h.date">{{ h.date }}</time>
            <p>{{ h.description }}</p>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.section {
  margin-top: var(--space-12);
}

.intro {
  display: grid;
  gap: var(--space-6);
  padding: clamp(22px, 3.6vw, 44px);
  overflow: hidden;
}
@media (min-width: 860px) {
  .intro {
    grid-template-columns: minmax(0, 1.55fr) minmax(260px, 0.85fr);
    align-items: stretch;
  }
  .facts {
    align-content: center;
  }
}
.class-name {
  margin: var(--space-3) 0 var(--space-2);
  font-size: clamp(1.45rem, 3.6vw, 2.2rem);
}
.desc {
  margin-top: var(--space-3);
  max-width: 62ch;
  color: var(--text-2);
  font-size: var(--fs-md);
  line-height: 1.9;
}
.stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-5);
  margin-top: var(--space-5);
  padding-top: var(--space-4);
  border-top: 1px solid var(--line);
}
.stats li {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.stats strong {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: var(--display-weight);
  line-height: 1.15;
}
.stats span {
  font-size: var(--fs-2xs);
  color: var(--text-3);
  letter-spacing: 0.5px;
}

.facts {
  margin: 0;
  display: grid;
  align-content: start;
  gap: 0;
  border-top: 1px solid var(--line);
}
.fact {
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--line);
}
.fact dt {
  font-size: var(--fs-2xs);
  letter-spacing: 1.5px;
  color: var(--text-3);
  text-transform: uppercase;
}
.fact dd {
  margin: 4px 0 0;
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--text);
}
.fact-access {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.fact-access a {
  font-size: var(--fs-sm);
  font-weight: 600;
  word-break: break-all;
}
.fact-access .fact-backup {
  font-size: var(--fs-xs);
  font-weight: 400;
  color: var(--text-3);
}
.fact-access .fact-backup:hover {
  color: var(--text-2);
}

.honor-grid {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: 1fr;
}
@media (min-width: 720px) {
  .honor-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 1200px) {
  .honor-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
.honor {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
}
.honor-index {
  font-family: var(--font-display);
  font-size: var(--fs-2xs);
  color: var(--text-4);
  letter-spacing: 1px;
  padding-top: 2px;
}
.honor-icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border: 1px solid var(--line);
  border-radius: var(--radius-xs);
  color: var(--accent-ink);
  background: var(--accent-soft);
}
.honor-body {
  min-width: 0;
}
.honor-head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.honor-head strong {
  font-family: var(--font-display);
  font-size: var(--fs-md);
  font-weight: var(--display-weight);
}
.level {
  padding: 1px 7px;
  border: 1px solid var(--warning);
  color: var(--warning);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.honor time {
  display: block;
  margin-top: 2px;
  font-size: var(--fs-2xs);
  color: var(--text-3);
}
.honor p {
  margin-top: 6px;
  font-size: var(--fs-sm);
  color: var(--text-2);
  line-height: 1.65;
}

/* 风格 */
[data-style='annual'] .class-name {
  font-family: var(--font-serif);
  font-weight: 600;
}
[data-style='annual'] .honor-index {
  border-right: 1px solid var(--line);
  padding-right: 8px;
}
[data-style='japandi'] .intro {
  border-color: transparent;
  box-shadow: var(--shadow-2);
}
[data-style='japandi'] .facts {
  border-top: none;
  padding: var(--space-3);
  border-radius: 14px;
  background: var(--bg-soft);
}
[data-style='japandi'] .fact {
  border-bottom-color: rgba(61, 74, 66, 0.08);
}
[data-style='japandi'] .honor-icon {
  border-radius: 50%;
  border-color: transparent;
}
[data-style='japandi'] .level {
  border: none;
  background: var(--accent-soft);
  color: var(--accent-ink);
  border-radius: 999px;
}
[data-style='brutal'] .intro {
  border: 3px solid #111;
  box-shadow: 8px 8px 0 #111;
}
[data-style='brutal'] .facts {
  border-top: 3px solid #111;
}
[data-style='brutal'] .fact {
  border-bottom: 3px solid #111;
}
[data-style='brutal'] .honor-index {
  border: 2px solid #111;
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  padding: 0;
  color: #111;
}
[data-style='brutal'] .honor-icon {
  border: 3px solid #111;
  background: var(--accent);
  color: #111;
}
[data-style='brutal'] .level {
  border: 2px solid #111;
  background: var(--accent);
  color: #111;
  font-weight: 900;
}
</style>
