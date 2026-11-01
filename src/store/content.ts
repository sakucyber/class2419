/**
 * 内容仓库：合并内置种子数据与用户本地数据（localStorage / IndexedDB）。
 * 所有读写通过 dataSource 抽象层，未来可无痛切换为后端 API。
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { KIND_META, type SearchType, SEARCH_TYPE_LABEL } from '@/config/content'
import type { Album, Announcement, Article, Honor, UserContentBundle, VideoItem } from '@/types'
import { dataSource } from '@/utils/dataSource'
import { seedAlbums, seedAnnouncements, seedArticles, seedSlides, seedVideos } from '@/utils/seed'
import classInfoSeed from '@/data/classInfo.json'
import honorsSeed from '@/data/honors.json'
import timelineSeed from '@/data/timeline.json'

const EMPTY: UserContentBundle = { albums: [], videos: [], articles: [], announcements: [] }

/** 时间倒序比较器（ISO 字符串可直接比较） */
function newestFirst(a: { createdAt: string }, b: { createdAt: string }): number {
  return a.createdAt < b.createdAt ? 1 : -1
}

/** 对外展示的列表：排除草稿 + 按时间倒序 */
function published<T extends { draft?: boolean; createdAt: string }>(list: T[]): T[] {
  return list.filter((item) => !item.draft).sort(newestFirst)
}

/** 搜索命中项（搜索页与搜索浮层共用） */
export interface SearchHit {
  type: SearchType
  id: string
  title: string
  subtitle?: string
  cover?: string
  to: string
}

export const useContentStore = defineStore('content', () => {
  const loading = ref(true)
  const error = ref('')

  const user = ref<UserContentBundle>({ ...EMPTY })

  /** 静态展示数据（随仓库发布，不参与本地读写） */
  const classInfo = classInfoSeed
  const honors = honorsSeed as unknown as Honor[]
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

  const publicAlbums = computed(() => published(albums.value))
  const publicVideos = computed(() => published(videos.value))
  const publicArticles = computed(() => published(articles.value))
  const publicAnnouncements = computed(() =>
    [...announcements.value].sort((a, b) => {
      // 置顶优先，其次按时间倒序
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return newestFirst(a, b)
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

  // ---- 详情查询 ----
  // 注意过滤 draft：列表/搜索/首页都排除了草稿，但详情页以前能通过直链打开草稿内容。
  // 草稿只能通过导入备份产生（后台已下线），所以这里直接当作"不存在"。
  const getAlbum = (id: string) => albums.value.find((a) => a.id === id && !a.draft)
  const getVideo = (id: string) => videos.value.find((v) => v.id === id && !v.draft)
  const getArticle = (id: string) => articles.value.find((a) => a.id === id && !a.draft)

  // ---- CRUD（写入数据源后刷新用户内容） ----
  async function reloadUser() {
    user.value = await dataSource.loadUserContent()
  }

  async function saveAlbum(album: Album) {
    await dataSource.saveAlbum(album)
    await reloadUser()
  }
  async function removeAlbum(id: string) {
    assertNotBuiltin(seedAlbums, user.value.albums, id)
    await dataSource.removeAlbum(id)
    await reloadUser()
  }
  async function saveVideo(video: VideoItem) {
    await dataSource.saveVideo(video)
    await reloadUser()
  }
  async function removeVideo(id: string) {
    assertNotBuiltin(seedVideos, user.value.videos, id)
    await dataSource.removeVideo(id)
    await reloadUser()
  }
  async function saveArticle(article: Article) {
    await dataSource.saveArticle(article)
    await reloadUser()
  }
  async function removeArticle(id: string) {
    assertNotBuiltin(seedArticles, user.value.articles, id)
    await dataSource.removeArticle(id)
    await reloadUser()
  }
  async function saveAnnouncement(item: Announcement) {
    await dataSource.saveAnnouncement(item)
    await reloadUser()
  }
  async function removeAnnouncement(id: string) {
    assertNotBuiltin(seedAnnouncements, user.value.announcements, id)
    await dataSource.removeAnnouncement(id)
    await reloadUser()
  }

  /** 内置内容只有在「已被本地副本覆盖」时才允许删除 */
  function assertNotBuiltin(seed: { id: string }[], overrides: { id: string }[], id: string) {
    const isBuiltin = seed.some((s) => s.id === id)
    const isOverridden = overrides.some((o) => o.id === id)
    if (isBuiltin && !isOverridden) {
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
  function search(q: string): SearchHit[] {
    const keyword = q.trim().toLowerCase()
    if (!keyword) return []
    const hits: SearchHit[] = []
    const match = (...fields: string[]) => fields.some((f) => f.toLowerCase().includes(keyword))

    /** 统一拼装命中项，省掉每类各写一遍 subtitle/to */
    const hit = (
      type: SearchType,
      id: string,
      title: string,
      category: string | undefined,
      cover: string,
      to: string,
    ) => {
      hits.push({
        type,
        id,
        title,
        subtitle: category ? `${SEARCH_TYPE_LABEL[type]} · ${category}` : SEARCH_TYPE_LABEL[type],
        cover,
        to,
      })
    }

    publicAlbums.value.forEach((a) => {
      if (match(a.title, a.description, a.category, ...a.tags)) {
        hit('album', a.id, a.title, a.category, a.cover, `${KIND_META.album.route}/${a.id}`)
      }
    })
    publicVideos.value.forEach((v) => {
      if (match(v.title, v.description, v.category, ...v.tags)) {
        hit('video', v.id, v.title, v.category, v.cover, `${KIND_META.video.route}/${v.id}`)
      }
    })
    publicArticles.value.forEach((a) => {
      if (match(a.title, a.excerpt, a.category, a.content, ...a.tags)) {
        hit('article', a.id, a.title, a.category, a.cover, `${KIND_META.article.route}/${a.id}`)
      }
    })
    allTags.value.forEach((t) => {
      if (match(t)) {
        hits.push({
          type: 'tag',
          id: t,
          title: `#${t}`,
          subtitle: SEARCH_TYPE_LABEL.tag,
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
