/** 全站共享类型定义 */
import type { IconName } from '@/components/common/icons'

export type ContentSource = 'seed' | 'user'

export interface Photo {
  id: string
  src: string
  caption?: string
  width?: number
  height?: number
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

export interface BackupPayload {
  version: 1
  exportedAt: string
  app: string
  data: UserContentBundle
}

export type ThemeMode = 'light' | 'dark' | 'auto'
export type AccentKey = 'blue' | 'green' | 'orange' | 'pink'
export type FontSizeKey = 'sm' | 'md' | 'lg'

export interface SiteSettings {
  theme: ThemeMode
  accent: AccentKey
  fontSize: FontSizeKey
  animations: boolean
  /** 液态玻璃（毛玻璃背景模糊）。低性能设备可关闭以降低合成开销 */
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
