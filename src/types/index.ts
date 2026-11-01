/** 全站共享类型定义 */
import type { IconName } from '@/components/common/icons'

export type ContentSource = 'seed' | 'user'

export interface Photo {
  id: string
  src: string
  caption?: string
  /** 拍摄/收录时间；缺省时按所属相册的 createdAt 归档（见相册时间轴） */
  takenAt?: string
  width?: number
  height?: number
  /** 多尺寸描述（"img-800.webp 800w, img-1600.webp 1600w"），配 sizes 使用；
   *  占位图阶段为空，真实照片上线后在数据层补上，组件会自动透传 */
  srcset?: string
  sizes?: string
}

export interface Album {
  id: string
  title: string
  description: string
  cover: string
  category: string
  tags: string[]
  photos: Photo[]
  author: string
  createdAt: string
  source: ContentSource
  draft?: boolean
}

export interface VideoItem {
  id: string
  title: string
  description: string
  cover: string
  category: string
  tags: string[]
  author: string
  createdAt: string
  /** 本地 / 同源视频地址，也可能是 idb: 前缀的 IndexedDB 引用 */
  src?: string
  /** 外链播放器（Bilibili / YouTube iframe） */
  embedUrl?: string
  /** 仅跳转的外部链接 */
  externalUrl?: string
  duration?: string
  source: ContentSource
  draft?: boolean
}

export interface Article {
  id: string
  title: string
  excerpt: string
  cover: string
  category: string
  tags: string[]
  author: string
  createdAt: string
  updatedAt?: string
  readingMinutes: number
  /** Markdown 原文 */
  content: string
  source: ContentSource
  draft?: boolean
}

export interface Announcement {
  id: string
  title: string
  content: string
  createdAt: string
  pinned?: boolean
  level?: 'info' | 'success' | 'warning'
  source: ContentSource
}

export interface Slide {
  id: string
  image: string
  title: string
  subtitle?: string
  link?: string
}

export interface Honor {
  id: string
  title: string
  level: string
  date: string
  description: string
  /** 线性图标名（见 components/common/icons.ts） */
  icon: IconName
}

export interface TimelineNode {
  id: string
  date: string
  title: string
  description: string
  tag?: string
}

export interface ClassInfo {
  school: string
  fullName: string
  shortName: string
  grade: string
  slogan: string
  foundedAt: string
  graduationAt: string
  /** 中考开始时间（首页倒计时用） */
  examAt: string
  teacher: string
  description: string
  stats: { label: string; value: string }[]
}

export interface UserContentBundle {
  albums: Album[]
  videos: VideoItem[]
  articles: Article[]
  announcements: Announcement[]
}

/* ------------------------------------------------------------------ */
/* 互动数据（收藏 / 视频进度 / 阅读位置 / 打卡）                        */
/* ------------------------------------------------------------------ */

export interface VideoProgress {
  time: number
  duration: number
  updatedAt: string
}

/** 今日打卡：只存最后一次打卡日期与累计天数 */
export interface CheckinState {
  /** 本地时区的 YYYY-MM-DD；空字符串表示从未打卡 */
  lastDate: string
  total: number
}

/** 备份文件里的互动数据 */
export interface InteractionSnapshot {
  favorites: Record<string, boolean>
  videoProgress: Record<string, VideoProgress>
  articleScroll: Record<string, number>
  checkin: CheckinState
}

/* ------------------------------------------------------------------ */
/* 备份                                                                */
/* ------------------------------------------------------------------ */

/** 备份内容的规模摘要，用于列表与恢复预览（不需要展开正文就能看懂） */
export interface BackupSummary {
  albums: number
  /** 相册内的照片总数 */
  photos: number
  videos: number
  articles: number
  announcements: number
  favorites: number
}

/**
 * 备份文件。
 *
 * - v1：只有 `data`（早期版本）
 * - v2：`data` + `interaction`（收藏 / 进度），由设置页导出
 * - v3：再加 `settings`（外观）与 `checksum` / `summary`，由备份中心导出
 *
 * 解析时对缺失字段一律宽容：旧备份照样能恢复，只是少了那部分。
 */
export interface BackupPayload {
  version: number
  exportedAt: string
  app: string
  data: UserContentBundle
  interaction?: InteractionSnapshot
  settings?: SiteSettings
  /** 内容校验和（FNV-1a 32 位，见 utils/backup.ts） */
  checksum?: string
  summary?: BackupSummary
}

export type ThemeMode = 'light' | 'dark' | 'auto'
/** 视觉风格（皮肤）。四套共用同一份 DOM 与逻辑。 */
export type StyleKey = 'campus' | 'annual' | 'japandi' | 'brutal' | 'legacy'
/** auto = 跟随当前风格；其余为显式覆盖 */
export type AccentKey = 'auto' | 'blue' | 'green' | 'orange' | 'pink'
export type FontSizeKey = 'sm' | 'md' | 'lg'

export interface SiteSettings {
  style: StyleKey
  theme: ThemeMode
  accent: AccentKey
  fontSize: FontSizeKey
  animations: boolean
  /** 液态玻璃（毛玻璃背景模糊）。原版风格下生效最明显，低性能设备可关闭 */
  glass: boolean
}

/**
 * 「随机回忆」拍立得用的照片视图模型。
 *
 * 注意：照片数据本身只有 `{ id, src, caption }`，**没有拍摄日期**；
 * `date` 取的是所属相册的 `createdAt`，所以界面上写「收录于」而不是「拍摄于」。
 */
export interface PolaroidPhoto {
  id: string
  src: string
  caption: string
  albumTitle: string
  /** 所属相册的 createdAt（ISO 字符串） */
  date: string
}
