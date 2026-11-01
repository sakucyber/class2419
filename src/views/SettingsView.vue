<script setup lang="ts">
import { ref } from 'vue'

import AppIcon from '@/components/common/AppIcon.vue'
import InstallGuide from '@/components/common/InstallGuide.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { ACCENT_OPTIONS, FONT_SIZE_OPTIONS, STYLE_OPTIONS, THEME_OPTIONS } from '@/config/styles'
import { useSettingsStore } from '@/store/settings'
import { canInstall, promptInstall, pwaState } from '@/utils/pwa'

const settingsStore = useSettingsStore()

const guideOpen = ref(false)
const guideVariant = ref<'ios' | 'other'>('ios')
const installNotice = ref('')

async function onInstall(): Promise<void> {
  const result = await promptInstall()
  if (result === 'manual-ios') {
    guideVariant.value = 'ios'
    guideOpen.value = true
    return
  }
  if (result === 'manual-other') {
    guideVariant.value = 'other'
    guideOpen.value = true
    return
  }
  if (result === 'accepted') installNotice.value = '已提交安装，请按提示确认'
  else if (result === 'dismissed') installNotice.value = '已取消安装'
  else if (result === 'installed') installNotice.value = '当前已是安装状态'
}

const themes = THEME_OPTIONS
const accents = ACCENT_OPTIONS
const fontSizes = FONT_SIZE_OPTIONS
</script>

<template>
  <div class="container page">
    <PageHeader
      kicker="Settings"
      title="设置"
      subtitle="个性化你的浏览体验，所有设置仅保存在本地浏览器。"
    />

    <!-- 外观 -->
    <section class="card block" aria-labelledby="style-title">
      <div class="block-head">
        <h2 id="style-title">视觉风格</h2>
        <span class="block-note">{{ STYLE_OPTIONS.length }} 种风格共用同一份内容与功能</span>
      </div>

      <div class="style-grid" role="radiogroup" aria-label="视觉风格">
        <button
          v-for="option in STYLE_OPTIONS"
          :key="option.key"
          type="button"
          class="style-card"
          :class="{ active: settingsStore.settings.style === option.key }"
          role="radio"
          :aria-checked="settingsStore.settings.style === option.key"
          @click="settingsStore.settings.style = option.key"
        >
          <span class="style-preview" aria-hidden="true">
            <i v-for="(color, i) in option.swatches" :key="i" :style="{ background: color }" />
          </span>
          <span class="style-meta">
            <strong>{{ option.label }}</strong>
            <small>{{ option.en }}</small>
            <em>{{ option.desc }}</em>
          </span>
          <AppIcon
            v-if="settingsStore.settings.style === option.key"
            class="style-check"
            name="checkCircle"
            :size="18"
            :stroke-width="1.9"
          />
        </button>
      </div>

      <h3 class="sub-title">主题</h3>
      <div class="seg" role="radiogroup" aria-label="主题模式">
        <button
          v-for="t in themes"
          :key="t.key"
          type="button"
          class="seg-btn"
          :class="{ active: settingsStore.settings.theme === t.key }"
          role="radio"
          :aria-checked="settingsStore.settings.theme === t.key"
          @click="settingsStore.settings.theme = t.key"
        >
          <AppIcon :name="t.icon" :size="16" :stroke-width="1.9" />
          {{ t.label }}
        </button>
      </div>

      <h3 class="sub-title">强调色</h3>
      <div class="option-row" role="radiogroup" aria-label="强调色">
        <button
          v-for="a in accents"
          :key="a.key"
          type="button"
          class="option"
          :class="{ active: settingsStore.settings.accent === a.key }"
          role="radio"
          :aria-checked="settingsStore.settings.accent === a.key"
          @click="settingsStore.settings.accent = a.key"
        >
          <span v-if="a.key === 'auto'" class="swatch swatch--auto" aria-hidden="true">
            <i></i><i></i><i></i><i></i>
          </span>
          <span v-else class="swatch" :style="{ background: a.color }" aria-hidden="true"></span>
          {{ a.label }}
        </button>
      </div>
      <p class="hint-line">
        「随风格」会使用该风格自带的强调色；显式选择后只替换强调色，纸张与墨色不变。
      </p>

      <h3 class="sub-title">字号</h3>
      <div class="seg" role="radiogroup" aria-label="字号">
        <button
          v-for="f in fontSizes"
          :key="f.key"
          type="button"
          class="seg-btn"
          :class="{ active: settingsStore.settings.fontSize === f.key }"
          role="radio"
          :aria-checked="settingsStore.settings.fontSize === f.key"
          @click="settingsStore.settings.fontSize = f.key"
        >
          {{ f.label }}
        </button>
      </div>

      <h3 class="sub-title">动效与质感</h3>
      <label class="switch-row">
        <span>启用页面动效（关闭后最大限度减少动画，适配晕动敏感）</span>
        <input
          type="checkbox"
          class="switch"
          :checked="settingsStore.settings.animations"
          @change="settingsStore.settings.animations = ($event.target as HTMLInputElement).checked"
        />
      </label>
      <label class="switch-row">
        <span>液态玻璃（毛玻璃模糊，低性能设备建议关闭）</span>
        <input
          type="checkbox"
          class="switch"
          :checked="settingsStore.settings.glass"
          @change="settingsStore.settings.glass = ($event.target as HTMLInputElement).checked"
        />
      </label>
    </section>

    <!-- 安装到桌面 -->
    <section
      v-if="pwaState.installed || canInstall()"
      class="card block"
      aria-labelledby="install-title"
    >
      <div class="block-head">
        <h2 id="install-title">安装到桌面</h2>
      </div>
      <p class="block-desc">
        装到桌面后可以全屏打开，像 App 一样顺手；打开过一次后，页面和相册图片会缓存到本地，
        断网也能翻（视频体积大，不缓存，仍需联网）。
      </p>

      <div class="install-row">
        <span v-if="pwaState.installed" class="install-state">
          <AppIcon name="check" :size="15" :stroke-width="2.8" />
          已安装
        </span>
        <button v-else class="btn" type="button" @click="onInstall">
          <AppIcon name="plus" :size="15" :stroke-width="2.4" />
          添加到主屏幕
        </button>
      </div>

      <p class="visually-hidden" aria-live="polite">{{ installNotice }}</p>
      <InstallGuide :open="guideOpen" :variant="guideVariant" @close="guideOpen = false" />
    </section>

    <!-- 数据 -->
    <section class="card block" aria-labelledby="data-title">
      <div class="block-head">
        <h2 id="data-title">数据管理</h2>
        <span class="block-note">导出 / 恢复 / 历史版本</span>
      </div>
      <p class="block-desc">
        内容、收藏与进度、外观设置都保存在当前浏览器里，清除浏览器数据会全部丢失。
        需要搬家或留底时，去备份中心导出一份完整备份（一个 JSON 文件），
        恢复前还能先预览、再决定合并还是覆盖。
      </p>
      <div class="btn-row">
        <RouterLink to="/backup" class="btn">
          <AppIcon name="archive" :size="15" />
          打开备份中心
        </RouterLink>
        <RouterLink to="/offline" class="btn btn--ghost">
          <AppIcon name="wifiOff" :size="15" />
          查看离线状态
        </RouterLink>
      </div>
      <p class="hint-line">
        重置本地数据也移到了备份中心：那里会先自动留一份快照，再清空内容与互动数据。
      </p>
    </section>

    <!-- 关于 -->
    <section class="card block" aria-labelledby="about-title">
      <div class="block-head">
        <h2 id="about-title">关于本站</h2>
      </div>
      <ul class="about-list">
        <li><strong>项目：</strong>新屋岭中学2419班班级空间（纯前端静态站点）</li>
        <li><strong>技术栈：</strong>Vue 3 + Vite + TypeScript + Vue Router + Pinia</li>
        <li><strong>部署：</strong>纯静态产物，当前托管于 Cloudflare Pages 与阿里云 ESA</li>
        <li><strong>数据来源：</strong>内容以静态 JSON / Markdown 形式随仓库一起发布</li>
        <li>
          <strong>视觉：</strong>内置 {{ STYLE_OPTIONS.map((s) => s.label).join(' / ') }}，共
          {{ STYLE_OPTIONS.length }} 套风格，可随时切换
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.page {
  /* 搜索 / 设置是窄栏阅读版式，比通用容器窄一档 */
  max-width: 860px;
}
.block {
  padding: clamp(18px, 3vw, 28px);
  margin-bottom: var(--space-5);
}
.block-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-4);
}
.block h2 {
  font-size: var(--fs-lg);
}
.block-note {
  font-size: var(--fs-2xs);
  color: var(--text-3);
}
.block-desc {
  margin-bottom: var(--space-4);
  color: var(--text-2);
  font-size: var(--fs-sm);
  line-height: 1.8;
}
.sub-title {
  margin: var(--space-5) 0 var(--space-3);
  font-family: var(--font-sans);
  font-size: var(--fs-sm);
  font-weight: 700;
  color: var(--text-2);
}

.style-grid {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: 1fr;
}
@media (min-width: 640px) {
  .style-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.style-card {
  position: relative;
  display: flex;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--surface);
  text-align: left;
  transition:
    border-color var(--dur-fast) var(--ease),
    background-color var(--dur-fast) var(--ease);
}
.style-card:hover {
  border-color: var(--line-hover);
}
.style-card.active {
  border-color: var(--accent-ink);
  background: var(--accent-soft);
}
.style-preview {
  flex: none;
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: 58px;
  height: 58px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--radius-xs);
}
.style-preview i {
  display: block;
}
.style-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.style-meta strong {
  font-family: var(--font-display);
  font-size: var(--fs-md);
  font-weight: var(--display-weight);
}
.style-meta small {
  font-size: var(--fs-2xs);
  letter-spacing: 1px;
  color: var(--text-3);
}
.style-meta em {
  margin-top: 3px;
  font-style: normal;
  font-size: var(--fs-2xs);
  line-height: 1.55;
  color: var(--text-2);
}
.style-check {
  position: absolute;
  top: 8px;
  right: 8px;
  color: var(--accent-ink);
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
  min-height: 36px;
  padding: 0.35em 0.9em;
  border: 1px solid var(--line);
  border-radius: var(--radius-xs);
  background: transparent;
  color: var(--text-2);
  font-size: var(--fs-sm);
  font-weight: 600;
  transition:
    color var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease),
    background-color var(--dur-fast) var(--ease);
}
.option:hover {
  color: var(--text);
  border-color: var(--line-hover);
}
.option.active {
  color: var(--accent-ink);
  border-color: var(--accent-ink);
  background: var(--accent-soft);
}
.swatch {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex: none;
}
.swatch--auto {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-radius: 3px;
  overflow: hidden;
  border: 1px solid var(--line);
}
.swatch--auto i {
  display: block;
}
.swatch--auto i:nth-child(1) {
  background: #ab5c19;
}
.swatch--auto i:nth-child(2) {
  background: #5f7a5b;
}
.swatch--auto i:nth-child(3) {
  background: #ffd23f;
}
.swatch--auto i:nth-child(4) {
  background: #2563eb;
}
.hint-line {
  margin-top: var(--space-2);
  font-size: var(--fs-2xs);
  color: var(--text-3);
  line-height: 1.6;
}

.seg {
  display: inline-flex;
  border: 1px solid var(--line);
  border-radius: var(--radius-xs);
  overflow: hidden;
  background: var(--surface-2);
}
.seg-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0.4em 0.95em;
  border: none;
  border-right: 1px solid var(--line);
  background: transparent;
  color: var(--text-2);
  font-size: var(--fs-sm);
  font-weight: 600;
}
.seg-btn:last-child {
  border-right: none;
}
.seg-btn.active {
  background: var(--accent);
  color: var(--accent-contrast);
}

/* 触屏上把设置页的选项抬高到指尖舒适区（桌面保持紧凑） */
@media (pointer: coarse) {
  .option {
    min-height: 44px;
  }
  .seg-btn {
    min-height: 42px;
  }
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: 9px 0;
  font-size: var(--fs-sm);
  color: var(--text-2);
  cursor: pointer;
}

.install-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.install-state {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid var(--line);
  color: var(--text-2);
  font-size: var(--fs-sm);
}

.btn-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.about-list {
  display: grid;
  gap: var(--space-2);
  font-size: var(--fs-sm);
  color: var(--text-2);
}

/* 风格 */
[data-style='japandi'] .option {
  border-radius: 999px;
}
[data-style='japandi'] .seg {
  border-radius: 999px;
}
[data-style='japandi'] .style-card {
  border-color: transparent;
  box-shadow: var(--shadow-2);
}
[data-style='japandi'] .style-card.active {
  border-color: var(--accent-soft-2);
}
[data-style='brutal'] .style-card {
  border-width: 3px;
  border-color: #111;
}
[data-style='brutal'] .style-card.active {
  background: var(--accent);
  box-shadow: 4px 4px 0 #111;
  color: #111;
}
[data-style='brutal'] .style-card.active .style-meta small,
[data-style='brutal'] .style-card.active .style-meta em {
  color: #111;
}
[data-style='brutal'] .style-preview,
[data-style='brutal'] .seg,
[data-style='brutal'] .option,
[data-style='brutal'] .install-state {
  border-width: 3px;
  border-color: #111;
}
[data-style='brutal'] .option.active {
  background: var(--accent);
  color: #111;
  border-color: #111;
  box-shadow: 2px 2px 0 #111;
}
[data-style='brutal'] .seg-btn.active {
  background: #111;
  color: var(--accent);
}
[data-style='brutal'] .swatch {
  border-radius: 0;
  border: 2px solid #111;
}
</style>
