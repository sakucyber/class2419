<script setup lang="ts">
import { ref } from 'vue'

import AppIcon from '@/components/common/AppIcon.vue'
import InstallGuide from '@/components/common/InstallGuide.vue'
import type { IconName } from '@/components/common/icons'
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

/** 特效等级选项。auto = 交给设备探测，其余为手动锁定 */
const tiers: { key: TierPreference; label: string; desc: string }[] = [
  { key: 'auto', label: '自动', desc: '按设备能力自动选择' },
  { key: 'L2', label: '高', desc: '3D 徽章 + 全部特效' },
  { key: 'L1', label: '中', desc: '轻量动效，不含 3D' },
  { key: 'L0', label: '低', desc: '仅静态，最省电' },
]

/** aria-live 播报：切换后念一句当前状态，供读屏用户确认 */
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

/* ── 安装到桌面 ──
 * 支持才显示（不支持的环境整块隐藏）；已安装则显示状态而不是按钮。
 * iOS 没有 beforeinstallprompt，会返回 manual-ios → 弹图文指引。 */
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

/* ── 备份导出 / 导入 ──
 * 数据只存在这个浏览器里，清缓存 = 全丢，所以必须给用户一个带走它的方式。
 * 导出内容 = 本地内容（相册/视频/文章/公告）+ 互动数据（收藏/视频进度/阅读位置/打卡）。
 * 导入是**合并**：同 id 覆盖，不删除现有内容；旧版（v1）备份没有 interaction 字段也能导入。 */
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
  input.value = '' // 允许连续导入同一个文件
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

    <!-- 特效与性能 -->
    <section class="card block" aria-labelledby="effects-title">
      <h2 id="effects-title">特效与性能</h2>
      <p class="block-desc">
        等级越高画面越丰富，对设备要求也越高。选「自动」会按 CPU、内存、显卡能力自行判断；
        手动选择后会被记住，优先于自动检测。
      </p>

      <h3 class="sub-title">特效等级</h3>
      <div class="option-row" role="radiogroup" aria-label="特效等级">
        <button
          v-for="t in tiers"
          :key="t.key"
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

    <!-- 安装到桌面（不支持 PWA 的环境整块隐藏） -->
    <section
      v-if="pwaState.installed || canInstall()"
      class="card block"
      aria-labelledby="install-title"
    >
      <h2 id="install-title">安装到桌面</h2>
      <p class="block-desc">
        装到桌面后可以全屏打开，像 App 一样顺手；打开过一次后，页面和相册图片会缓存到本地，
        断网也能翻（视频体积大，不缓存，仍需联网）。
      </p>

      <div class="install-row">
        <span v-if="pwaState.installed" class="install-state">
          <AppIcon name="check" :size="15" :stroke-width="2.8" />
          已安装
        </span>
        <button v-else class="install-btn" type="button" @click="onInstall">
          <AppIcon name="plus" :size="15" :stroke-width="2.4" />
          添加到主屏幕
        </button>
      </div>

      <p class="visually-hidden" aria-live="polite">{{ installNotice }}</p>

      <InstallGuide :open="guideOpen" :variant="guideVariant" @close="guideOpen = false" />
    </section>

    <!-- 数据 -->
    <section class="card block" aria-labelledby="data-title">
      <h2 id="data-title">数据管理</h2>
      <p class="block-desc">
        本站在浏览器本地（localStorage / IndexedDB）保存你的收藏、观看进度与阅读位置。
        清除浏览器数据会导致这些内容全部丢失，建议定期「导出备份」（一个 JSON 文件）。
        导入会与现有数据合并，同 id 覆盖；旧版备份也兼容。
      </p>
      <div class="btn-row">
        <button class="btn btn--soft" @click="exportBackup">
          <AppIcon name="download" :size="16" />
          导出备份
        </button>
        <button class="btn btn--soft" @click="pickBackup">
          <AppIcon name="upload" :size="16" />
          导入备份
        </button>
        <button class="btn btn--danger" :disabled="confirmReset" @click="confirmReset = true">
          重置全部本地数据
        </button>
        <template v-if="confirmReset">
          <button class="btn btn--danger" @click="doReset">确认重置？</button>
          <button class="btn btn--ghost" @click="confirmReset = false">取消</button>
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
/* 开关：40×22 + 16px 旋钮。原来的 46×26 在这页偏大偏重，
   关态用带描边的浅底 + 灰色旋钮，开态才上主色，视觉重量更轻。 */
.switch {
  appearance: none;
  width: 40px;
  height: 22px;
  border-radius: var(--radius-full);
  background: var(--bg-soft);
  border: 1px solid var(--border-strong);
  position: relative;
  cursor: pointer;
  flex: none;
  transition:
    background var(--duration-fast) var(--ease),
    border-color var(--duration-fast) var(--ease);
}
.switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: var(--radius-full);
  background: var(--text-3);
  transition:
    transform var(--duration-fast) var(--ease-spring),
    background var(--duration-fast) var(--ease);
}
.switch:checked {
  background: var(--primary);
  border-color: var(--primary);
}
.switch:checked::after {
  transform: translateX(18px);
  background: #fff;
}
.switch:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 3px;
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

/* ── 特效与性能 ── */
.tier-option {
  min-width: 4.2em;
  justify-content: center;
}
.tier-option:disabled,
.switch:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.tier-option:disabled {
  pointer-events: none;
}
.tier-current {
  margin: var(--space-3) 0 0;
  font-size: 0.86rem;
  color: var(--text-3);
}
.tier-current strong {
  color: var(--primary);
  font-family: var(--font-mono);
  letter-spacing: 0.04em;
}
.effects-hint {
  margin: var(--space-3) 0 0;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--primary-soft-2);
  background: var(--primary-soft);
  color: var(--text-2);
  font-size: 0.86rem;
  line-height: 1.6;
}
.device-details {
  margin-top: var(--space-4);
  font-size: 0.86rem;
  color: var(--text-2);
}
.device-details summary {
  cursor: pointer;
  color: var(--text-3);
  user-select: none;
}
.device-details summary:hover {
  color: var(--primary);
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
  font-size: 0.8rem;
}

/* ── 安装到桌面 ── */
.install-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.install-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  border: none;
  border-radius: var(--radius-full);
  background: var(--primary);
  color: var(--primary-contrast);
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: background var(--duration) var(--ease);
}
.install-btn:hover {
  background: var(--primary-hover);
}
.install-btn:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 3px;
}
.install-state {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border);
  color: var(--text-2);
  font-size: 0.88rem;
}
</style>
