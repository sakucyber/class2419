<script setup lang="ts">
import { computed, ref } from 'vue'

import AnnouncementForm from '@/components/admin/AnnouncementForm.vue'
import ArticleForm from '@/components/admin/ArticleForm.vue'
import AlbumForm from '@/components/admin/AlbumForm.vue'
import VideoForm from '@/components/admin/VideoForm.vue'
import { DEMO_PASSWORD, useAuthStore } from '@/store/auth'
import { useContentStore } from '@/store/content'
import type { Album, Announcement, Article, VideoItem } from '@/types'
import { formatDate } from '@/utils/format'

const auth = useAuthStore()
const content = useContentStore()

// ---- 登录 ----
const password = ref('')
const loginError = ref('')

function login() {
  if (auth.login(password.value.trim())) {
    password.value = ''
    loginError.value = ''
  } else {
    loginError.value = '密码不正确（演示密码：2419）'
  }
}

// ---- 标签页 ----
type Tab = 'albums' | 'videos' | 'articles' | 'announcements' | 'data'
const tab = ref<Tab>('albums')
const tabs: { key: Tab; label: string }[] = [
  { key: 'albums', label: '相册' },
  { key: 'videos', label: '视频' },
  { key: 'articles', label: '文章' },
  { key: 'announcements', label: '公告' },
  { key: 'data', label: '数据' },
]

// ---- 编辑状态 ----
const editingAlbum = ref<Album | null>(null)
const creatingAlbum = ref(false)
const editingVideo = ref<VideoItem | null>(null)
const creatingVideo = ref(false)
const editingArticle = ref<Article | null>(null)
const creatingArticle = ref(false)
const editingAnnouncement = ref<Announcement | null>(null)
const creatingAnnouncement = ref(false)
const message = ref('')
const errorMsg = ref('')

function notify(text: string, isError = false) {
  errorMsg.value = isError ? text : ''
  message.value = isError ? '' : text
  window.setTimeout(() => {
    message.value = ''
    errorMsg.value = ''
  }, 3200)
}

function cancelAlbumEdit() {
  creatingAlbum.value = false
  editingAlbum.value = null
}
function cancelVideoEdit() {
  creatingVideo.value = false
  editingVideo.value = null
}
function cancelArticleEdit() {
  creatingArticle.value = false
  editingArticle.value = null
}
function cancelAnnouncementEdit() {
  creatingAnnouncement.value = false
  editingAnnouncement.value = null
}

function startEditAlbum(a: Album) {
  editingAlbum.value = a
  creatingAlbum.value = false
}
function startEditVideo(v: VideoItem) {
  editingVideo.value = v
  creatingVideo.value = false
}
function startEditArticle(a: Article) {
  editingArticle.value = a
  creatingArticle.value = false
}
function startEditAnnouncement(n: Announcement) {
  editingAnnouncement.value = n
  creatingAnnouncement.value = false
}

// ---- 相册 ----
async function saveAlbum(album: Album) {
  try {
    await content.saveAlbum(album)
    creatingAlbum.value = false
    editingAlbum.value = null
    notify('相册已保存')
  } catch (e) {
    notify(e instanceof Error ? e.message : '保存失败', true)
  }
}
async function deleteAlbum(id: string) {
  if (!confirm('确定删除这个相册吗？此操作不可撤销。')) return
  try {
    await content.removeAlbum(id)
    notify('相册已删除')
  } catch (e) {
    notify(e instanceof Error ? e.message : '删除失败', true)
  }
}

// ---- 视频 ----
async function saveVideo(video: VideoItem) {
  try {
    await content.saveVideo(video)
    creatingVideo.value = false
    editingVideo.value = null
    notify('视频已保存')
  } catch (e) {
    notify(e instanceof Error ? e.message : '保存失败', true)
  }
}
async function deleteVideo(id: string) {
  if (!confirm('确定删除这个视频吗？相关本地文件也会被清除。')) return
  try {
    await content.removeVideo(id)
    notify('视频已删除')
  } catch (e) {
    notify(e instanceof Error ? e.message : '删除失败', true)
  }
}

// ---- 文章 ----
async function saveArticle(article: Article) {
  try {
    await content.saveArticle(article)
    creatingArticle.value = false
    editingArticle.value = null
    notify('文章已保存')
  } catch (e) {
    notify(e instanceof Error ? e.message : '保存失败', true)
  }
}
async function deleteArticle(id: string) {
  if (!confirm('确定删除这篇文章吗？')) return
  try {
    await content.removeArticle(id)
    notify('文章已删除')
  } catch (e) {
    notify(e instanceof Error ? e.message : '删除失败', true)
  }
}

// ---- 公告 ----
async function saveAnnouncement(item: Announcement) {
  try {
    await content.saveAnnouncement(item)
    creatingAnnouncement.value = false
    editingAnnouncement.value = null
    notify('公告已保存')
  } catch (e) {
    notify(e instanceof Error ? e.message : '保存失败', true)
  }
}
async function deleteAnnouncement(id: string) {
  if (!confirm('确定删除这条公告吗？')) return
  try {
    await content.removeAnnouncement(id)
    notify('公告已删除')
  } catch (e) {
    notify(e instanceof Error ? e.message : '删除失败', true)
  }
}

// ---- 数据导入导出 ----
const fileEl = ref<HTMLInputElement | null>(null)

async function exportJson() {
  const payload = await content.exportAll()
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cls2419-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  notify('备份文件已导出')
}

async function onImportFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (file.size > 20 * 1024 * 1024) {
    notify('文件过大（超过 20MB），请检查备份内容', true)
    return
  }
  try {
    const text = await file.text()
    await content.importAll(JSON.parse(text))
    notify('导入成功，内容已合并')
  } catch (err) {
    notify(err instanceof Error ? `导入失败：${err.message}` : '导入失败：JSON 格式错误', true)
  }
}

const userCounts = computed(() => content.userCounts)
</script>

<template>
  <div class="container page">
    <!-- 未登录：本地模拟登录 -->
    <section v-if="!auth.isLoggedIn" class="login-wrap">
      <form class="login card" @submit.prevent="login">
        <span class="login-icon" aria-hidden="true">🔐</span>
        <h1>投稿 / 管理登录</h1>
        <p class="login-desc">
          本站为纯前端演示项目，密码校验完全在浏览器本地完成，
          <strong>不构成真实鉴权</strong>，请勿在此存放任何敏感信息。
        </p>
        <div class="field">
          <label for="login-pass">管理密码</label>
          <input
            id="login-pass"
            v-model="password"
            type="password"
            class="input"
            autocomplete="current-password"
            placeholder="请输入演示密码"
          />
          <p class="hint">
            演示密码：<code>{{ DEMO_PASSWORD }}</code>
          </p>
        </div>
        <p v-if="loginError" class="form-error" role="alert">{{ loginError }}</p>
        <button type="submit" class="btn login-btn">进入管理</button>
      </form>
    </section>

    <!-- 已登录：管理面板 -->
    <template v-else>
      <header class="page-head">
        <div>
          <h1>投稿 / 管理</h1>
          <p class="subtitle">
            你好，{{ auth.username }} · 新增内容将保存在当前浏览器（localStorage / IndexedDB）
          </p>
        </div>
        <button class="btn btn--ghost btn--sm" @click="auth.logout()">退出登录</button>
      </header>

      <div class="tabs" role="tablist" aria-label="管理分类">
        <button
          v-for="t in tabs"
          :key="t.key"
          role="tab"
          class="tab"
          :class="{ active: tab === t.key }"
          :aria-selected="tab === t.key"
          @click="tab = t.key"
        >
          {{ t.label }}
        </button>
      </div>

      <p v-if="message" class="msg ok" role="status">{{ message }}</p>
      <p v-if="errorMsg" class="msg err" role="alert">{{ errorMsg }}</p>

      <!-- 相册管理 -->
      <section v-if="tab === 'albums'">
        <div v-if="creatingAlbum || editingAlbum" class="editor">
          <AlbumForm
            :album="editingAlbum"
            @save="saveAlbum"
            @cancel="cancelAlbumEdit"
          />
        </div>
        <button v-else class="btn new-btn" @click="creatingAlbum = true">＋ 新建相册</button>

        <ul class="manage-list">
          <li v-for="a in content.albums" :key="a.id" class="manage-item card">
            <img :src="a.cover" :alt="a.title" class="m-cover" loading="lazy" />
            <div class="m-info">
              <div class="m-title-row">
                <strong>{{ a.title }}</strong>
                <span class="badge" :class="a.source">{{
                  a.source === 'seed' ? '内置' : '本地'
                }}</span>
                <span v-if="a.draft" class="badge draft">草稿</span>
              </div>
              <small
                >{{ a.category }} · {{ a.photos.length }} 张 · {{ formatDate(a.createdAt) }}</small
              >
            </div>
            <div class="m-actions">
              <button class="btn btn--ghost btn--sm" @click="startEditAlbum(a)">编辑</button>
              <button
                class="btn btn--danger btn--sm"
                :disabled="a.source === 'seed'"
                @click="deleteAlbum(a.id)"
              >
                删除
              </button>
            </div>
          </li>
        </ul>
      </section>

      <!-- 视频管理 -->
      <section v-if="tab === 'videos'">
        <div v-if="creatingVideo || editingVideo" class="editor">
          <VideoForm
            :video="editingVideo"
            @save="saveVideo"
            @cancel="cancelVideoEdit"
          />
        </div>
        <button v-else class="btn new-btn" @click="creatingVideo = true">＋ 新建视频</button>

        <ul class="manage-list">
          <li v-for="v in content.videos" :key="v.id" class="manage-item card">
            <img :src="v.cover" :alt="v.title" class="m-cover wide" loading="lazy" />
            <div class="m-info">
              <div class="m-title-row">
                <strong>{{ v.title }}</strong>
                <span class="badge" :class="v.source">{{
                  v.source === 'seed' ? '内置' : '本地'
                }}</span>
                <span v-if="v.draft" class="badge draft">草稿</span>
              </div>
              <small
                >{{ v.category }} · {{ v.duration || '—' }} · {{ formatDate(v.createdAt) }}</small
              >
            </div>
            <div class="m-actions">
              <button class="btn btn--ghost btn--sm" @click="startEditVideo(v)">编辑</button>
              <button
                class="btn btn--danger btn--sm"
                :disabled="v.source === 'seed'"
                @click="deleteVideo(v.id)"
              >
                删除
              </button>
            </div>
          </li>
        </ul>
      </section>

      <!-- 文章管理 -->
      <section v-if="tab === 'articles'">
        <div v-if="creatingArticle || editingArticle" class="editor">
          <ArticleForm
            :article="editingArticle"
            @save="saveArticle"
            @cancel="cancelArticleEdit"
          />
        </div>
        <button v-else class="btn new-btn" @click="creatingArticle = true">＋ 写文章</button>

        <ul class="manage-list">
          <li v-for="a in content.articles" :key="a.id" class="manage-item card">
            <img :src="a.cover" :alt="a.title" class="m-cover" loading="lazy" />
            <div class="m-info">
              <div class="m-title-row">
                <strong>{{ a.title }}</strong>
                <span class="badge" :class="a.source">{{
                  a.source === 'seed' ? '内置' : '本地'
                }}</span>
                <span v-if="a.draft" class="badge draft">草稿</span>
              </div>
              <small>{{ a.category }} · {{ a.author }} · {{ formatDate(a.createdAt) }}</small>
            </div>
            <div class="m-actions">
              <button class="btn btn--ghost btn--sm" @click="startEditArticle(a)">编辑</button>
              <button
                class="btn btn--danger btn--sm"
                :disabled="a.source === 'seed'"
                @click="deleteArticle(a.id)"
              >
                删除
              </button>
            </div>
          </li>
        </ul>
      </section>

      <!-- 公告管理 -->
      <section v-if="tab === 'announcements'">
        <div v-if="creatingAnnouncement || editingAnnouncement" class="editor">
          <AnnouncementForm
            :item="editingAnnouncement"
            @save="saveAnnouncement"
            @cancel="cancelAnnouncementEdit"
          />
        </div>
        <button v-else class="btn new-btn" @click="creatingAnnouncement = true">＋ 发布公告</button>

        <ul class="manage-list plain">
          <li v-for="n in content.announcements" :key="n.id" class="manage-item card">
            <div class="m-info">
              <div class="m-title-row">
                <strong>{{ n.pinned ? '📌 ' : '' }}{{ n.title }}</strong>
                <span class="badge" :class="n.source">{{
                  n.source === 'seed' ? '内置' : '本地'
                }}</span>
              </div>
              <small>{{ formatDate(n.createdAt) }} · {{ n.level }}</small>
            </div>
            <div class="m-actions">
              <button class="btn btn--ghost btn--sm" @click="startEditAnnouncement(n)">编辑</button>
              <button
                class="btn btn--danger btn--sm"
                :disabled="n.source === 'seed'"
                @click="deleteAnnouncement(n.id)"
              >
                删除
              </button>
            </div>
          </li>
        </ul>
      </section>

      <!-- 数据管理 -->
      <section v-if="tab === 'data'" class="data-panel card">
        <h2>备份与恢复</h2>
        <p>
          当前本地投稿：相册 {{ userCounts.albums }} · 视频 {{ userCounts.videos }} · 文章
          {{ userCounts.articles }} · 公告 {{ userCounts.announcements }}
        </p>
        <p class="tip">
          导出的 JSON 仅包含你新增 / 修改的内容（不含内置示例与图片二进制的 IndexedDB 视频）。
          导入时会与现有内容合并，同 id 覆盖。
        </p>
        <div class="btn-row">
          <button class="btn" @click="exportJson">⬇️ 导出 JSON 备份</button>
          <button class="btn btn--ghost" @click="fileEl?.click()">⬆️ 导入 JSON 备份</button>
          <input
            ref="fileEl"
            type="file"
            accept="application/json,.json"
            class="visually-hidden"
            aria-label="选择备份文件"
            @change="onImportFile"
          />
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.page {
  padding-top: var(--space-6);
  max-width: 900px;
}
.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
  margin-bottom: var(--space-4);
}
h1 {
  font-size: clamp(1.4rem, 3vw, 1.8rem);
}
.subtitle {
  color: var(--text-3);
  font-size: 0.88rem;
  margin-top: 4px;
}

/* 登录 */
.login-wrap {
  display: flex;
  justify-content: center;
  padding-top: var(--space-8);
}
.login {
  width: min(420px, 100%);
  padding: clamp(24px, 5vw, 40px);
  text-align: center;
}
.login-icon {
  font-size: 2.4rem;
}
.login h1 {
  margin: var(--space-3) 0;
  font-size: 1.3rem;
}
.login-desc {
  color: var(--text-2);
  font-size: 0.88rem;
  margin-bottom: var(--space-5);
  text-align: left;
}
.login .field {
  text-align: left;
}
.login-btn {
  width: 100%;
}
.hint code {
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  padding: 0 6px;
}

/* 标签页 */
.tabs {
  display: flex;
  gap: var(--space-1);
  border-bottom: 1px solid var(--border);
  margin-bottom: var(--space-5);
  overflow-x: auto;
}
.tab {
  border: none;
  background: none;
  padding: 0.6em 1.1em;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-3);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  white-space: nowrap;
  transition: all var(--duration-fast) var(--ease);
}
.tab:hover {
  color: var(--primary);
}
.tab.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

.msg {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: var(--space-4);
}
.msg.ok {
  color: var(--success);
  background: color-mix(in srgb, var(--success) 10%, transparent);
}
.msg.err {
  color: var(--danger);
  background: color-mix(in srgb, var(--danger) 10%, transparent);
}

.new-btn {
  margin-bottom: var(--space-4);
}
.editor {
  margin-bottom: var(--space-4);
}

.manage-list {
  display: grid;
  gap: var(--space-3);
}
.manage-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  flex-wrap: wrap;
}
.m-cover {
  width: 72px;
  height: 54px;
  object-fit: cover;
  border-radius: var(--radius-xs);
  flex: none;
  background: var(--bg-soft);
}
.m-cover.wide {
  width: 88px;
}
.m-info {
  flex: 1;
  min-width: 160px;
}
.m-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.m-info small {
  color: var(--text-3);
  font-size: 0.8rem;
}
.badge {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 1px 8px;
  border-radius: var(--radius-full);
}
.badge.seed {
  color: var(--text-3);
  background: var(--bg-soft);
  border: 1px solid var(--border);
}
.badge.user {
  color: var(--primary);
  background: var(--primary-soft);
}
.badge.draft {
  color: var(--warning);
  background: color-mix(in srgb, var(--warning) 12%, transparent);
}
.m-actions {
  display: flex;
  gap: var(--space-2);
  margin-left: auto;
}

.data-panel {
  padding: clamp(18px, 3vw, 28px);
}
.data-panel h2 {
  font-size: 1.15rem;
  margin-bottom: var(--space-3);
}
.data-panel p {
  color: var(--text-2);
  font-size: 0.92rem;
  margin-bottom: var(--space-2);
}
.tip {
  font-size: 0.82rem !important;
  color: var(--text-3) !important;
}
.btn-row {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-top: var(--space-4);
}
.form-error {
  color: var(--danger);
  font-size: 0.88rem;
  font-weight: 600;
  margin-bottom: var(--space-3);
}
</style>
