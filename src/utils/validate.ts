/** 导入数据校验：防御性解析外部 JSON，避免脏数据 / 恶意结构进入应用 */
import type {
  Album,
  Announcement,
  Article,
  BackupPayload,
  Photo,
  UserContentBundle,
  VideoItem,
} from '@/types'

class ValidationError extends Error {}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new ValidationError(msg)
}

function isStr(v: unknown): v is string {
  return typeof v === 'string'
}

function str(v: unknown, fallback = ''): string {
  return isStr(v) ? v.slice(0, 20000) : fallback
}

function strArray(v: unknown, max = 20): string[] {
  if (!Array.isArray(v)) return []
  return v
    .filter(isStr)
    .slice(0, max)
    .map((s) => s.slice(0, 50))
}

/** 仅允许同源相对路径、data:、blob:、idb: 或 http(s) 媒体地址 */
function mediaUrl(v: unknown, fallback = ''): string {
  const s = str(v, fallback)
  if (!s) return fallback
  if (
    s.startsWith('/') ||
    s.startsWith('./') ||
    s.startsWith('data:') ||
    s.startsWith('blob:') ||
    s.startsWith('idb:') ||
    /^https?:\/\//i.test(s)
  ) {
    return s
  }
  return fallback
}

function parsePhotos(v: unknown): Photo[] {
  if (!Array.isArray(v)) return []
  return v.slice(0, 200).map((p, i) => {
    const obj = (p || {}) as Record<string, unknown>
    return {
      id: str(obj.id, `p${i}`),
      src: mediaUrl(obj.src),
      caption: str(obj.caption).slice(0, 200),
      width: typeof obj.width === 'number' ? obj.width : undefined,
      height: typeof obj.height === 'number' ? obj.height : undefined,
    }
  })
}

function parseAlbum(v: unknown): Album | null {
  const o = (v || {}) as Record<string, unknown>
  if (!isStr(o.id) || !isStr(o.title)) return null
  return {
    id: str(o.id).slice(0, 64),
    title: str(o.title).slice(0, 100),
    description: str(o.description).slice(0, 1000),
    cover: mediaUrl(o.cover),
    category: str(o.category, '其他').slice(0, 30),
    tags: strArray(o.tags),
    photos: parsePhotos(o.photos),
    author: str(o.author, '匿名').slice(0, 30),
    createdAt: str(o.createdAt, new Date().toISOString()),
    likes: typeof o.likes === 'number' ? Math.max(0, Math.floor(o.likes)) : 0,
    source: 'user',
    draft: o.draft === true,
  }
}

function parseVideo(v: unknown): VideoItem | null {
  const o = (v || {}) as Record<string, unknown>
  if (!isStr(o.id) || !isStr(o.title)) return null
  const embedUrl = isStr(o.embedUrl) ? o.embedUrl : undefined
  const externalUrl = isStr(o.externalUrl) ? o.externalUrl : undefined
  // 外链只允许 http(s)，防止 javascript: 注入
  const safeEmbed = embedUrl && /^https:\/\//i.test(embedUrl) ? embedUrl : undefined
  const safeExternal = externalUrl && /^https:\/\//i.test(externalUrl) ? externalUrl : undefined
  return {
    id: str(o.id).slice(0, 64),
    title: str(o.title).slice(0, 100),
    description: str(o.description).slice(0, 1000),
    cover: mediaUrl(o.cover),
    category: str(o.category, '其他').slice(0, 30),
    tags: strArray(o.tags),
    author: str(o.author, '匿名').slice(0, 30),
    createdAt: str(o.createdAt, new Date().toISOString()),
    src: mediaUrl(o.src) || undefined,
    embedUrl: safeEmbed,
    externalUrl: safeExternal,
    duration: str(o.duration).slice(0, 20),
    source: 'user',
    draft: o.draft === true,
  }
}

function parseArticle(v: unknown): Article | null {
  const o = (v || {}) as Record<string, unknown>
  if (!isStr(o.id) || !isStr(o.title)) return null
  return {
    id: str(o.id).slice(0, 64),
    title: str(o.title).slice(0, 100),
    excerpt: str(o.excerpt).slice(0, 500),
    cover: mediaUrl(o.cover),
    category: str(o.category, '随笔').slice(0, 30),
    tags: strArray(o.tags),
    author: str(o.author, '匿名').slice(0, 30),
    createdAt: str(o.createdAt, new Date().toISOString()),
    updatedAt: isStr(o.updatedAt) ? str(o.updatedAt) : undefined,
    readingMinutes: typeof o.readingMinutes === 'number' ? Math.max(1, o.readingMinutes) : 3,
    content: str(o.content).slice(0, 200_000),
    source: 'user',
    draft: o.draft === true,
  }
}

function parseAnnouncement(v: unknown): Announcement | null {
  const o = (v || {}) as Record<string, unknown>
  if (!isStr(o.id) || !isStr(o.title)) return null
  const level = o.level
  return {
    id: str(o.id).slice(0, 64),
    title: str(o.title).slice(0, 100),
    content: str(o.content).slice(0, 2000),
    createdAt: str(o.createdAt, new Date().toISOString()),
    pinned: o.pinned === true,
    level: level === 'success' || level === 'warning' ? level : 'info',
    source: 'user',
  }
}

/** 解析导入的备份数据；非法输入抛出 ValidationError */
export function parseBackupPayload(input: unknown): BackupPayload {
  assert(input && typeof input === 'object', '导入失败：不是有效的 JSON 对象')
  const obj = input as Record<string, unknown>
  const data = (obj.data || obj) as Record<string, unknown>
  assert(data && typeof data === 'object', '导入失败：缺少 data 字段')

  const bundle: UserContentBundle = {
    albums: (Array.isArray(data.albums) ? data.albums : [])
      .map(parseAlbum)
      .filter((x): x is Album => !!x),
    videos: (Array.isArray(data.videos) ? data.videos : [])
      .map(parseVideo)
      .filter((x): x is VideoItem => !!x),
    articles: (Array.isArray(data.articles) ? data.articles : [])
      .map(parseArticle)
      .filter((x): x is Article => !!x),
    announcements: (Array.isArray(data.announcements) ? data.announcements : [])
      .map(parseAnnouncement)
      .filter((x): x is Announcement => !!x),
  }
  return {
    version: 1,
    exportedAt: str(obj.exportedAt, new Date().toISOString()),
    app: 'xinwuling-class-2419',
    data: bundle,
  }
}
