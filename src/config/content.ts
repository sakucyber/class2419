/**
 * 内容类别元数据：搜索、收藏、列表页共用一份文案与图标。
 *
 * 之前「相册 / 视频 / 文章」这三组标签在搜索浮层、搜索页、收藏页各写了一遍，
 * 改文案要同步三处；集中到这里后只留一处。
 */
import type { IconName } from '@/components/common/icons'

/** 可被收藏、可被搜索的内容类别 */
export type ContentKind = 'album' | 'video' | 'article'

export interface KindMeta {
  /** 中文类别名 */
  label: string
  icon: IconName
  /** 列表页路径 */
  route: string
}

export const KIND_META: Record<ContentKind, KindMeta> = {
  album: { label: '相册', icon: 'image', route: '/albums' },
  video: { label: '视频', icon: 'video', route: '/videos' },
  article: { label: '文章', icon: 'article', route: '/articles' },
}

/** 搜索结果里还会出现「标签」这一伪类别 */
export type SearchType = ContentKind | 'tag'

export const SEARCH_TYPE_LABEL: Record<SearchType, string> = {
  album: KIND_META.album.label,
  video: KIND_META.video.label,
  article: KIND_META.article.label,
  tag: '标签',
}

/** 搜索面板里按这个顺序排筛选项 */
export const SEARCH_TYPES: SearchType[] = ['album', 'video', 'article', 'tag']
