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

  async loadUserContent(): Promise<UserContentBundle> {
    return this.read()
  }

  async saveAlbum(album: Album): Promise<void> {
    const bundle = this.read()
    bundle.albums = upsert(bundle.albums, { ...album, source: 'user' })
    this.write(bundle)
  }

  async removeAlbum(id: string): Promise<void> {
    const bundle = this.read()
    bundle.albums = bundle.albums.filter((a) => a.id !== id)
    this.write(bundle)
  }

  async saveVideo(video: VideoItem): Promise<void> {
    const bundle = this.read()
    bundle.videos = upsert(bundle.videos, { ...video, source: 'user' })
    this.write(bundle)
  }

  async removeVideo(id: string): Promise<void> {
    const bundle = this.read()
    const target = bundle.videos.find((v) => v.id === id)
    bundle.videos = bundle.videos.filter((v) => v.id !== id)
    this.write(bundle)
    if (target?.src?.startsWith('idb:')) {
      revokeMediaUrl(target.src)
      await deleteBlob(target.src.slice(4)).catch(() => undefined)
    }
  }

  async saveArticle(article: Article): Promise<void> {
    const bundle = this.read()
    bundle.articles = upsert(bundle.articles, { ...article, source: 'user' })
    this.write(bundle)
  }

  async removeArticle(id: string): Promise<void> {
    const bundle = this.read()
    bundle.articles = bundle.articles.filter((a) => a.id !== id)
    this.write(bundle)
  }

  async saveAnnouncement(item: Announcement): Promise<void> {
    const bundle = this.read()
    bundle.announcements = upsert(bundle.announcements, { ...item, source: 'user' })
    this.write(bundle)
  }

  async removeAnnouncement(id: string): Promise<void> {
    const bundle = this.read()
    bundle.announcements = bundle.announcements.filter((a) => a.id !== id)
    this.write(bundle)
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
      albums: [
        ...parsed.data.albums,
        ...current.albums.filter((c) => !parsed.data.albums.some((p) => p.id === c.id)),
      ],
      videos: [
        ...parsed.data.videos,
        ...current.videos.filter((c) => !parsed.data.videos.some((p) => p.id === c.id)),
      ],
      articles: [
        ...parsed.data.articles,
        ...current.articles.filter((c) => !parsed.data.articles.some((p) => p.id === c.id)),
      ],
      announcements: [
        ...parsed.data.announcements,
        ...current.announcements.filter(
          (c) => !parsed.data.announcements.some((p) => p.id === c.id),
        ),
      ],
    }
    this.write(merged)
    return merged
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
