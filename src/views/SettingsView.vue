<script setup lang="ts">
import { ref } from 'vue'

import AppIcon from '@/components/common/AppIcon.vue'
import type { IconName } from '@/components/common/icons'
import { useContentStore } from '@/store/content'
import { useInteractionStore } from '@/store/interaction'
import { useSettingsStore } from '@/store/settings'
import type { AccentKey, FontSizeKey, ThemeMode } from '@/types'

const settingsStore = useSettingsStore()
const content = useContentStore()
const interaction = useInteractionStore()

const confirmReset = ref(false)
const message = ref('')

const themes: { key: ThemeMode; label: string; icon: IconName }[] = [
  { key: 'light', label: '亮色', icon: 'sun' },
  { key: 'dark', label: '暗色', icon: 'moon' },
  { key: 'auto', label: '跟随系统', icon: 'monitor' },
]
const accents: { key: AccentKey; label: string; color: string }[] = [
  { key: 'blue', label: '晴空蓝', color: '#2563eb' },
  { key: 'green', label: '常青绿', color: '#0d9488' },
  { key: 'orange', label: '活力橙', color: '#ea580c' },
  { key: 'pink', label: '樱花粉紫', color: '#e879b0' },
]
const fontSizes: { key: FontSizeKey; label: string }[] = [
  { key: 'sm', label: '小' },
  { key: 'md', label: '标准' },
  { key: 'lg', label: '大' },
]

async function doReset() {
  try {
    await content.resetUserData()
    interaction.resetAll()
    message.value = '已恢复为默认内容，本地收藏与观看进度已清空。'
    confirmReset.value = false
  } catch (e) {
    message.value = e instanceof Error ? e.message : '重置失败'
  }
}
</script>

<template>
  <div class="container page">
    <header class="page-head">
      <h1>设置</h1>
      <p class="subtitle">个性化你的浏览体验，所有设置仅保存在本地浏览器</p>
    </header>

    <!-- 外观 -->
    <section class="card block" aria-labelledby="theme-title">
      <h2 id="theme-title">外观主题</h2>
      <div class="option-row" role="radiogroup" aria-label="主题模式">
        <button
          v-for="t in themes"
          :key="t.key"
          class="option"
          :class="{ active: settingsStore.settings.theme === t.key }"
          role="radio"
          :aria-checked="settingsStore.settings.theme === t.key"
          @click="settingsStore.settings.theme = t.key"
        >
          <AppIcon :name="t.icon" :size="17" />
          {{ t.label }}
        </button>
      </div>

      <h3 class="sub-title">强调色</h3>
      <div class="option-row" role="radiogroup" aria-label="强调色">
        <button
          v-for="a in accents"
          :key="a.key"
          class="option color-option"
          :class="{ active: settingsStore.settings.accent === a.key }"
          role="radio"
          :aria-checked="settingsStore.settings.accent === a.key"
          @click="settingsStore.settings.accent = a.key"
        >
          <span class="swatch" :style="{ background: a.color }" aria-hidden="true"></span>
          {{ a.label }}
        </button>
      </div>

      <h3 class="sub-title">字号</h3>
      <div class="option-row" role="radiogroup" aria-label="字号">
        <button
          v-for="f in fontSizes"
          :key="f.key"
          class="option"
          :class="{ active: settingsStore.settings.fontSize === f.key }"
          role="radio"
          :aria-checked="settingsStore.settings.fontSize === f.key"
          @click="settingsStore.settings.fontSize = f.key"
        >
          {{ f.label }}
        </button>
      </div>

      <h3 class="sub-title">动效</h3>
      <label class="switch-row">
        <span>启用页面动效（关闭后将最大限度减少动画，适配晕动敏感）</span>
        <input
          type="checkbox"
          class="switch"
          :checked="settingsStore.settings.animations"
          @change="settingsStore.settings.animations = ($event.target as HTMLInputElement).checked"
        />
      </label>

      <h3 class="sub-title">视觉特效</h3>
      <label class="switch-row">
        <span>液态玻璃（界面上的毛玻璃模糊效果，低性能设备建议关闭）</span>
        <input
          type="checkbox"
          class="switch"
          :checked="settingsStore.settings.glass"
          @change="settingsStore.settings.glass = ($event.target as HTMLInputElement).checked"
        />
      </label>
    </section>

    <!-- 数据 -->
    <section class="card block" aria-labelledby="data-title">
      <h2 id="data-title">数据管理</h2>
      <p class="block-desc">
        本站在浏览器本地（localStorage / IndexedDB）保存你的收藏与观看进度。
        清除浏览器数据会导致这些内容丢失，重要稿件请先「导出备份」。
      </p>
      <div class="btn-row">
        <button class="btn btn--danger" :disabled="confirmReset" @click="confirmReset = true">
          重置全部本地数据
        </button>
        <template v-if="confirmReset">
          <button class="btn btn--danger" @click="doReset">确认重置？</button>
          <button class="btn btn--ghost" @click="confirmReset = false">取消</button>
        </template>
      </div>
      <p v-if="message" class="message" role="status">{{ message }}</p>
    </section>

    <!-- 关于 -->
    <section class="card block" aria-labelledby="about-title">
      <h2 id="about-title">关于本站</h2>
      <ul class="about-list">
        <li><strong>项目：</strong>新屋岭中学2419班班级空间（纯前端静态站点）</li>
        <li><strong>技术栈：</strong>Vue 3 + Vite + TypeScript + Vue Router + Pinia</li>
        <li><strong>部署：</strong>纯静态产物，当前托管于 Cloudflare Pages 与阿里云 ESA</li>
        <li><strong>数据来源：</strong>内容以静态 JSON / Markdown 形式随仓库一起发布</li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.page {
  padding-top: var(--space-6);
  max-width: 760px;
}
.page-head {
  margin-bottom: var(--space-5);
}
h1 {
  font-size: clamp(1.4rem, 3vw, 1.8rem);
}
.subtitle {
  color: var(--text-3);
  font-size: 0.88rem;
  margin-top: 4px;
}

.block {
  padding: clamp(18px, 3vw, 28px);
  margin-bottom: var(--space-4);
}
.block h2 {
  font-size: 1.15rem;
  margin-bottom: var(--space-4);
}
.sub-title {
  font-size: 0.92rem;
  color: var(--text-2);
  margin: var(--space-5) 0 var(--space-3);
}
.block-desc {
  color: var(--text-2);
  font-size: 0.9rem;
  margin-bottom: var(--space-4);
}

.option-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.option {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0.5em 1.1em;
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  background: var(--card);
  color: var(--text-2);
  font-weight: 600;
  font-size: 0.92rem;
  transition: all var(--duration-fast) var(--ease);
}
.option:hover {
  border-color: var(--primary-soft-2);
  color: var(--primary);
}
.option.active {
  border-color: var(--primary);
  background: var(--primary-soft);
  color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-soft);
}
.swatch {
  width: 16px;
  height: 16px;
  border-radius: var(--radius-full);
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  font-size: 0.92rem;
  color: var(--text-2);
  cursor: pointer;
}
.switch {
  appearance: none;
  width: 46px;
  height: 26px;
  border-radius: var(--radius-full);
  background: var(--border-strong);
  position: relative;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease);
  flex: none;
}
.switch::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: var(--radius-full);
  background: #fff;
  transition: transform var(--duration-fast) var(--ease);
  box-shadow: var(--shadow-1);
}
.switch:checked {
  background: var(--primary);
}
.switch:checked::after {
  transform: translateX(20px);
}

.btn-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}
.message {
  margin-top: var(--space-3);
  color: var(--success);
  font-size: 0.9rem;
  font-weight: 600;
}

.about-list {
  display: grid;
  gap: var(--space-3);
  font-size: 0.92rem;
  color: var(--text-2);
}
.about-list code {
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  padding: 1px 8px;
  font-family: var(--font-mono);
}
</style>
