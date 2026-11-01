/**
 * 备份「历史版本」仓库（IndexedDB）。
 *
 * 为什么单独开一个库：媒体 blob 在 `cls2419-media`，若为了多一个 store 去升级
 * 它的版本号，老浏览器上容易在 upgrade 阶段卡住；分开也避免「清理媒体缓存」误伤备份。
 *
 * 存储分两层：
 *   meta  —— 列表只需要它（时间 / 标签 / 规模 / 体积），不读正文
 *   data  —— 完整 payload，只有「预览 / 恢复 / 下载」时才按 id 取
 * 这样列出 10 个历史版本不会把几 MB 的 JSON 全读进内存。
 */
import type { BackupPayload, BackupSummary } from '@/types'

export type SnapshotKind = 'manual' | 'auto' | 'reset'

export interface SnapshotMeta {
  id: string
  createdAt: string
  label: string
  kind: SnapshotKind
  version: number
  summary: BackupSummary
  /** 序列化后的字节数（估算） */
  bytes: number
}

const DB_NAME = 'cls2419-backup'
const DB_VERSION = 1
const META_STORE = 'meta'
const DATA_STORE = 'data'

/** 最多保留的历史版本数：再多也没有恢复价值，还会占配额 */
export const MAX_SNAPSHOTS = 10

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('当前浏览器不支持 IndexedDB，无法保存历史版本'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(META_STORE))
        db.createObjectStore(META_STORE, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(DATA_STORE)) db.createObjectStore(DATA_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('打开备份库失败'))
    req.onblocked = () => reject(new Error('备份库被其它标签页占用，请关闭后重试'))
  })
  return dbPromise
}

function requestOf<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB 操作失败'))
  })
}

function completed(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB 事务失败'))
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB 事务被中止'))
  })
}

/** 生成快照 id（时间前缀便于排序，后缀防同毫秒碰撞） */
export function snapshotId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export async function saveSnapshot(meta: SnapshotMeta, payload: BackupPayload): Promise<void> {
  const db = await openDB()
  const tx = db.transaction([META_STORE, DATA_STORE], 'readwrite')
  tx.objectStore(META_STORE).put(meta)
  tx.objectStore(DATA_STORE).put(payload, meta.id)
  await completed(tx)
}

/** 时间倒序（最新在前） */
export async function listSnapshots(): Promise<SnapshotMeta[]> {
  const db = await openDB()
  const tx = db.transaction(META_STORE, 'readonly')
  const all = await requestOf(tx.objectStore(META_STORE).getAll() as IDBRequest<SnapshotMeta[]>)
  return all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export async function readSnapshotPayload(id: string): Promise<BackupPayload | undefined> {
  const db = await openDB()
  const tx = db.transaction(DATA_STORE, 'readonly')
  return requestOf(tx.objectStore(DATA_STORE).get(id) as IDBRequest<BackupPayload | undefined>)
}

export async function deleteSnapshot(id: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction([META_STORE, DATA_STORE], 'readwrite')
  tx.objectStore(META_STORE).delete(id)
  tx.objectStore(DATA_STORE).delete(id)
  await completed(tx)
}

export async function clearSnapshots(): Promise<void> {
  const db = await openDB()
  const tx = db.transaction([META_STORE, DATA_STORE], 'readwrite')
  tx.objectStore(META_STORE).clear()
  tx.objectStore(DATA_STORE).clear()
  await completed(tx)
}

/** 只保留最新的 max 份，返回被删掉的条数 */
export async function pruneSnapshots(max = MAX_SNAPSHOTS): Promise<number> {
  const list = await listSnapshots()
  const extra = list.slice(max)
  for (const meta of extra) await deleteSnapshot(meta.id)
  return extra.length
}
