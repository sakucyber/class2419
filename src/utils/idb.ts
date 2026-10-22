/**
 * 极简 IndexedDB 封装：兼容历史上传的本地视频 Blob（`idb:` 引用）。
 *
 * 现在没有上传入口（管理后台已下线），但用户浏览器里可能还留着旧数据，
 * 详情页仍会把 `idb:xxx` 解析成 objectURL；导出/重置时也需要遍历这个库。
 */

const DB_NAME = 'cls2419-media'
const STORE = 'blobs'
const DB_VERSION = 1

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

export async function getBlob(key: string): Promise<Blob | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(key)
    req.onsuccess = () => resolve(req.result as Blob | undefined)
    req.onerror = () => reject(req.error)
  })
}

export async function deleteBlob(key: string): Promise<void> {
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function clearBlobs(): Promise<void> {
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

const objectUrlCache = new Map<string, string>()

/** 解析媒体地址：`idb:xxx` -> objectURL；其余原样返回 */
export async function resolveMediaUrl(src: string | undefined): Promise<string | undefined> {
  if (!src) return src
  if (!src.startsWith('idb:')) return src
  const key = src.slice(4)
  const cached = objectUrlCache.get(key)
  if (cached) return cached
  const blob = await getBlob(key)
  if (!blob) return undefined
  const url = URL.createObjectURL(blob)
  objectUrlCache.set(key, url)
  return url
}

/** 释放由本模块创建的 objectURL（内容删除时调用） */
export function revokeMediaUrl(src: string | undefined): void {
  if (!src || !src.startsWith('idb:')) return
  const key = src.slice(4)
  const url = objectUrlCache.get(key)
  if (url) {
    URL.revokeObjectURL(url)
    objectUrlCache.delete(key)
  }
}
