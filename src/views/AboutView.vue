<script setup lang="ts">
import { computed, ref } from 'vue'

import EmptyState from '@/components/common/EmptyState.vue'
import SectionHeader from '@/components/common/SectionHeader.vue'
import { useContentStore } from '@/store/content'

const content = useContentStore()
const memberKeyword = ref('')

const filteredMembers = computed(() => {
  const kw = memberKeyword.value.trim().toLowerCase()
  if (!kw) return content.members
  return content.members.filter(
    (m) =>
      m.name.toLowerCase().includes(kw) ||
      m.role.toLowerCase().includes(kw) ||
      m.intro.toLowerCase().includes(kw) ||
      m.tags.some((t) => t.toLowerCase().includes(kw)),
  )
})

/** 头像用姓名首字 + 确定性色相 */
function avatarStyle(name: string) {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.codePointAt(0)!) % 360
  return {
    background: `linear-gradient(135deg, hsl(${hash} 70% 52%), hsl(${(hash + 40) % 360} 70% 45%))`,
  }
}
</script>

<template>
  <div class="container page">
    <!-- 班级介绍 -->
    <section class="intro card">
      <div class="intro-text">
        <p class="eyebrow">{{ content.classInfo.school }}</p>
        <h1>{{ content.classInfo.fullName }}</h1>
        <p class="motto">「{{ content.classInfo.motto }}」</p>
        <p class="desc">{{ content.classInfo.description }}</p>
        <ul class="stats">
          <li v-for="s in content.classInfo.stats" :key="s.label">
            <strong>{{ s.value }}</strong>
            <span>{{ s.label }}</span>
          </li>
        </ul>
      </div>
      <dl class="facts">
        <div>
          <dt>建班时间</dt>
          <dd>{{ content.classInfo.foundedAt }}</dd>
        </div>
        <div>
          <dt>毕业时间</dt>
          <dd>{{ content.classInfo.graduationAt }}</dd>
        </div>
        <div>
          <dt>班主任</dt>
          <dd>{{ content.classInfo.teacher }}</dd>
        </div>
        <div>
          <dt>班训</dt>
          <dd>{{ content.classInfo.slogan }}</dd>
        </div>
      </dl>
    </section>

    <!-- 成员墙 -->
    <section class="section">
      <SectionHeader title="成员墙" subtitle="48颗星星，先认识这些熟悉的面孔" />
      <div class="member-tools">
        <div class="search-box card">
          <span aria-hidden="true">🔍</span>
          <input
            v-model="memberKeyword"
            type="search"
            class="search-input"
            placeholder="搜索姓名、职务或爱好…"
            aria-label="搜索成员"
          />
        </div>
      </div>
      <EmptyState
        v-if="!filteredMembers.length"
        icon="🔍"
        title="没有找到同学"
        description="换个关键词试试。"
      />
      <ul v-else class="member-grid">
        <li v-for="m in filteredMembers" :key="m.id" class="member card card-hover">
          <span class="avatar" :style="avatarStyle(m.name)" aria-hidden="true">
            {{ m.name.slice(0, 1) }}
          </span>
          <div class="member-info">
            <div class="name-row">
              <strong>{{ m.name }}</strong>
              <span class="role chip chip--primary">{{ m.role }}</span>
            </div>
            <p class="intro-line">{{ m.intro }}</p>
            <div class="tags">
              <span v-for="t in m.tags" :key="t" class="tag">#{{ t }}</span>
            </div>
          </div>
        </li>
      </ul>
    </section>

    <!-- 荣誉墙 -->
    <section class="section">
      <SectionHeader title="荣誉墙" subtitle="每一座奖杯背后，都有一群拼命的我们" />
      <ul class="honor-grid">
        <li v-for="h in content.honors" :key="h.id" class="honor card card-hover">
          <span class="honor-icon" aria-hidden="true">{{ h.icon }}</span>
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

    <!-- 时间线 -->
    <section class="section">
      <SectionHeader title="班级时间线" subtitle="我们的故事，从 2024 年 9 月 1 日开始" />
      <ol class="timeline">
        <li v-for="node in content.timeline" :key="node.id" class="node">
          <span class="dot" aria-hidden="true"></span>
          <div class="node-body card">
            <div class="node-head">
              <time :datetime="node.date">{{ node.date }}</time>
              <span v-if="node.tag" class="chip">{{ node.tag }}</span>
            </div>
            <h3>{{ node.title }}</h3>
            <p>{{ node.description }}</p>
          </div>
        </li>
      </ol>
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

.intro {
  display: grid;
  gap: var(--space-6);
  padding: clamp(22px, 4vw, 40px);
  background: var(--primary-gradient);
  border: none;
  color: #fff;
}
@media (min-width: 860px) {
  .intro {
    grid-template-columns: 1.6fr 1fr;
    align-items: center;
  }
}
.intro :deep(*) {
  color: #fff;
}
.eyebrow {
  letter-spacing: 2px;
  font-size: 0.85rem;
  font-weight: 600;
  opacity: 0.9;
}
.intro h1 {
  color: #fff;
  font-size: clamp(1.5rem, 4vw, 2.2rem);
  margin: var(--space-2) 0;
}
.motto {
  font-size: 1.05rem;
  font-weight: 700;
  opacity: 0.95;
  margin-bottom: var(--space-3);
}
.desc {
  line-height: 1.9;
  opacity: 0.92;
  max-width: 62ch;
}
.stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-6);
  margin-top: var(--space-5);
}
.stats li {
  display: flex;
  flex-direction: column;
}
.stats strong {
  font-size: 1.4rem;
}
.stats span {
  font-size: 0.78rem;
  opacity: 0.85;
}
.facts {
  margin: 0;
  background: rgba(255, 255, 255, 0.14);
  border-radius: var(--radius-md);
  padding: var(--space-5);
  display: grid;
  gap: var(--space-4);
  backdrop-filter: blur(6px);
}
.facts dt {
  font-size: 0.75rem;
  opacity: 0.8;
}
.facts dd {
  margin: 2px 0 0;
  font-weight: 700;
  font-size: 1rem;
}

.member-tools {
  margin-bottom: var(--space-4);
}
.search-box {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0 14px;
  max-width: 420px;
}
.search-input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  color: var(--text);
  padding: 0.55em 0;
  min-width: 0;
}

.member-grid {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: 1fr;
}
@media (min-width: 640px) {
  .member-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (min-width: 1000px) {
  .member-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
.member {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-4);
}
.avatar {
  flex: none;
  width: 52px;
  height: 52px;
  border-radius: var(--radius-md);
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 800;
  font-size: 1.25rem;
  box-shadow: var(--shadow-1);
}
.member-info {
  min-width: 0;
}
.name-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.role {
  font-size: 0.72rem;
}
.intro-line {
  color: var(--text-2);
  font-size: 0.86rem;
  margin-top: 4px;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: 6px;
}
.tag {
  font-size: 0.75rem;
  color: var(--primary);
  font-weight: 600;
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
.honor {
  display: flex;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-5);
}
.honor-icon {
  font-size: 2rem;
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

.timeline {
  position: relative;
  padding-left: 26px;
  display: grid;
  gap: var(--space-4);
}
.timeline::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: linear-gradient(var(--primary), var(--border));
  border-radius: var(--radius-full);
}
.node {
  position: relative;
}
.dot {
  position: absolute;
  left: -26px;
  top: 20px;
  width: 18px;
  height: 18px;
  border-radius: var(--radius-full);
  background: var(--card);
  border: 4px solid var(--primary);
  box-shadow: var(--shadow-1);
  z-index: 1;
}
.node-body {
  padding: var(--space-4) var(--space-5);
}
.node-head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: 6px;
}
.node-head time {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--primary);
  font-variant-numeric: tabular-nums;
}
.node-body h3 {
  font-size: 1.05rem;
  margin-bottom: 4px;
}
.node-body p {
  color: var(--text-2);
  font-size: 0.9rem;
}
</style>
