<script setup lang="ts">
/**
 * 备份中心：完整备份 / 导入预检 / 历史版本。
 *
 * 页面只做三件事：把当前规模讲清楚、把「这份备份里有什么」摆出来、把危险动作
 * 收在最后。所有写操作都在 `useBackupCenter` 里，且覆盖/清空前会自动留底。
 */
import { computed, nextTick, onMounted, ref } from 'vue'

import AppIcon from '@/components/common/AppIcon.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import SectionHeader from '@/components/common/SectionHeader.vue'
import type { IconName } from '@/components/common/icons'
import { KIND_LABEL, useBackupCenter } from '@/composables/useBackupCenter'
import { useContentStore } from '@/store/content'
import { useInteractionStore } from '@/store/interaction'
import type { BackupInspection } from '@/utils/backup'
import { MAX_SNAPSHOTS, type SnapshotMeta } from '@/utils/backupStore'
import { formatBytes, formatDate, formatRelative } from '@/utils/format'

const content = useContentStore()
const interaction = useInteractionStore()
const {
  snapshots,
  latest,
  busy,
  error,
  notice,
  storage,
  refresh,
  createSnapshot,
  exportCurrent,
  inspectSnapshot,
  downloadSnapshot,
  removeSnapshot,
  inspectFile,
  restore,
  resetEverything,
} = useBackupCenter()

const fileInput = ref<HTMLInputElement | null>(null)
const previewEl = ref<HTMLElement | null>(null)
const inspection = ref<BackupInspection | null>(null)
const inspectionSource = ref('')
const mode = ref<'merge' | 'replace'>('merge')
const confirmReset = ref(false)

onMounted(refresh)

const favoriteCount = computed(() => Object.values(interaction.favorites).filter(Boolean).length)

/** 首页概览：讲清「现在有多少东西可备份」 */
const stats = computed(() => {
  const photos = content.publicAlbums.reduce((sum, a) => sum + a.photos.length, 0)
  return [
    { label: '相册', value: content.publicAlbums.length },
    { label: '照片', value: photos },
    { label: '视频', value: content.publicVideos.length },
    { label: '文章', value: content.publicArticles.length },
    { label: '公告', value: content.publicAnnouncements.length },
    { label: '收藏', value: favoriteCount.value },
  ]
})

/** 本机新增/修改的数据 —— 这才是备份文件里实际包含的东西 */
const local = computed(() => {
  const owned = <T extends { source: string }>(list: T[]) =>
    list.filter((item) => item.source === 'user').length
  return {
    content:
      owned(content.albums) +
      owned(content.videos) +
      owned(content.articles) +
      owned(content.announcements),
    favorites: favoriteCount.value,
    progress: Object.keys(interaction.videoProgress).length,
    scroll: Object.keys(interaction.articleScroll).length,
    checkin: interaction.checkin.total,
  }
})

const storageLabel = computed(() => {
  if (!storage.value) return '—'
  const { usage, quota } = storage.value
  const pct = quota > 0 ? Math.min(100, Math.round((usage / quota) * 100)) : 0
  return `${formatBytes(usage)} / ${formatBytes(quota)}（${pct}%）`
})

const lastBackupLabel = computed(() =>
  latest.value
    ? `${formatRelative(latest.value.createdAt)} · ${formatBytes(latest.value.bytes)}`
    : '还没有快照',
)

const previewStats = computed(() => {
  const s = inspection.value?.summary
  if (!s) return []
  return [
    { label: '相册', value: s.albums },
    { label: '照片', value: s.photos },
    { label: '视频', value: s.videos },
    { label: '文章', value: s.articles },
    { label: '公告', value: s.announcements },
    { label: '收藏', value: s.favorites },
  ]
})

/** 备份里没有任何本机内容（只有互动/外观），单独提示，避免六个 0 看着像加载失败 */
const previewEmpty = computed(() => {
  const summary = inspection.value?.summary
  if (!summary) return false
  return summary.albums + summary.videos + summary.articles + summary.announcements === 0
})

const checksum = computed<{ tone: 'ok' | 'bad' | 'none'; text: string; icon: IconName }>(() => {
  const result = inspection.value?.checksum
  if (!result || result.ok === null) return { tone: 'none', text: '未声明校验和', icon: 'warning' }
  if (result.ok) return { tone: 'ok', text: '校验通过', icon: 'checkCircle' }
  return { tone: 'bad', text: '校验和不匹配', icon: 'warning' }
})

function pickFile(): void {
  fileInput.value?.click()
}

async function onFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const result = await inspectFile(file)
  if (!result) return
  inspection.value = result
  inspectionSource.value = file.name
  mode.value = 'merge'
  await scrollToPreview()
}

async function previewSnapshot(meta: SnapshotMeta): Promise<void> {
  const result = await inspectSnapshot(meta.id)
  if (!result) return
  inspection.value = result
  inspectionSource.value = meta.label
  mode.value = 'merge'
  await scrollToPreview()
}

async function scrollToPreview(): Promise<void> {
  await nextTick()
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  previewEl.value?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}

async function applyRestore(): Promise<void> {
  if (!inspection.value) return
  const ok = await restore(inspection.value, mode.value)
  if (ok) inspection.value = null
}

async function doReset(): Promise<void> {
  await resetEverything()
  confirmReset.value = false
}
</script>

<template>
  <div class="container page">
    <PageHeader
      kicker="Backup"
      title="备份中心"
      subtitle="内容、收藏/进度与外观设置打包成一份 JSON；恢复前先预览，误操作也能退回上一版。"
    >
      <template #actions>
        <button class="btn" type="button" :disabled="busy === 'export'" @click="exportCurrent">
          <AppIcon name="download" :size="16" />
          导出完整备份
        </button>
        <button
          class="btn btn--ghost"
          type="button"
          :disabled="!!busy"
          @click="createSnapshot('manual')"
        >
          <AppIcon name="archive" :size="16" />
          立即创建快照
        </button>
      </template>
    </PageHeader>

    <!-- 当前规模 -->
    <section class="card overview" aria-labelledby="overview-title">
      <div class="overview-head">
        <h2 id="overview-title" class="overview-title">站内内容</h2>
        <span class="overview-note">随站点一起发布，不需要备份</span>
      </div>
      <ul class="stat-grid">
        <li v-for="item in stats" :key="item.label" class="stat">
          <strong class="num">{{ item.value }}</strong>
          <span>{{ item.label }}</span>
        </li>
      </ul>
      <div class="local-row">
        <span class="local-label">
          <AppIcon name="database" :size="14" :stroke-width="1.9" />
          本机数据
        </span>
        <span class="local-item"
          >新增/修改内容 <b class="num">{{ local.content }}</b> 项</span
        >
        <span class="local-item"
          >收藏 <b class="num">{{ local.favorites }}</b></span
        >
        <span class="local-item"
          >观看进度 <b class="num">{{ local.progress }}</b></span
        >
        <span class="local-item"
          >阅读位置 <b class="num">{{ local.scroll }}</b></span
        >
        <span class="local-item"
          >打卡 <b class="num">{{ local.checkin }}</b> 天</span
        >
      </div>

      <dl class="overview-meta">
        <div>
          <dt>上次快照</dt>
          <dd>{{ lastBackupLabel }}</dd>
        </div>
        <div>
          <dt>本地占用</dt>
          <dd class="num">{{ storageLabel }}</dd>
        </div>
        <div>
          <dt>历史版本</dt>
          <dd class="num">{{ snapshots.length }} / {{ MAX_SNAPSHOTS }}</dd>
        </div>
      </dl>
      <p class="overview-hint">
        <AppIcon name="lock" :size="14" :stroke-width="1.9" />
        全程不联网。备份文件包含上面「本机数据」与外观设置；内置内容随站点发布，因此不会重复打包。
      </p>
    </section>

    <!-- 导入与预览 -->
    <section class="section">
      <SectionHeader
        tag="Restore"
        title="导入与恢复"
        subtitle="先看预览：恢复多少条、校验和是否对得上、哪些东西会丢"
        :linkable="false"
      />

      <div class="card import-card">
        <div class="import-row">
          <button class="btn btn--soft" type="button" @click="pickFile">
            <AppIcon name="upload" :size="16" />
            选择备份文件
          </button>
          <span class="import-hint">支持 v1 / v2 / v3 的 JSON；旧备份只恢复它包含的部分</span>
        </div>
        <input
          ref="fileInput"
          class="visually-hidden"
          type="file"
          accept="application/json,.json"
          aria-label="选择备份文件"
          @change="onFile"
        />

        <p v-if="error" class="msg msg--error" role="alert">{{ error }}</p>
        <p v-if="notice" class="msg msg--ok" role="status">{{ notice }}</p>

        <div v-if="!inspection" class="drop-hint">
          <AppIcon name="inbox" :size="22" :stroke-width="1.4" />
          <p>还没有选择文件。也可以从下面的历史版本里挑一份预览。</p>
        </div>

        <div v-else ref="previewEl" class="preview">
          <header class="preview-head">
            <div class="preview-title">
              <p class="kicker">Restore preview</p>
              <h3>{{ inspectionSource }}</h3>
              <p class="preview-sub num">
                v{{ inspection.version }} · 导出于 {{ formatDate(inspection.exportedAt, true) }} ·
                {{ formatBytes(inspection.bytes) }}
              </p>
            </div>
            <span class="checksum" :class="`checksum--${checksum.tone}`">
              <AppIcon :name="checksum.icon" :size="14" :stroke-width="2" />
              {{ checksum.text }}
            </span>
          </header>

          <template v-if="!previewEmpty">
            <ul class="preview-stats">
              <li v-for="item in previewStats" :key="item.label">
                <strong class="num">{{ item.value }}</strong>
                <span>{{ item.label }}</span>
              </li>
            </ul>
            <p class="preview-scope">
              以上仅统计备份里的本机内容；内置内容随站点发布，恢复后本来就在。
            </p>
          </template>
          <p v-if="previewEmpty" class="preview-empty">
            <AppIcon name="inbox" :size="15" :stroke-width="1.8" />
            这份备份没有本机新增或修改的内容（内置内容不在备份里），恢复只会应用互动数据与外观设置。
          </p>

          <ul v-if="inspection.warnings.length" class="warn-list">
            <li v-for="w in inspection.warnings" :key="w">
              <AppIcon name="warning" :size="14" :stroke-width="1.9" />
              {{ w }}
            </li>
          </ul>

          <div class="mode-row" role="radiogroup" aria-label="恢复方式">
            <button
              type="button"
              class="mode"
              :class="{ active: mode === 'merge' }"
              role="radio"
              :aria-checked="mode === 'merge'"
              @click="mode = 'merge'"
            >
              <strong>合并（推荐）</strong>
              <small>同 id 以备份为准，其余内容保留；收藏取并集、进度取较新</small>
            </button>
            <button
              type="button"
              class="mode mode--danger"
              :class="{ active: mode === 'replace' }"
              role="radio"
              :aria-checked="mode === 'replace'"
              @click="mode = 'replace'"
            >
              <strong>覆盖</strong>
              <small>用备份整份替换本地内容与互动数据，未备份的改动会丢失</small>
            </button>
          </div>

          <p class="mode-note">
            <AppIcon name="history" :size="14" :stroke-width="1.9" />
            开始前会自动创建一份「恢复前」快照，随时可以退回来。
          </p>

          <div class="preview-actions">
            <button class="btn" type="button" :disabled="!!busy" @click="applyRestore">
              <AppIcon name="check" :size="16" :stroke-width="2.4" />
              开始恢复
            </button>
            <button class="btn btn--ghost" type="button" @click="inspection = null">取消</button>
          </div>
        </div>
      </div>
    </section>

    <!-- 历史版本 -->
    <section class="section">
      <SectionHeader
        tag="History"
        title="历史版本"
        :subtitle="`保留最近 ${MAX_SNAPSHOTS} 份；恢复与清空前会自动留底，超出上限时清理最旧的`"
        :linkable="false"
      />

      <EmptyState
        v-if="!snapshots.length"
        icon="archive"
        title="还没有历史版本"
        description="点右上角「立即创建快照」，或直接导出备份；之后恢复/清空时会自动留底。"
      />

      <ul v-else class="snap-list">
        <li v-for="meta in snapshots" :key="meta.id" class="snap card">
          <div class="snap-main">
            <div class="snap-title">
              <span class="snap-kind" :class="`snap-kind--${meta.kind}`">{{
                KIND_LABEL[meta.kind]
              }}</span>
              <strong>{{ meta.label }}</strong>
            </div>
            <p class="snap-meta">
              <time class="num" :datetime="meta.createdAt">{{
                formatDate(meta.createdAt, true)
              }}</time>
              <span aria-hidden="true">·</span>
              <span class="num">{{ formatBytes(meta.bytes) }}</span>
              <span aria-hidden="true">·</span>
              <span class="num">
                本地：相册 {{ meta.summary.albums }} / 照片 {{ meta.summary.photos }} / 视频
                {{ meta.summary.videos }} / 文章 {{ meta.summary.articles }} / 收藏
                {{ meta.summary.favorites }}
              </span>
            </p>
          </div>
          <div class="snap-actions">
            <button class="action-btn" type="button" @click="previewSnapshot(meta)">
              <AppIcon name="eye" :size="15" />
              预览
            </button>
            <button class="action-btn" type="button" @click="downloadSnapshot(meta.id)">
              <AppIcon name="download" :size="15" />
              下载
            </button>
            <button
              class="action-btn action-btn--danger"
              type="button"
              @click="removeSnapshot(meta.id)"
            >
              <AppIcon name="trash" :size="15" />
              删除
            </button>
          </div>
        </li>
      </ul>
    </section>

    <!-- 危险操作 -->
    <section class="section">
      <SectionHeader
        tag="Danger"
        title="清空本地数据"
        subtitle="回到「只有内置内容」的状态；外观设置保留，历史版本不受影响"
        :linkable="false"
      />
      <div class="card danger">
        <div class="danger-text">
          <strong>重置本地内容与互动数据</strong>
          <p>适用于导入出错、或想丢掉所有本地改动时。清空前会自动创建一份快照。</p>
        </div>
        <div class="danger-actions">
          <button
            v-if="!confirmReset"
            class="btn btn--danger"
            type="button"
            @click="confirmReset = true"
          >
            清空本地数据
          </button>
          <template v-else>
            <button class="btn btn--danger" type="button" :disabled="!!busy" @click="doReset">
              确认清空？
            </button>
            <button class="btn btn--ghost" type="button" @click="confirmReset = false">取消</button>
          </template>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ---------- 概览 ---------- */
.overview {
  padding: clamp(18px, 3vw, 26px);
}
.overview-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-4);
}
.overview-title {
  font-size: var(--fs-lg);
}
.overview-note {
  font-size: var(--fs-2xs);
  color: var(--text-3);
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
}
@media (min-width: 720px) {
  .stat-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}
.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-3);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
}
.stat strong {
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: var(--display-weight);
  line-height: 1.15;
}
.stat span {
  font-size: var(--fs-2xs);
  color: var(--text-3);
  letter-spacing: 0.5px;
}
.local-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-4);
  margin-top: var(--space-3);
  padding: var(--space-3);
  border: 1px dashed var(--line-2);
  border-radius: var(--radius-sm);
  font-size: var(--fs-xs);
  color: var(--text-2);
}
.local-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 700;
  color: var(--text);
}
.local-item b {
  color: var(--accent-ink);
  font-weight: 700;
}
.preview-scope {
  margin-top: var(--space-2);
  font-size: var(--fs-2xs);
  color: var(--text-3);
}
.preview-empty {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin-top: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--line);
  border-radius: var(--radius-xs);
  background: var(--bg-soft);
  font-size: var(--fs-xs);
  color: var(--text-2);
  line-height: 1.6;
}
.preview-empty :deep(.app-icon) {
  flex: none;
  margin-top: 2px;
  color: var(--text-3);
}
.overview-meta {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-3);
  margin: var(--space-4) 0 0;
  padding-top: var(--space-4);
  border-top: 1px solid var(--line);
}
@media (min-width: 720px) {
  .overview-meta {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
.overview-meta dt {
  font-size: var(--fs-2xs);
  letter-spacing: 1px;
  color: var(--text-3);
}
.overview-meta dd {
  margin: 4px 0 0;
  font-size: var(--fs-sm);
  color: var(--text);
  font-weight: 600;
}
.overview-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: var(--space-4);
  font-size: var(--fs-2xs);
  color: var(--text-3);
}

/* ---------- 导入 ---------- */
.import-card {
  padding: clamp(16px, 2.6vw, 24px);
}
.import-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}
.import-hint {
  font-size: var(--fs-2xs);
  color: var(--text-3);
}
.msg {
  margin-top: var(--space-3);
  font-size: var(--fs-sm);
  font-weight: 600;
}
.msg--ok {
  color: var(--success);
}
.msg--error {
  color: var(--danger);
}
.drop-hint {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-4);
  padding: var(--space-4);
  border: 1px dashed var(--line-2);
  border-radius: var(--radius-sm);
  color: var(--text-3);
  font-size: var(--fs-sm);
}

.preview {
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--line);
  scroll-margin-top: calc(var(--header-h) + 16px);
}
.preview-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}
.preview-title h3 {
  margin: 2px 0 4px;
  font-size: var(--fs-lg);
  word-break: break-all;
}
.preview-sub {
  font-size: var(--fs-2xs);
  color: var(--text-3);
}
.checksum {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  font-size: var(--fs-2xs);
  font-weight: 700;
}
.checksum--ok {
  color: var(--success);
  border-color: var(--success);
  background: var(--surface-2);
}
.checksum--bad {
  color: var(--danger);
  border-color: var(--danger);
  background: var(--surface-2);
}
.checksum--none {
  color: var(--text-3);
}

.preview-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);
  margin-top: var(--space-4);
}
@media (min-width: 720px) {
  .preview-stats {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}
.preview-stats li {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--line);
  border-radius: var(--radius-xs);
}
.preview-stats strong {
  font-family: var(--font-display);
  font-size: 1.32rem;
  line-height: 1.2;
}
.preview-stats span {
  font-size: var(--fs-2xs);
  color: var(--text-3);
}

.warn-list {
  display: grid;
  gap: 6px;
  margin-top: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--line);
  border-left: 3px solid var(--warning);
  border-radius: var(--radius-xs);
  background: var(--bg-soft);
}
.warn-list li {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: var(--fs-xs);
  color: var(--text-2);
  line-height: 1.6;
}
.warn-list :deep(.app-icon) {
  margin-top: 2px;
  color: var(--warning);
}

.mode-row {
  display: grid;
  gap: var(--space-2);
  margin-top: var(--space-4);
}
@media (min-width: 720px) {
  .mode-row {
    grid-template-columns: 1fr 1fr;
  }
}
.mode {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--space-3) var(--space-4);
  border: var(--card-bd-w) solid var(--line);
  border-radius: var(--radius-sm);
  background: transparent;
  text-align: left;
  color: var(--text-2);
  transition:
    border-color var(--dur-fast) var(--ease),
    background-color var(--dur-fast) var(--ease);
}
.mode:hover {
  border-color: var(--line-hover);
}
.mode strong {
  font-size: var(--fs-sm);
  color: var(--text);
}
.mode small {
  font-size: var(--fs-2xs);
  line-height: 1.6;
}
.mode.active {
  border-color: var(--accent-ink);
  background: var(--accent-soft);
}
.mode.active strong {
  color: var(--accent-ink);
}
.mode--danger.active {
  border-color: var(--danger);
  background: var(--surface-2);
}
.mode--danger.active strong {
  color: var(--danger);
}

.mode-note {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: var(--space-3);
  font-size: var(--fs-2xs);
  color: var(--text-3);
}
.preview-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-4);
}

/* ---------- 历史版本 ---------- */
.snap-list {
  display: grid;
  gap: var(--space-3);
}
.snap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
  padding: var(--space-3) var(--space-4);
}
.snap-main {
  min-width: 0;
}
.snap-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.snap-title strong {
  font-family: var(--font-display);
  font-size: var(--fs-md);
  font-weight: var(--display-weight);
}
.snap-kind {
  flex: none;
  padding: 1px 7px;
  border: 1px solid var(--line-2);
  border-radius: var(--radius-xs);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: var(--text-3);
}
.snap-kind--auto {
  color: var(--accent-ink);
  border-color: var(--accent-soft-2);
  background: var(--accent-soft);
}
.snap-kind--reset {
  color: var(--warning);
  border-color: var(--warning);
}
.snap-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: var(--fs-2xs);
  color: var(--text-3);
}
.snap-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.action-btn--danger:hover {
  color: var(--danger);
  border-color: var(--danger);
  background: transparent;
}

/* ---------- 危险区 ---------- */
.danger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
  padding: clamp(16px, 2.6vw, 24px);
  border-color: var(--danger);
}
.danger-text strong {
  font-family: var(--font-display);
  font-size: var(--fs-md);
  font-weight: var(--display-weight);
}
.danger-text p {
  margin-top: 4px;
  max-width: 60ch;
  font-size: var(--fs-sm);
  color: var(--text-2);
}
.danger-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

/* ---------- 风格差异 ---------- */
[data-style='annual'] .preview-title h3 {
  font-family: var(--font-serif);
  font-weight: 600;
}
[data-style='brutal'] .stat,
[data-style='brutal'] .preview-stats li,
[data-style='brutal'] .mode,
[data-style='brutal'] .snap-kind {
  border-width: 3px;
  border-color: var(--line);
  border-radius: 0;
}
[data-style='brutal'] .checksum {
  border-width: 3px;
  border-radius: 0;
  color: var(--text);
}
[data-style='brutal'] .snap {
  border-width: 3px;
}
[data-style='brutal'] .danger {
  border-width: 3px;
  border-color: var(--danger);
}
[data-style='japandi'] .stat,
[data-style='japandi'] .preview-stats li {
  border-color: transparent;
  background: var(--bg-soft);
}
[data-style='japandi'] .mode {
  border-radius: var(--radius-lg);
  border-color: transparent;
  background: var(--bg-soft);
}
[data-style='japandi'] .checksum {
  border: none;
  background: var(--bg-soft);
}
</style>
