/** 互动数据：收藏 / 视频进度 / 阅读位置 / 今日打卡（localStorage 持久化） */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { pad2 } from '@/utils/format'
import { getJSON, setJSON } from '@/utils/storage'

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

/** 备份文件里的互动数据（收藏 / 视频进度 / 阅读位置 / 打卡） */
export interface InteractionSnapshot {
  favorites: Record<string, boolean>
  videoProgress: Record<string, VideoProgress>
  articleScroll: Record<string, number>
  checkin: CheckinState
}

export type Kind = 'album' | 'video' | 'article'

/** 从未打卡的初始状态（导入 / 重置时复用同一份形状） */
const emptyCheckin = (): CheckinState => ({ lastDate: '', total: 0 })

export const useInteractionStore = defineStore('interaction', () => {
  const favorites = ref<Record<string, boolean>>(getJSON('favorites', {}))
  const videoProgress = ref<Record<string, VideoProgress>>(getJSON('videoProgress', {}))
  const articleScroll = ref<Record<string, number>>(getJSON('articleScroll', {}))

  /** 收藏键：`kind:id`，避免相册与文章 id 撞车 */
  const favoriteKey = (kind: Kind, id: string) => `${kind}:${id}`

  function isFavorite(kind: Kind, id: string): boolean {
    return Boolean(favorites.value[favoriteKey(kind, id)])
  }

  function toggleFavorite(kind: Kind, id: string): boolean {
    const key = favoriteKey(kind, id)
    const next = { ...favorites.value }
    const active = !next[key]
    // 取消收藏时删键而不是留一个 false，本地数据保持干净
    if (active) next[key] = true
    else delete next[key]
    favorites.value = next
    setJSON('favorites', next)
    return active
  }

  function setVideoProgress(id: string, time: number, duration: number) {
    if (!duration || time < 1) return
    videoProgress.value = {
      ...videoProgress.value,
      [id]: { time, duration, updatedAt: new Date().toISOString() },
    }
    setJSON('videoProgress', videoProgress.value)
  }

  function getVideoProgress(id: string): VideoProgress | undefined {
    return videoProgress.value[id]
  }

  function setArticleScroll(id: string, y: number) {
    articleScroll.value = { ...articleScroll.value, [id]: Math.round(y) }
    setJSON('articleScroll', articleScroll.value)
  }

  function getArticleScroll(id: string): number {
    return articleScroll.value[id] || 0
  }

  /* ─────────────── 今日打卡 ───────────────
   * 纯本地、无后端：只记最后一次打卡日期与累计天数。
   * 换设备或清缓存会丢，因此文案上不承诺"永久记录"。 */
  const checkin = ref<CheckinState>(getJSON('checkin', emptyCheckin()))

  /**
   * 本地时区的 YYYY-MM-DD。
   * ⚠️ 不能用 `toISOString().slice(0,10)` —— 那是 UTC，UTC+8 的凌晨会被算成前一天。
   */
  function todayKey(): string {
    const d = new Date()
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  }

  const checkedInToday = computed(() => checkin.value.lastDate === todayKey())

  /** 打卡。返回是否真的记录了（已打过则返回 false，天然防重复） */
  function checkIn(): boolean {
    if (checkedInToday.value) return false
    checkin.value = { lastDate: todayKey(), total: checkin.value.total + 1 }
    setJSON('checkin', checkin.value)
    return true
  }

  /** 备份用：导出全部互动数据 */
  function exportState(): InteractionSnapshot {
    return {
      favorites: { ...favorites.value },
      videoProgress: { ...videoProgress.value },
      articleScroll: { ...articleScroll.value },
      checkin: { ...checkin.value },
    }
  }

  /** 备份用：导入互动数据（防御性解析，非法项丢弃；旧备份没有这一段则跳过） */
  function importState(input: unknown): void {
    if (!input || typeof input !== 'object') return
    const raw = input as Record<string, unknown>

    const fav: Record<string, boolean> = {}
    if (raw.favorites && typeof raw.favorites === 'object') {
      for (const [key, value] of Object.entries(raw.favorites as Record<string, unknown>)) {
        if (value === true && /^(album|video|article):/.test(key)) fav[key] = true
      }
    }

    const progress: Record<string, VideoProgress> = {}
    if (raw.videoProgress && typeof raw.videoProgress === 'object') {
      for (const [key, value] of Object.entries(raw.videoProgress as Record<string, unknown>)) {
        if (!value || typeof value !== 'object') continue
        const item = value as Record<string, unknown>
        const time = Number(item.time)
        const duration = Number(item.duration)
        if (!Number.isFinite(time) || !Number.isFinite(duration) || duration <= 0) continue
        progress[key] = {
          time: Math.min(Math.max(time, 0), duration),
          duration,
          updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString(),
        }
      }
    }

    const scroll: Record<string, number> = {}
    if (raw.articleScroll && typeof raw.articleScroll === 'object') {
      for (const [key, value] of Object.entries(raw.articleScroll as Record<string, unknown>)) {
        const y = Number(value)
        if (Number.isFinite(y) && y >= 0) scroll[key] = Math.round(y)
      }
    }

    const rawCheckin = (raw.checkin ?? {}) as Record<string, unknown>
    const lastDate =
      typeof rawCheckin.lastDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawCheckin.lastDate)
        ? rawCheckin.lastDate
        : ''
    const total = Number(rawCheckin.total)
    const totalSafe = Number.isFinite(total) && total >= 0 ? Math.floor(total) : 0

    favorites.value = fav
    videoProgress.value = progress
    articleScroll.value = scroll
    checkin.value = { lastDate, total: totalSafe }
    setJSON('favorites', favorites.value)
    setJSON('videoProgress', videoProgress.value)
    setJSON('articleScroll', articleScroll.value)
    setJSON('checkin', checkin.value)
  }

  function resetAll() {
    favorites.value = {}
    videoProgress.value = {}
    articleScroll.value = {}
    checkin.value = emptyCheckin()
    setJSON('favorites', {})
    setJSON('videoProgress', {})
    setJSON('articleScroll', {})
    setJSON('checkin', checkin.value)
  }

  return {
    favorites,
    videoProgress,
    articleScroll,
    checkin,
    checkedInToday,
    checkIn,
    isFavorite,
    toggleFavorite,
    setVideoProgress,
    getVideoProgress,
    setArticleScroll,
    getArticleScroll,
    resetAll,
    exportState,
    importState,
  }
})
