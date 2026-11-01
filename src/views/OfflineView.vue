<script setup lang="ts">
/**
 * 离线状态中心：把「PWA 到底缓存了什么、现在能不能离线用」讲清楚。
 *
 * 数据全部来自浏览器：Service Worker 注册状态、Cache Storage 条目、
 * storage.estimate() 配额，以及构建时生成的 version.json（判断是否落后一版）。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import AppIcon from '@/components/common/AppIcon.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import {
  checkForUpdate,
  clearAppCaches,
  readCacheReport,
  readLatestBuild,
  readServiceWorkerStatus,
  readStorageEstimate,
  type CacheReport,
  type ServiceWorkerStatus,
} from '@/utils/offline'
import { applyUpdate, updateState } from '@/utils/swUpdate'
import { formatBytes, formatRelative } from '@/utils/format'

const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine)
const sw = ref<ServiceWorkerStatus | null>(null)
const cache = ref<CacheReport | null>(null)
const storage = ref<{ usage: number; quota: number } | null>(null)
const latest = ref<{ buildId: string; builtAt: string; assets: number } | null>(null)
const loading = ref(true)
const busy = ref('')
const error = ref('')
const notice = ref('')
const checkedAt = ref(0)
const confirmClear = ref(false)

async function refresh(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    sw.value = await readServiceWorkerStatus()
    cache.value = await readCacheReport()
    storage.value = await readStorageEstimate()
    latest.value = await readLatestBuild()
    checkedAt.value = Date.now()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '读取离线状态失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void refresh()
  window.addEventListener('online', onNetwork)
  window.addEventListener('offline', onNetwork)
})

onBeforeUnmount(() => {
  window.removeEventListener('online', onNetwork)
  window.removeEventListener('offline', onNetwork)
})

function onNetwork(): void {
  online.value = navigator.onLine
  void refresh()
}

const updateReady = computed(() => Boolean(sw.value?.waiting) || updateState.available)
const latestVersion = computed(() => latest.value?.buildId ?? '')
const currentVersion = computed(() => sw.value?.version ?? '')
const behind = computed(
  () =>
    Boolean(latestVersion.value && currentVersion.value) &&
    latestVersion.value !== currentVersion.value,
)

type Tone = 'ok' | 'warn' | 'muted' | 'bad'
const status = computed<{
  tone: Tone
  title: string
  desc: string
  icon: 'wifi' | 'wifiOff' | 'sparkles'
}>(() => {
  if (!sw.value?.supported) {
    return {
      tone: 'bad',
      title: '当前浏览器不支持离线缓存',
      desc: '页面仍可正常浏览，只是断网后无法打开。建议使用较新的 Chrome / Edge / Safari。',
      icon: 'wifiOff',
    }
  }
  if (!online.value) {
    return {
      tone: 'warn',
      title: '当前离线',
      desc: cache.value
        ? '正在使用本地缓存浏览，页面与图片都能打开；视频仍需联网。'
        : '当前离线且没有可用缓存，页面可能无法加载。',
      icon: 'wifiOff',
    }
  }
  if (updateReady.value) {
    return {
      tone: 'warn',
      title: '有新版本待更新',
      desc: '新版本已经下载好并放在旁边，点「立即更新」后才会切换，不会打断正在看的内容。',
      icon: 'sparkles',
    }
  }
  if (!sw.value.registered) {
    return {
      tone: 'muted',
      title: '尚未注册离线缓存',
      desc: '首次访问或开发模式下不会注册 Service Worker；正式部署后刷新一次即可离线使用。',
      icon: 'wifi',
    }
  }
  if (!sw.value.controlled) {
    return {
      tone: 'muted',
      title: '缓存已注册，等待接管',
      desc: '刷新一次页面，当前页面就会由 Service Worker 接管，之后断网也能打开。',
      icon: 'wifi',
    }
  }
  return {
    tone: 'ok',
    title: '离线可用',
    desc: '页面骨架、脚本、样式与图片都已缓存；断网也能翻相册、读文章。',
    icon: 'wifi',
  }
})

const quotaPct = computed(() => {
  if (!storage.value || storage.value.quota <= 0) return 0
  return Math.min(100, Math.round((storage.value.usage / storage.value.quota) * 100))
})

const storageLabel = computed(() => {
  if (!storage.value) return '浏览器未提供配额信息'
  return `${formatBytes(storage.value.usage)} / ${formatBytes(storage.value.quota)}`
})

const storePctLabel = computed(() => (storage.value ? `${quotaPct.value}%` : '—'))

/** 版本行：开发模式或尚未注册时没有构建号，不要把「—」堆在正文里 */
const versionLine = computed(() => {
  if (!currentVersion.value && !latestVersion.value) {
    return sw.value?.registered ? '' : '开发模式：未注册 Service Worker，构建号不可用'
  }
  return ''
})

const updateLabel = computed(() => {
  if (updateReady.value) return '有新版本待更新'
  if (sw.value?.installing) return '正在下载新版本'
  if (!sw.value?.registered) return '未注册，无法判断'
  return '已是最新'
})

const cacheTypes = computed(() => {
  const types = cache.value?.types ?? []
  const max = Math.max(1, ...types.map((t) => t.count))
  return types.map((t) => ({ ...t, pct: Math.round((t.count / max) * 100) }))
})

async function checkUpdate(): Promise<void> {
  busy.value = 'check'
  notice.value = ''
  error.value = ''
  try {
    const result = await checkForUpdate()
    await refresh()
    if (result === 'unsupported') notice.value = '当前环境没有可用的 Service Worker'
    else if (result === 'available') notice.value = '发现新版本，可以点「立即更新」切换'
    else notice.value = '已是最新版本'
  } finally {
    busy.value = ''
  }
}

async function clearCache(): Promise<void> {
  busy.value = 'clear'
  notice.value = ''
  error.value = ''
  try {
    const names = await clearAppCaches()
    confirmClear.value = false
    await refresh()
    notice.value = names.length
      ? `已清理 ${names.length} 个缓存；下次联网访问会重新下载约 ${formatBytes(cache.value?.bytes ?? 0)}`
      : '当前没有可清理的缓存'
  } catch (e) {
    error.value = e instanceof Error ? e.message : '清理缓存失败'
  } finally {
    busy.value = ''
  }
}
</script>

<template>
  <div class="container page">
    <PageHeader
      kicker="Offline"
      title="离线状态"
      subtitle="看清 PWA 缓存了什么、版本是不是最新；断网时这里是最先该看的一页。"
    >
      <template #actions>
        <button class="btn btn--ghost" type="button" :disabled="loading" @click="refresh">
          <AppIcon name="history" :size="16" />
          {{ loading ? '检测中…' : '重新检测' }}
        </button>
      </template>
    </PageHeader>

    <!-- 状态总览 -->
    <section class="card status" :class="`status--${status.tone}`">
      <div class="status-icon" aria-hidden="true">
        <AppIcon :name="status.icon" :size="30" :stroke-width="1.5" />
      </div>
      <div class="status-body">
        <div class="status-line">
          <h2 class="status-title">{{ status.title }}</h2>
          <span class="net" :class="online ? 'net--on' : 'net--off'">
            <span class="net-dot" aria-hidden="true"></span>
            {{ online ? '在线' : '离线' }}
          </span>
        </div>
        <p class="status-desc">{{ status.desc }}</p>
        <p class="status-meta">
          <template v-if="versionLine">{{ versionLine }}</template>
          <template v-else>
            <span class="num">当前版本 {{ currentVersion || '—' }}</span>
            <span aria-hidden="true">·</span>
            <span class="num">最新版本 {{ latestVersion || '—' }}</span>
            <span v-if="behind" class="behind">落后一版</span>
          </template>
        </p>
      </div>
      <div class="status-actions">
        <button v-if="updateReady" class="btn" type="button" @click="applyUpdate">
          <AppIcon name="check" :size="16" :stroke-width="2.4" />
          立即更新
        </button>
        <button
          class="btn btn--soft"
          type="button"
          :disabled="busy === 'check'"
          @click="checkUpdate"
        >
          <AppIcon name="sparkles" :size="16" />
          {{ busy === 'check' ? '检查中…' : '检查更新' }}
        </button>
      </div>
    </section>

    <p v-if="error" class="msg msg--error" role="alert">{{ error }}</p>
    <p v-if="notice" class="msg msg--ok" role="status">{{ notice }}</p>

    <!-- 缓存与配额 -->
    <div class="grid">
      <section class="card panel" aria-labelledby="cache-title">
        <header class="panel-head">
          <h2 id="cache-title" class="panel-title">
            <AppIcon name="database" :size="17" :stroke-width="1.8" />
            缓存资源
          </h2>
          <span class="panel-note num">{{
            checkedAt ? formatRelative(new Date(checkedAt).toISOString()) : '—'
          }}</span>
        </header>

        <p class="big-num">
          <strong class="num">{{ cache?.entries ?? 0 }}</strong>
          <span>个资源 · {{ formatBytes(cache?.bytes ?? 0) }}</span>
        </p>

        <ul v-if="cacheTypes.length" class="type-list">
          <li v-for="t in cacheTypes" :key="t.key">
            <span class="type-label">{{ t.label }}</span>
            <span class="type-bar" aria-hidden="true">
              <i :style="{ width: `${t.pct}%` }"></i>
            </span>
            <span class="type-count num">{{ t.count }}</span>
          </li>
        </ul>
        <p v-else class="panel-empty">
          {{
            sw?.supported
              ? '还没有缓存内容（首次访问后刷新一次即可）'
              : '当前浏览器不支持 Cache Storage'
          }}
        </p>

        <p v-if="cache?.names.length" class="panel-foot num">
          缓存名：{{ cache.names.join(' / ') }}
        </p>
      </section>

      <section class="card panel" aria-labelledby="storage-title">
        <header class="panel-head">
          <h2 id="storage-title" class="panel-title">
            <AppIcon name="archive" :size="17" :stroke-width="1.8" />
            本地存储
          </h2>
          <span class="panel-note">站点配额</span>
        </header>

        <p class="big-num">
          <strong class="num">{{ storePctLabel }}</strong>
          <span>{{ storageLabel }}</span>
        </p>

        <div class="quota" role="img" :aria-label="`已用 ${quotaPct}%`">
          <span :style="{ width: `${quotaPct}%` }"></span>
        </div>
        <p class="quota-note">
          包含缓存、IndexedDB（备份快照 / 本地媒体）与
          localStorage；浏览器可能在空间紧张时清理缓存。
        </p>

        <dl class="meta-list">
          <div>
            <dt>Service Worker</dt>
            <dd>
              {{ sw?.registered ? '已注册' : '未注册' }} ·
              {{ sw?.controlled ? '已接管' : '未接管' }}
            </dd>
          </div>
          <div>
            <dt>作用域</dt>
            <dd class="num">{{ sw?.scope || '—' }}</dd>
          </div>
          <div>
            <dt>更新状态</dt>
            <dd>{{ updateLabel }}</dd>
          </div>
        </dl>
      </section>
    </div>

    <!-- 离线能力说明 -->
    <section class="section">
      <div class="card notes">
        <div class="note-block">
          <h2 class="note-title">
            <AppIcon name="checkCircle" :size="16" :stroke-width="2" class="ok" />
            断网也能用
          </h2>
          <ul class="note-list">
            <li>所有页面：首页 / 相册 / 视频 / 文章 / 关于 / 搜索 / 收藏 / 设置</li>
            <li>已缓存过的图片（相册封面、照片、轮播）</li>
            <li>收藏、观看进度、阅读位置与备份快照（都在本机）</li>
          </ul>
        </div>
        <div class="note-block">
          <h2 class="note-title">
            <AppIcon name="warning" :size="16" :stroke-width="2" class="warn" />
            仍然需要联网
          </h2>
          <ul class="note-list">
            <li>视频文件（体积大，刻意不进预缓存）</li>
            <li>外链视频、站外链接</li>
            <li>从未打开过的页面里的图片（首次访问时才缓存）</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- 清理缓存 -->
    <section class="section">
      <div class="card danger">
        <div class="danger-text">
          <strong>清理离线缓存</strong>
          <p>
            删掉 Cache Storage 里的资源（约
            {{ formatBytes(cache?.bytes ?? 0) }}），不会动收藏、进度与备份快照。
            清理后离线打开会失效，直到再次联网访问。
          </p>
        </div>
        <div class="danger-actions">
          <button
            v-if="!confirmClear"
            class="btn btn--danger"
            type="button"
            :disabled="!cache?.entries"
            @click="confirmClear = true"
          >
            清理缓存
          </button>
          <template v-else>
            <button
              class="btn btn--danger"
              type="button"
              :disabled="busy === 'clear'"
              @click="clearCache"
            >
              确认清理？
            </button>
            <button class="btn btn--ghost" type="button" @click="confirmClear = false">取消</button>
          </template>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ---------- 状态卡 ---------- */
.status {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-wrap: wrap;
  padding: clamp(18px, 3vw, 26px);
}
.status-icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: var(--surface-2);
  color: var(--text-2);
}
.status--ok .status-icon {
  color: var(--success);
  border-color: var(--success);
}
.status--warn .status-icon {
  color: var(--warning);
  border-color: var(--warning);
}
.status--bad .status-icon {
  color: var(--danger);
  border-color: var(--danger);
}
.status-body {
  flex: 1;
  min-width: 220px;
}
.status-line {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}
.status-title {
  font-size: var(--fs-xl);
}
.net {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 1px 9px;
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  font-size: var(--fs-2xs);
  font-weight: 700;
  color: var(--text-3);
}
.net-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-3);
}
.net--on {
  color: var(--success);
  border-color: var(--success);
}
.net--on .net-dot {
  background: var(--success);
}
.net--off {
  color: var(--warning);
  border-color: var(--warning);
}
.net--off .net-dot {
  background: var(--warning);
}
.status-desc {
  margin-top: 6px;
  max-width: 70ch;
  color: var(--text-2);
  font-size: var(--fs-sm);
  line-height: 1.75;
}
.status-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: var(--space-2);
  font-size: var(--fs-2xs);
  color: var(--text-3);
}
.behind {
  padding: 0 6px;
  border: 1px solid var(--warning);
  border-radius: var(--radius-xs);
  color: var(--warning);
  font-weight: 700;
}
.status-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
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

/* ---------- 两栏面板 ---------- */
.grid {
  display: grid;
  gap: var(--space-4);
  margin-top: var(--space-4);
}
@media (min-width: 900px) {
  .grid {
    grid-template-columns: 1fr 1fr;
    align-items: start;
  }
}
.panel {
  padding: clamp(16px, 2.6vw, 24px);
}
.panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.panel-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: var(--fs-md);
}
.panel-note {
  font-size: var(--fs-2xs);
  color: var(--text-3);
}
.big-num {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin: var(--space-4) 0 var(--space-3);
}
.big-num strong {
  font-family: var(--font-display);
  font-size: clamp(1.7rem, 3vw, 2.2rem);
  font-weight: var(--display-weight);
  line-height: 1;
}
.big-num span {
  font-size: var(--fs-xs);
  color: var(--text-3);
}
.type-list {
  display: grid;
  gap: 6px;
}
.type-list li {
  display: grid;
  grid-template-columns: 44px 1fr 40px;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--fs-2xs);
  color: var(--text-2);
}
.type-bar {
  height: 6px;
  border-radius: var(--radius-pill);
  background: var(--bg-soft);
  overflow: hidden;
}
.type-bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
}
.type-count {
  text-align: right;
  color: var(--text-3);
}
.panel-empty {
  margin-top: var(--space-3);
  font-size: var(--fs-sm);
  color: var(--text-3);
}
.panel-foot {
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--line);
  font-size: 0.68rem;
  color: var(--text-4);
  word-break: break-all;
}

.quota {
  height: 8px;
  border-radius: var(--radius-pill);
  background: var(--bg-soft);
  overflow: hidden;
}
.quota span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
}
.quota-note {
  margin-top: var(--space-2);
  font-size: var(--fs-2xs);
  color: var(--text-3);
  line-height: 1.7;
}
.meta-list {
  display: grid;
  gap: 0;
  margin: var(--space-4) 0 0;
  border-top: 1px solid var(--line);
}
.meta-list > div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--line);
}
.meta-list dt {
  font-size: var(--fs-2xs);
  color: var(--text-3);
  letter-spacing: 0.5px;
}
.meta-list dd {
  margin: 0;
  font-size: var(--fs-xs);
  color: var(--text-2);
  text-align: right;
  word-break: break-all;
}

/* ---------- 说明 ---------- */
.notes {
  display: grid;
  gap: var(--space-4);
  padding: clamp(18px, 3vw, 26px);
}
@media (min-width: 860px) {
  .notes {
    grid-template-columns: 1fr 1fr;
    gap: var(--space-6);
  }
}
.note-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: var(--fs-md);
  margin-bottom: var(--space-2);
}
.note-title :deep(.app-icon) {
  flex: none;
}
.ok {
  color: var(--success);
}
.warn {
  color: var(--warning);
}
.note-list {
  display: grid;
  gap: 6px;
  padding-left: 1.1em;
  list-style: disc;
  color: var(--text-2);
  font-size: var(--fs-sm);
  line-height: 1.75;
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
  max-width: 72ch;
  font-size: var(--fs-sm);
  color: var(--text-2);
}
.danger-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

/* ---------- 风格差异 ---------- */
[data-style='brutal'] .status-icon,
[data-style='brutal'] .net,
[data-style='brutal'] .type-bar,
[data-style='brutal'] .quota {
  border-radius: 0;
}
[data-style='brutal'] .status,
[data-style='brutal'] .danger {
  border-width: 3px;
}
[data-style='brutal'] .status-icon {
  border-width: 3px;
}
[data-style='japandi'] .status-icon {
  border: none;
  background: var(--bg-soft);
}
[data-style='japandi'] .net {
  border: none;
  background: var(--bg-soft);
}
</style>
