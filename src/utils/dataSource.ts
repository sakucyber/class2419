/**
 * 数据源抽象层：
 * - 当前实现 LocalDataSource（seed 静态数据 + localStorage/IndexedDB 用户数据）
 * - 未来接入真实后端时，仅需实现 ApiDataSource 接口并替换导出实例
 */
import type {
  Album,
  Announcement,
  Article,
  BackupPayload,
  UserContentBundle,
  VideoItem,
} from '@/types'
import { clearBlobs, deleteBlob, revokeMediaUrl } from '@/utils/idb'
import { clearAll, getJSON, setJSON } from '@/utils/storage'
import { parseBackupPayload } from '@/utils/validate'

export interface DataSource {
  loadUserContent(): Promise<UserContentBundle>
  saveAlbum(album: Album): Promise<void>
  removeAlbum(id: string): Promise<void>
  saveVideo(video: VideoItem): Promise<void>
  removeVideo(id: string): Promise<void>
  saveArticle(article: Article): Promise<void>
  removeArticle(id: string): Promise<void>
  saveAnnouncement(item: Announcement): Promise<void>
  removeAnnouncement(id: string): Promise<void>
  exportAll(): Promise<BackupPayload>
  importAll(payload: unknown): Promise<UserContentBundle>
  /** 用备份内容**整份替换**本地内容（恢复预览里的「覆盖」模式） */
  replaceAll(payload: unknown): Promise<UserContentBundle>
  resetAll(): Promise<void>
}

const STORAGE_KEY = 'user-content'

const EMPTY: UserContentBundle = { albums: [], videos: [], articles: [], announcements: [] }

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const idx = list.findIndex((x) => x.id === item.id)
  if (idx === -1) return [item, ...list]
  const next = list.slice()
  next[idx] = item
  return next
}

/** 以导入内容为准合并：同 id 用新数据，其余保留现有 */
function mergeById<T extends { id: string }>(incoming: T[], current: T[]): T[] {
  const ids = new Set(incoming.map((x) => x.id))
  return [...incoming, ...current.filter((c) => !ids.has(c.id))]
}

export class LocalDataSource implements DataSource {
  private read(): UserContentBundle {
    const saved = getJSON<UserContentBundle>(STORAGE_KEY, EMPTY)
    return {
      albums: Array.isArray(saved.albums) ? saved.albums : [],
      videos: Array.isArray(saved.videos) ? saved.videos : [],
      articles: Array.isArray(saved.articles) ? saved.articles : [],
      announcements: Array.isArray(saved.announcements) ? saved.announcements : [],
    }
  }

  private write(bundle: UserContentBundle): void {
    const ok = setJSON(STORAGE_KEY, bundle)
    if (!ok) throw new Error('本地存储空间不足：请删除部分大图片/视频后再保存')
  }

  /** 读 → 改 → 写：四个集合的增删都走这一条路径，避免各写一遍读写样板 */
  private mutate(change: (bundle: UserContentBundle) => void): void {
    const bundle = this.read()
    change(bundle)
    this.write(bundle)
  }

  async loadUserContent(): Promise<UserContentBundle> {
    return this.read()
  }

  async saveAlbum(album: Album): Promise<void> {
    this.mutate((b) => {
      b.albums = upsert(b.albums, { ...album, source: 'user' })
    })
  }

  async removeAlbum(id: string): Promise<void> {
    this.mutate((b) => {
      b.albums = b.albums.filter((a) => a.id !== id)
    })
  }

  async saveVideo(video: VideoItem): Promise<void> {
    this.mutate((b) => {
      b.videos = upsert(b.videos, { ...video, source: 'user' })
    })
  }

  async removeVideo(id: string): Promise<void> {
    const target = this.read().videos.find((v) => v.id === id)
    this.mutate((b) => {
      b.videos = b.videos.filter((v) => v.id !== id)
    })
    if (target?.src?.startsWith('idb:')) {
      revokeMediaUrl(target.src)
      await deleteBlob(target.src.slice(4)).catch(() => undefined)
    }
  }

  async saveArticle(article: Article): Promise<void> {
    this.mutate((b) => {
      b.articles = upsert(b.articles, { ...article, source: 'user' })
    })
  }

  async removeArticle(id: string): Promise<void> {
    this.mutate((b) => {
      b.articles = b.articles.filter((a) => a.id !== id)
    })
  }

  async saveAnnouncement(item: Announcement): Promise<void> {
    this.mutate((b) => {
      b.announcements = upsert(b.announcements, { ...item, source: 'user' })
    })
  }

  async removeAnnouncement(id: string): Promise<void> {
    this.mutate((b) => {
      b.announcements = b.announcements.filter((a) => a.id !== id)
    })
  }

  async exportAll(): Promise<BackupPayload> {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      app: 'xinwuling-class-2419',
      data: this.read(),
    }
  }

  async importAll(payload: unknown): Promise<UserContentBundle> {
    const parsed = parseBackupPayload(payload)
    const current = this.read()
    const merged: UserContentBundle = {
      albums: mergeById(parsed.data.albums, current.albums),
      videos: mergeById(parsed.data.videos, current.videos),
      articles: mergeById(parsed.data.articles, current.articles),
      announcements: mergeById(parsed.data.announcements, current.announcements),
    }
    this.write(merged)
    return merged
  }

  async replaceAll(payload: unknown): Promise<UserContentBundle> {
    const parsed = parseBackupPayload(payload)
    // 整份替换：不做任何合并，备份里有什么就是什么
    this.write(parsed.data)
    return parsed.data
  }

  async resetAll(): Promise<void> {
    clearAll()
    await clearBlobs()
  }
}

/**
 * 未来后端接口示例（仅作扩展参考，默认不启用）：
 *
 * export class ApiDataSource implements DataSource {
 *   constructor(private base = '/api') {}
 *   async loadUserContent() {
 *     const res = await fetch(`${this.base}/content`)
 *     return (await res.json()) as UserContentBundle
 *   }
 *   ... 同接口其余方法
 * }
 */

export const dataSource: DataSource = new LocalDataSource()
