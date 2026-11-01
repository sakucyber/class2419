/** 导入数据校验：防御性解析外部 JSON，避免脏数据 / 恶意结构进入应用 */
import { ACCENT_KEYS, FONT_SIZE_KEYS, STYLE_KEYS, THEME_KEYS } from '@/config/styles'
import type {
  Album,
  Announcement,
  Article,
  BackupPayload,
  CheckinState,
  InteractionSnapshot,
  Photo,
  SiteSettings,
  UserContentBundle,
  VideoItem,
  VideoProgress,
} from '@/types'

class ValidationError extends Error {}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new ValidationError(msg)
}

function isStr(v: unknown): v is string {
  return typeof v === 'string'
}

/** 值是否落在白名单里（用于枚举型设置项，避免脏值把页面顶到无皮肤状态） */
function oneOf<T extends string>(v: unknown, allowed: readonly T[]): v is T {
  return isStr(v) && (allowed as readonly string[]).includes(v)
}

function str(v: unknown, fallback = ''): string {
  return isStr(v) ? v.slice(0, 20000) : fallback
}

/** 取字符串并截断到上限（字段级长度约束都走这里，读起来比 str(...).slice(...) 清楚） */
function cap(v: unknown, max: number, fallback = ''): string {
  return str(v, fallback).slice(0, max)
}

/** 四类内容共有的身份字段：缺 id 或 title 一律视为无效记录 */
function hasIdentity(o: Record<string, unknown>): boolean {
  return isStr(o.id) && isStr(o.title)
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
    const takenAt = str(obj.takenAt)
    return {
      id: cap(obj.id, 64, `p${i}`),
      src: mediaUrl(obj.src),
      caption: cap(obj.caption, 200),
      ...(takenAt ? { takenAt } : {}),
      width: typeof obj.width === 'number' ? obj.width : undefined,
      height: typeof obj.height === 'number' ? obj.height : undefined,
    }
  })
}

function parseAlbum(v: unknown): Album | null {
  const o = (v || {}) as Record<string, unknown>
  if (!hasIdentity(o)) return null
  return {
    id: cap(o.id, 64),
    title: cap(o.title, 100),
    description: cap(o.description, 1000),
    cover: mediaUrl(o.cover),
    category: cap(o.category, 30, '其他'),
    tags: strArray(o.tags),
    photos: parsePhotos(o.photos),
    author: cap(o.author, 30, '匿名'),
    createdAt: str(o.createdAt, new Date().toISOString()),
    source: 'user',
    draft: o.draft === true,
  }
}

function parseVideo(v: unknown): VideoItem | null {
  const o = (v || {}) as Record<string, unknown>
  if (!hasIdentity(o)) return null
  // 外链只允许 http(s)，防止 javascript: 注入
  const safeUrl = (value: unknown) =>
    isStr(value) && /^https:\/\//i.test(value) ? value : undefined
  return {
    id: cap(o.id, 64),
    title: cap(o.title, 100),
    description: cap(o.description, 1000),
    cover: mediaUrl(o.cover),
    category: cap(o.category, 30, '其他'),
    tags: strArray(o.tags),
    author: cap(o.author, 30, '匿名'),
    createdAt: str(o.createdAt, new Date().toISOString()),
    src: mediaUrl(o.src) || undefined,
    embedUrl: safeUrl(o.embedUrl),
    externalUrl: safeUrl(o.externalUrl),
    duration: cap(o.duration, 20),
    source: 'user',
    draft: o.draft === true,
  }
}

function parseArticle(v: unknown): Article | null {
  const o = (v || {}) as Record<string, unknown>
  if (!hasIdentity(o)) return null
  return {
    id: cap(o.id, 64),
    title: cap(o.title, 100),
    excerpt: cap(o.excerpt, 500),
    cover: mediaUrl(o.cover),
    category: cap(o.category, 30, '随笔'),
    tags: strArray(o.tags),
    author: cap(o.author, 30, '匿名'),
    createdAt: str(o.createdAt, new Date().toISOString()),
    updatedAt: isStr(o.updatedAt) ? str(o.updatedAt) : undefined,
    readingMinutes: typeof o.readingMinutes === 'number' ? Math.max(1, o.readingMinutes) : 3,
    content: cap(o.content, 200_000),
    source: 'user',
    draft: o.draft === true,
  }
}

function parseAnnouncement(v: unknown): Announcement | null {
  const o = (v || {}) as Record<string, unknown>
  if (!hasIdentity(o)) return null
  const level = o.level
  return {
    id: cap(o.id, 64),
    title: cap(o.title, 100),
    content: cap(o.content, 2000),
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
  const version = Number(obj.version)
  return {
    version: Number.isFinite(version) && version >= 1 ? Math.floor(version) : 1,
    exportedAt: str(obj.exportedAt, new Date().toISOString()),
    app: 'xinwuling-class-2419',
    data: bundle,
  }
}

/* ------------------------------------------------------------------ */
/* 互动数据 / 外观设置                                                  */
/* ------------------------------------------------------------------ */

/**
 * 解析备份里的互动数据（收藏 / 观看进度 / 阅读位置 / 打卡）。
 *
 * 纯函数：只做校验与裁剪，不写 store —— 备份预览要能在「不落地」的前提下
 * 先算清「会恢复多少条」。非法项一律丢弃，不因一条脏数据整份失败。
 * 入参不是对象时返回 null（表示这份备份没有互动数据段）。
 */
export function parseInteractionSnapshot(input: unknown): InteractionSnapshot | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as Record<string, unknown>

  const favorites: Record<string, boolean> = {}
  if (raw.favorites && typeof raw.favorites === 'object') {
    for (const [key, value] of Object.entries(raw.favorites as Record<string, unknown>)) {
      if (value === true && /^(album|video|article):/.test(key)) favorites[key] = true
    }
  }

  const videoProgress: Record<string, VideoProgress> = {}
  if (raw.videoProgress && typeof raw.videoProgress === 'object') {
    for (const [key, value] of Object.entries(raw.videoProgress as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue
      const item = value as Record<string, unknown>
      const time = Number(item.time)
      const duration = Number(item.duration)
      if (!Number.isFinite(time) || !Number.isFinite(duration) || duration <= 0) continue
      videoProgress[key] = {
        time: Math.min(Math.max(time, 0), duration),
        duration,
        updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString(),
      }
    }
  }

  const articleScroll: Record<string, number> = {}
  if (raw.articleScroll && typeof raw.articleScroll === 'object') {
    for (const [key, value] of Object.entries(raw.articleScroll as Record<string, unknown>)) {
      const y = Number(value)
      if (Number.isFinite(y) && y >= 0) articleScroll[key] = Math.round(y)
    }
  }

  const rawCheckin = (raw.checkin ?? {}) as Record<string, unknown>
  const lastDate =
    typeof rawCheckin.lastDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawCheckin.lastDate)
      ? rawCheckin.lastDate
      : ''
  const total = Number(rawCheckin.total)
  const checkin: CheckinState = {
    lastDate,
    total: Number.isFinite(total) && total >= 0 ? Math.floor(total) : 0,
  }

  return { favorites, videoProgress, articleScroll, checkin }
}

/**
 * 解析备份里的外观设置。
 * 风格不认识就整份放弃（半套设置会让页面停在「无皮肤」状态）；
 * 其余字段逐个回退到安全默认值。
 */
export function parseSettings(input: unknown): SiteSettings | null {
  if (!input || typeof input !== 'object') return null
  const o = input as Record<string, unknown>
  if (!oneOf(o.style, STYLE_KEYS)) return null
  return {
    style: o.style,
    theme: oneOf(o.theme, THEME_KEYS) ? o.theme : 'auto',
    accent: oneOf(o.accent, ACCENT_KEYS) ? o.accent : 'auto',
    fontSize: oneOf(o.fontSize, FONT_SIZE_KEYS) ? o.fontSize : 'md',
    animations: o.animations !== false,
    glass: o.glass !== false,
  }
}
