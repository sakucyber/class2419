/** 互动数据：收藏 / 视频进度 / 阅读位置 / 今日打卡（localStorage 持久化） */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import type { CheckinState, InteractionSnapshot, VideoProgress } from '@/types'
import { pad2 } from '@/utils/format'
import { getJSON, setJSON } from '@/utils/storage'
import { parseInteractionSnapshot } from '@/utils/validate'

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

  /** 写入一份互动数据（整合并覆盖两种恢复方式共用） */
  function applyState(snapshot: InteractionSnapshot): void {
    favorites.value = snapshot.favorites
    videoProgress.value = snapshot.videoProgress
    articleScroll.value = snapshot.articleScroll
    checkin.value = snapshot.checkin
    setJSON('favorites', favorites.value)
    setJSON('videoProgress', videoProgress.value)
    setJSON('articleScroll', articleScroll.value)
    setJSON('checkin', checkin.value)
  }

  /** 备份用：导入互动数据（整份替换；旧备份没有这一段时跳过） */
  function importState(input: unknown): void {
    const snapshot = parseInteractionSnapshot(input)
    if (!snapshot) return
    applyState(snapshot)
  }

  /**
   * 备份用：合并互动数据。
   * 收藏取并集；观看进度按 updatedAt 取较新的一条；阅读位置取更靠后的；
   * 打卡取更晚的日期与更大的累计值 —— 任何时候都不该因为恢复而丢进度。
   */
  function mergeState(input: unknown): void {
    const snapshot = parseInteractionSnapshot(input)
    if (!snapshot) return

    const favoritesNext = { ...favorites.value, ...snapshot.favorites }

    const videoProgressMap = { ...videoProgress.value }
    for (const [id, item] of Object.entries(snapshot.videoProgress)) {
      const current = videoProgressMap[id]
      if (!current || item.updatedAt >= current.updatedAt) videoProgressMap[id] = item
    }

    const articleScrollMap = { ...articleScroll.value }
    for (const [id, y] of Object.entries(snapshot.articleScroll)) {
      articleScrollMap[id] = Math.max(articleScrollMap[id] ?? 0, y)
    }

    const later = snapshot.checkin.lastDate >= checkin.value.lastDate
    const checkinNext = {
      lastDate: later ? snapshot.checkin.lastDate : checkin.value.lastDate,
      total: Math.max(checkin.value.total, snapshot.checkin.total),
    }

    applyState({
      favorites: favoritesNext,
      videoProgress: videoProgressMap,
      articleScroll: articleScrollMap,
      checkin: checkinNext,
    })
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
    mergeState,
  }
})
