/**
 * 种子数据加载：静态 JSON + Markdown 文章（frontmatter 解析）。
 * 首次运行即有完整内容可看；用户数据由 dataSource 叠加。
 *
 * 注意：JSON 里的媒体地址是**运行时字符串**，不会经过 Vite 的 base 改写；
 * 统一在这里过一遍 `withBase()`，否则子路径部署（GitHub Pages）会 404。
 */
import albumsSeed from '@/data/albums.json'
import announcementsSeed from '@/data/announcements.json'
import carouselSeed from '@/data/carousel.json'
import videosSeed from '@/data/videos.json'
import type { Album, Announcement, Article, Slide, VideoItem } from '@/types'
import { withBase } from '@/utils/base'
import { estimateReadingMinutes } from '@/utils/format'

const mdModules = import.meta.glob('../data/articles/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** 极简 frontmatter 解析（key: value，支持 [a, b] 数组） */
function parseFrontmatter(raw: string): Record<string, string> {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  const meta: Record<string, string> = {}
  if (!match) return meta
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(':')
    if (idx <= 0) continue
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if (
      (value.startsWith('[') && value.endsWith(']')) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1)
    }
    meta[key] = value
  }
  return meta
}

function stripFrontmatter(raw: string): string {
  return raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
}

const seedArticles: Article[] = Object.values(mdModules)
  .map((raw) => {
    const meta = parseFrontmatter(raw)
    const content = stripFrontmatter(raw).trim()
    const tags = (meta.tags || '')
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean)
    return {
      id: meta.id || 'art-unknown',
      title: meta.title || '未命名文章',
      excerpt: meta.excerpt || content.slice(0, 120),
      cover: withBase(meta.cover || '/images/misc/class-card-bg.svg'),
      category: meta.category || '随笔',
      tags,
      author: meta.author || '匿名',
      createdAt: meta.createdAt || new Date().toISOString(),
      updatedAt: meta.updatedAt,
      readingMinutes: Number(meta.readingMinutes) || estimateReadingMinutes(content),
      content,
      source: 'seed' as const,
    } satisfies Article
  })
  .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

export const seedAlbums: Album[] = (albumsSeed as unknown as Album[]).map((album) => ({
  ...album,
  cover: withBase(album.cover),
  photos: (album.photos ?? []).map((photo) => ({ ...photo, src: withBase(photo.src) })),
}))

export const seedVideos: VideoItem[] = (videosSeed as unknown as VideoItem[]).map((video) => ({
  ...video,
  cover: withBase(video.cover),
  src: video.src ? withBase(video.src) : undefined,
}))

export const seedAnnouncements = announcementsSeed as unknown as Announcement[]

export const seedSlides: Slide[] = (carouselSeed as unknown as Slide[]).map((slide) => ({
  ...slide,
  image: withBase(slide.image),
}))

export { seedArticles }
