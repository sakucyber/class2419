/** 互动数据：点赞 / 收藏 / 视频进度 / 阅读位置（localStorage 持久化） */
import { defineStore } from 'pinia'
import { ref } from 'vue'

import { getJSON, setJSON } from '@/utils/storage'

export interface VideoProgress {
  time: number
  duration: number
  updatedAt: string
}

export type Kind = 'album' | 'video' | 'article'

export const useInteractionStore = defineStore('interaction', () => {
  const likes = ref<Record<string, boolean>>(getJSON('likes', {}))
  const favorites = ref<Record<string, boolean>>(getJSON('favorites', {}))
  const videoProgress = ref<Record<string, VideoProgress>>(getJSON('videoProgress', {}))
  const articleScroll = ref<Record<string, number>>(getJSON('articleScroll', {}))

  const likeKey = (kind: Kind, id: string) => `${kind}:${id}`

  function isLiked(kind: Kind, id: string) {
    return !!likes.value[likeKey(kind, id)]
  }
  function isFavorite(kind: Kind, id: string) {
    return !!favorites.value[likeKey(kind, id)]
  }

  function toggleLike(kind: Kind, id: string): boolean {
    const key = likeKey(kind, id)
    likes.value = { ...likes.value, [key]: !likes.value[key] }
    if (!likes.value[key]) delete likes.value[key]
    setJSON('likes', likes.value)
    return isLiked(kind, id)
  }

  function toggleFavorite(kind: Kind, id: string): boolean {
    const key = likeKey(kind, id)
    favorites.value = { ...favorites.value, [key]: !favorites.value[key] }
    if (!favorites.value[key]) delete favorites.value[key]
    setJSON('favorites', favorites.value)
    return isFavorite(kind, id)
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

  function resetAll() {
    likes.value = {}
    favorites.value = {}
    videoProgress.value = {}
    articleScroll.value = {}
    setJSON('likes', {})
    setJSON('favorites', {})
    setJSON('videoProgress', {})
    setJSON('articleScroll', {})
  }

  return {
    likes,
    favorites,
    videoProgress,
    articleScroll,
    isLiked,
    isFavorite,
    toggleLike,
    toggleFavorite,
    setVideoProgress,
    getVideoProgress,
    setArticleScroll,
    getArticleScroll,
    resetAll,
  }
})
