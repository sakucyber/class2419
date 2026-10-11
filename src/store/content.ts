/**
 * 内容仓库：合并内置种子数据与用户本地数据（localStorage / IndexedDB）。
 * 所有读写通过 dataSource 抽象层，未来可无痛切换为后端 API。
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import type { Album, Announcement, Article, UserContentBundle, VideoItem } from '@/types'
import { dataSource } from '@/utils/dataSource'
import { seedAlbums, seedAnnouncements, seedArticles, seedSlides, seedVideos } from '@/utils/seed'
import classInfoSeed from '@/data/classInfo.json'
import honorsSeed from '@/data/honors.json'
import membersSeed from '@/data/members.json'
import timelineSeed from '@/data/timeline.json'

const EMPTY: UserContentBundle = { albums: [], videos: [], articles: [], announcements: [] }

export const useContentStore = defineStore('content', () => {
  const loading = ref(true)
  const error = ref('')

  const user = ref<UserContentBundle>({ ...EMPTY })

  // 静态展示数据
  const classInfo = classInfoSeed
  const members = membersSeed
  const honors = honorsSeed
  const timeline = timelineSeed
  const slides = seedSlides

  async function init() {
    loading.value = true
    error.value = ''
    try {
      user.value = await dataSource.loadUserContent()
    } catch (e) {
      error.value = e instanceof Error ? e.message : '内容加载失败'
      user.value = { ...EMPTY }
    } finally {
      loading.value = false
    }
  }

  /** 用户内容按 id 覆盖种子内容（可编辑内置数据的副本） */
  function merge<T extends { id: string }>(seed: T[], overrides: T[]): T[] {
    const ids = new Set(overrides.map((x) => x.id))
    return [...overrides, ...seed.filter((s) => !ids.has(s.id))]
  }

  const albums = computed(() => merge<Album>(seedAlbums, user.value.albums))
  const videos = computed(() => merge<VideoItem>(seedVideos, user.value.videos))
  const articles = computed(() => merge<Article>(seedArticles, user.value.articles))
  const announcements = computed(() =>
    merge<Announcement>(seedAnnouncements, user.value.announcements),
  )

  /** 对外展示（不含草稿、按时间倒序） */
  const publicAlbums = computed(() =>
    albums.value.filter((a) => !a.draft).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
  )
  const publicVideos = computed(() =>
    videos.value.filter((v) => !v.draft).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
  )
  const publicArticles = computed(() =>
    articles.value.filter((a) => !a.draft).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
  )
  const publicAnnouncements = computed(() =>
    [...announcements.value].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return a.createdAt < b.createdAt ? 1 : -1
    }),
  )

  const albumCategories = computed(() => [...new Set(publicAlbums.value.map((a) => a.category))])
  const videoCategories = computed(() => [...new Set(publicVideos.value.map((v) => v.category))])
  const articleCategories = computed(() => [
    ...new Set(publicArticles.value.map((a) => a.category)),
  ])
  const allTags = computed(() => {
    const set = new Set<string>()
    publicAlbums.value.forEach((a) => a.tags.forEach((t) => set.add(t)))
    publicVideos.value.forEach((v) => v.tags.forEach((t) => set.add(t)))
    publicArticles.value.forEach((a) => a.tags.forEach((t) => set.add(t)))
    return [...set].sort((a, b) => a.localeCompare(b, 'zh-CN'))
  })

  /** 用户内容统计（管理页展示用） */
  const userCounts = computed(() => ({
    albums: user.value.albums.length,
    videos: user.value.videos.length,
    articles: user.value.articles.length,
    announcements: user.value.announcements.length,
  }))

  // ---- 详情查询 ----
  const getAlbum = (id: string) => albums.value.find((a) => a.id === id)
  const getVideo = (id: string) => videos.value.find((v) => v.id === id)
  const getArticle = (id: string) => articles.value.find((a) => a.id === id)

  // ---- CRUD（写入数据源后刷新用户内容） ----
  async function reloadUser() {
    user.value = await dataSource.loadUserContent()
  }

  async function saveAlbum(album: Album) {
    await dataSource.saveAlbum(album)
    await reloadUser()
  }
  async function removeAlbum(id: string) {
    assertNotBuiltin(seedAlbums, id)
    await dataSource.removeAlbum(id)
    await reloadUser()
  }
  async function saveVideo(video: VideoItem) {
    await dataSource.saveVideo(video)
    await reloadUser()
  }
  async function removeVideo(id: string) {
    assertNotBuiltin(seedVideos, id)
    await dataSource.removeVideo(id)
    await reloadUser()
  }
  async function saveArticle(article: Article) {
    await dataSource.saveArticle(article)
    await reloadUser()
  }
  async function removeArticle(id: string) {
    assertNotBuiltin(seedArticles, id)
    await dataSource.removeArticle(id)
    await reloadUser()
  }
  async function saveAnnouncement(item: Announcement) {
    await dataSource.saveAnnouncement(item)
    await reloadUser()
  }
  async function removeAnnouncement(id: string) {
    assertNotBuiltin(seedAnnouncements, id)
    await dataSource.removeAnnouncement(id)
    await reloadUser()
  }

  function assertNotBuiltin(seed: { id: string }[], id: string) {
    const isBuiltin = seed.some((s) => s.id === id)
    const overrideIds = new Set<string>([
      ...user.value.albums.map((x) => x.id),
      ...user.value.videos.map((x) => x.id),
      ...user.value.articles.map((x) => x.id),
      ...user.value.announcements.map((x) => x.id),
    ])
    if (isBuiltin && !overrideIds.has(id)) {
      throw new Error('内置示例数据不可删除（可先编辑并另存为本地内容）')
    }
  }

  // ---- 导入导出 / 重置 ----
  async function exportAll() {
    return dataSource.exportAll()
  }
  async function importAll(payload: unknown) {
    await dataSource.importAll(payload)
    await reloadUser()
  }
  async function resetUserData() {
    await dataSource.resetAll()
    await reloadUser()
  }

  // ---- 全站搜索 ----
  interface SearchHit {
    type: 'album' | 'video' | 'article' | 'tag'
    id: string
    title: string
    subtitle?: string
    cover?: string
    to: string
  }
  function search(q: string): SearchHit[] {
    const keyword = q.trim().toLowerCase()
    if (!keyword) return []
    const hits: SearchHit[] = []
    const match = (...fields: string[]) => fields.some((f) => f.toLowerCase().includes(keyword))

    publicAlbums.value.forEach((a) => {
      if (match(a.title, a.description, a.category, ...a.tags)) {
        hits.push({
          type: 'album',
          id: a.id,
          title: a.title,
          subtitle: `相册 · ${a.category}`,
          cover: a.cover,
          to: `/albums/${a.id}`,
        })
      }
    })
    publicVideos.value.forEach((v) => {
      if (match(v.title, v.description, v.category, ...v.tags)) {
        hits.push({
          type: 'video',
          id: v.id,
          title: v.title,
          subtitle: `视频 · ${v.category}`,
          cover: v.cover,
          to: `/videos/${v.id}`,
        })
      }
    })
    publicArticles.value.forEach((a) => {
      if (match(a.title, a.excerpt, a.category, a.content, ...a.tags)) {
        hits.push({
          type: 'article',
          id: a.id,
          title: a.title,
          subtitle: `文章 · ${a.category}`,
          cover: a.cover,
          to: `/articles/${a.id}`,
        })
      }
    })
    allTags.value.forEach((t) => {
      if (match(t)) {
        hits.push({
          type: 'tag',
          id: t,
          title: `#${t}`,
          subtitle: '标签',
          to: `/search?q=${encodeURIComponent(t)}`,
        })
      }
    })
    return hits.slice(0, 50)
  }

  return {
    loading,
    error,
    classInfo,
    members,
    honors,
    timeline,
    slides,
    albums,
    videos,
    articles,
    announcements,
    publicAlbums,
    publicVideos,
    publicArticles,
    publicAnnouncements,
    albumCategories,
    videoCategories,
    articleCategories,
    allTags,
    userCounts,
    getAlbum,
    getVideo,
    getArticle,
    init,
    saveAlbum,
    removeAlbum,
    saveVideo,
    removeVideo,
    saveArticle,
    removeArticle,
    saveAnnouncement,
    removeAnnouncement,
    exportAll,
    importAll,
    resetUserData,
    search,
  }
})
