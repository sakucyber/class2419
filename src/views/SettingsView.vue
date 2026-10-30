<script setup lang="ts">
import { ref } from 'vue'

import AppIcon from '@/components/common/AppIcon.vue'
import InstallGuide from '@/components/common/InstallGuide.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import type { IconName } from '@/components/common/icons'
import { STYLE_OPTIONS } from '@/config/styles'
import { useContentStore } from '@/store/content'
import type { TierPreference } from '@/store/effects'
import { useEffectsStore } from '@/store/effects'
import { useInteractionStore } from '@/store/interaction'
import { useSettingsStore } from '@/store/settings'
import type { AccentKey, FontSizeKey, ThemeMode } from '@/types'
import { canInstall, promptInstall, pwaState } from '@/utils/pwa'

const settingsStore = useSettingsStore()
const content = useContentStore()
const interaction = useInteractionStore()
const effectsStore = useEffectsStore()

const confirmReset = ref(false)
const message = ref('')
const importInput = ref<HTMLInputElement | null>(null)

const tiers: { key: TierPreference; label: string; desc: string }[] = [
  { key: 'auto', label: '自动', desc: '按设备能力自动选择' },
  { key: 'L2', label: '高', desc: '3D 徽章 + 全部特效' },
  { key: 'L1', label: '中', desc: '轻量动效，不含 3D' },
  { key: 'L0', label: '低', desc: '仅静态，最省电' },
]
const effectsNotice = ref('')

function chooseTier(key: TierPreference): void {
  effectsStore.setTier(key)
  const label = tiers.find((t) => t.key === key)?.label ?? key
  effectsNotice.value = `特效等级已设为「${label}」`
}

function toggleThree(event: Event): void {
  const on = (event.target as HTMLInputElement).checked
  effectsStore.setThree(on)
  effectsNotice.value = on ? '已开启 3D 场景' : '已关闭 3D 场景'
}

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

const themes: { key: ThemeMode; label: string; icon: IconName }[] = [
  { key: 'light', label: '亮色', icon: 'sun' },
  { key: 'dark', label: '暗色', icon: 'moon' },
  { key: 'auto', label: '跟随系统', icon: 'monitor' },
]
const accents: { key: AccentKey; label: string; color: string }[] = [
  { key: 'auto', label: '随风格', color: '' },
  { key: 'blue', label: '晴空蓝', color: '#1f56d6' },
  { key: 'green', label: '常青绿', color: '#0d7a6f' },
  { key: 'orange', label: '活力橙', color: '#b8560f' },
  { key: 'pink', label: '樱花粉', color: '#b04a80' },
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

function backupFileName(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `class2419-backup-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`
}

async function exportBackup(): Promise<void> {
  try {
    const exported = await content.exportAll()
    const payload = {
      ...exported,
      version: 2,
      interaction: interaction.exportState(),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = backupFileName()
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    message.value = '备份已导出：包含本地内容、收藏、观看进度与阅读位置。'
  } catch (e) {
    message.value = e instanceof Error ? e.message : '导出失败'
  }
}

function pickBackup(): void {
  importInput.value?.click()
}

async function onBackupFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    const payload = JSON.parse(await file.text()) as Record<string, unknown>
    const data = (payload.data ?? payload) as Record<string, unknown>
    const count = (key: string) => (Array.isArray(data[key]) ? (data[key] as unknown[]).length : 0)
    await content.importAll(payload)
    if (payload.interaction) interaction.importState(payload.interaction)
    message.value = `导入完成：相册 ${count('albums')}、视频 ${count('videos')}、文章 ${count('articles')}、公告 ${count('announcements')}；收藏/进度等互动数据已合并。`
  } catch (e) {
    message.value = e instanceof Error ? e.message : '导入失败：文件不是有效的备份 JSON'
  }
}
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
            <i
              v-for="(color, i) in option.swatches"
              :key="i"
              :style="{ background: color }"
            />
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
      <p class="hint-line">「随风格」会使用该风格自带的强调色；显式选择后只替换强调色，纸张与墨色不变。</p>

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

    <!-- 特效与性能 -->
    <section class="card block" aria-labelledby="effects-title">
      <div class="block-head">
        <h2 id="effects-title">特效与性能</h2>
      </div>
      <p class="block-desc">
        等级越高画面越丰富，对设备要求也越高。选「自动」会按 CPU、内存、显卡能力自行判断；
        手动选择后会被记住，优先于自动检测。
      </p>

      <h3 class="sub-title">特效等级</h3>
      <div class="option-row" role="radiogroup" aria-label="特效等级">
        <button
          v-for="t in tiers"
          :key="t.key"
          type="button"
          class="option tier-option"
          :class="{ active: effectsStore.tierPreference === t.key }"
          role="radio"
          :aria-checked="effectsStore.tierPreference === t.key"
          :disabled="effectsStore.isLegacyBrowser"
          :title="effectsStore.isLegacyBrowser ? '简化模式下等级被锁定为低' : t.desc"
          @click="chooseTier(t.key)"
        >
          {{ t.label }}
        </button>
      </div>
      <p class="tier-current">
        当前生效：<strong>{{ effectsStore.effectiveTier }}</strong>
        <span v-if="effectsStore.isLegacyBrowser">（简化模式强制）</span>
        <span v-else-if="effectsStore.tierPreference === 'auto'">（自动检测）</span>
        <span v-else>（手动指定）</span>
      </p>

      <h3 class="sub-title">3D 场景</h3>
      <label class="switch-row">
        <span>首页 3D 徽章（需要「高」等级且设备支持 WebGL）</span>
        <input
          type="checkbox"
          class="switch"
          :checked="effectsStore.threeEnabled"
          :disabled="effectsStore.isLegacyBrowser"
          @change="toggleThree"
        />
      </label>

      <p v-if="effectsStore.effectsHint" class="effects-hint">
        {{ effectsStore.effectsHint }}
      </p>

      <details class="device-details">
        <summary>设备检测详情</summary>
        <ul>
          <li>综合评分：{{ effectsStore.deviceSummary.score }} / 100</li>
          <li>建议等级：{{ effectsStore.deviceSummary.tier }}</li>
          <li>CPU 核心：{{ effectsStore.deviceSummary.cores }}</li>
          <li>内存：{{ effectsStore.deviceSummary.memory }}</li>
          <li>WebGL2：{{ effectsStore.deviceSummary.webgl2 ? '支持' : '不支持' }}</li>
          <li>显卡：{{ effectsStore.deviceSummary.gpu }}</li>
        </ul>
        <ul class="device-reasons">
          <li v-for="(r, i) in effectsStore.deviceSummary.reasons" :key="i">{{ r }}</li>
        </ul>
      </details>

      <p class="visually-hidden" aria-live="polite">{{ effectsNotice }}</p>
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
      </div>
      <p class="block-desc">
        本站在浏览器本地（localStorage / IndexedDB）保存你的收藏、观看进度与阅读位置。
        清除浏览器数据会导致这些内容全部丢失，建议定期「导出备份」（一个 JSON 文件）。
        导入会与现有数据合并，同 id 覆盖；旧版备份也兼容。
      </p>
      <div class="btn-row">
        <button class="btn btn--soft" type="button" @click="exportBackup">
          <AppIcon name="download" :size="15" />
          导出备份
        </button>
        <button class="btn btn--soft" type="button" @click="pickBackup">
          <AppIcon name="upload" :size="15" />
          导入备份
        </button>
        <button
          class="btn btn--danger"
          type="button"
          :disabled="confirmReset"
          @click="confirmReset = true"
        >
          重置全部本地数据
        </button>
        <template v-if="confirmReset">
          <button class="btn btn--danger" type="button" @click="doReset">确认重置？</button>
          <button class="btn btn--ghost" type="button" @click="confirmReset = false">取消</button>
        </template>
      </div>
      <input
        ref="importInput"
        class="visually-hidden"
        type="file"
        accept="application/json,.json"
        aria-label="选择备份文件"
        @change="onBackupFile"
      />
      <p v-if="message" class="message" role="status">{{ message }}</p>
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
          <strong>视觉：</strong>内置
          {{ STYLE_OPTIONS.map((s) => s.label).join(' / ') }}，共 {{ STYLE_OPTIONS.length }} 套风格，可随时切换
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.page {
  padding-top: var(--space-6);
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

.tier-option {
  min-width: 4.2em;
  justify-content: center;
}
.option:disabled,
.switch:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.tier-current {
  margin: var(--space-3) 0 0;
  font-size: var(--fs-xs);
  color: var(--text-3);
}
.tier-current strong {
  color: var(--accent-ink);
  font-family: var(--font-mono);
  letter-spacing: 0.04em;
}
.effects-hint {
  margin: var(--space-3) 0 0;
  padding: 10px 14px;
  border: 1px solid var(--accent-soft-2);
  background: var(--accent-soft);
  color: var(--text-2);
  font-size: var(--fs-xs);
  line-height: 1.65;
}
.device-details {
  margin-top: var(--space-4);
  font-size: var(--fs-xs);
  color: var(--text-2);
}
.device-details summary {
  cursor: pointer;
  color: var(--text-3);
  user-select: none;
}
.device-details summary:hover {
  color: var(--accent-ink);
}
.device-details ul {
  margin: var(--space-3) 0 0;
  padding-left: 1.1em;
  display: grid;
  gap: 4px;
}
.device-reasons {
  color: var(--text-3);
  font-family: var(--font-mono);
  font-size: 0.75rem;
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
.message {
  margin-top: var(--space-3);
  color: var(--success);
  font-size: var(--fs-sm);
  font-weight: 600;
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
