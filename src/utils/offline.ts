/**
 * 离线能力探测：Service Worker 状态、Cache Storage 统计、存储配额。
 *
 * 这些数字全部来自浏览器，不依赖后端：
 * - 版本号：直接问正在控制页面的 SW（它会回自己的缓存名，末尾就是构建号）
 * - 资源数量 / 体积：遍历 Cache Storage
 * - 「最新版本」：拉一次 `version.json`（构建时生成），用来判断当前是否落后
 */
import { withBase } from '@/utils/base'

/** 与 public/sw.js 的 CACHE_PREFIX 保持一致 */
export const CACHE_PREFIX = 'cls2419-v2-'

export type CacheTypeKey = 'js' | 'css' | 'image' | 'font' | 'html' | 'other'

export interface CacheTypeStat {
  key: CacheTypeKey
  label: string
  count: number
  bytes: number
}

export interface CacheReport {
  /** 命中的应用缓存名（更新过程中可能不止一个） */
  names: string[]
  /** 当前控制器报告的构建号；拿不到时为 null */
  version: string | null
  entries: number
  bytes: number
  types: CacheTypeStat[]
}

const TYPE_LABEL: Record<CacheTypeKey, string> = {
  js: '脚本',
  css: '样式',
  image: '图片',
  font: '字体',
  html: '页面',
  other: '其他',
}

function classify(pathname: string): CacheTypeKey {
  if (/\.(js|mjs)$/i.test(pathname)) return 'js'
  if (/\.css$/i.test(pathname)) return 'css'
  if (/\.(woff2?|ttf|otf)$/i.test(pathname)) return 'font'
  if (/\.(png|jpe?g|svg|webp|avif|gif|ico)$/i.test(pathname)) return 'image'
  if (/\.html?$/i.test(pathname)) return 'html'
  return 'other'
}

function appCacheNames(keys: string[]): string[] {
  return keys.filter((name) => name.startsWith(CACHE_PREFIX))
}

/** 问 Service Worker 自己：你正在用哪个缓存？（用 MessageChannel 拿回包） */
function askWorkerVersion(worker: ServiceWorker | null): Promise<string | null> {
  if (!worker) return Promise.resolve(null)
  return new Promise((resolve) => {
    const channel = new MessageChannel()
    const timer = window.setTimeout(() => resolve(null), 800)
    channel.port1.onmessage = (event) => {
      window.clearTimeout(timer)
      const data = event.data as { type?: string; build?: string } | null
      resolve(data?.type === 'SW_VERSION' && typeof data.build === 'string' ? data.build : null)
    }
    try {
      worker.postMessage({ type: 'GET_VERSION' }, [channel.port2])
    } catch {
      window.clearTimeout(timer)
      resolve(null)
    }
  })
}

/**
 * 统计缓存内容。
 *
 * 体积是逐条读 blob 累加的（Cache API 不提供 size）。资源总数在 100~200 这个量级，
 * 一次读下来几百毫秒；超过 600 条就跳过逐条统计，只用总配额里的 usage 兜底，
 * 避免老设备上页面卡住。
 */
export async function readCacheReport(): Promise<CacheReport | null> {
  if (typeof caches === 'undefined') return null
  const names = appCacheNames(await caches.keys())
  if (!names.length) return null

  let entries = 0
  const byType = new Map<CacheTypeKey, { count: number; bytes: number }>()
  let bytes = 0
  const detailed = names.length <= 2

  for (const name of names) {
    const cache = await caches.open(name)
    const requests = await cache.keys()
    entries += requests.length
    for (const request of requests) {
      const key = classify(new URL(request.url).pathname)
      const stat = byType.get(key) ?? { count: 0, bytes: 0 }
      stat.count += 1
      let size = 0
      if (detailed && entries <= 600) {
        const response = await cache.match(request)
        if (response) {
          try {
            size = (await response.clone().blob()).size
          } catch {
            size = 0
          }
        }
      }
      stat.bytes += size
      byType.set(key, stat)
      bytes += size
    }
  }

  const order: CacheTypeKey[] = ['js', 'css', 'image', 'font', 'html', 'other']
  const types = order
    .map((key) => {
      const stat = byType.get(key)
      return stat
        ? { key, label: TYPE_LABEL[key], count: stat.count, bytes: stat.bytes }
        : { key, label: TYPE_LABEL[key], count: 0, bytes: 0 }
    })
    .filter((item) => item.count > 0)

  return { names, version: null, entries, bytes, types }
}

export interface ServiceWorkerStatus {
  supported: boolean
  registered: boolean
  /** 页面是否已被 SW 接管（首次访问时可能还没接管） */
  controlled: boolean
  active: boolean
  waiting: boolean
  installing: boolean
  scope: string
  /** 当前控制器的构建号 */
  version: string | null
  /** 待接管新版本的构建号 */
  waitingVersion: string | null
}

export async function readServiceWorkerStatus(): Promise<ServiceWorkerStatus> {
  const supported = typeof navigator !== 'undefined' && 'serviceWorker' in navigator
  const empty: ServiceWorkerStatus = {
    supported,
    registered: false,
    controlled: false,
    active: false,
    waiting: false,
    installing: false,
    scope: '',
    version: null,
    waitingVersion: null,
  }
  if (!supported) return empty

  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) return empty

  const version = await askWorkerVersion(registration.active ?? navigator.serviceWorker.controller)
  const waitingVersion = registration.waiting ? await askWorkerVersion(registration.waiting) : null

  return {
    supported,
    registered: true,
    controlled: Boolean(navigator.serviceWorker.controller),
    active: Boolean(registration.active),
    waiting: Boolean(registration.waiting),
    installing: Boolean(registration.installing),
    scope: registration.scope,
    version,
    waitingVersion,
  }
}

/** 手动检查更新（浏览器也会自己查，这里给用户一个「现在就看」的入口） */
export async function checkForUpdate(): Promise<'unsupported' | 'latest' | 'available'> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return 'unsupported'
  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) return 'unsupported'
  try {
    await registration.update()
  } catch {
    /* 离线时 update 会失败，视为没有更新 */
    return 'latest'
  }
  const pending = Boolean(registration.waiting || registration.installing)
  return pending ? 'available' : 'latest'
}

/** 删掉本应用的缓存，返回删掉的名字（不动 Service Worker 注册本身） */
export async function clearAppCaches(): Promise<string[]> {
  if (typeof caches === 'undefined') return []
  const names = appCacheNames(await caches.keys())
  await Promise.all(names.map((name) => caches.delete(name)))
  return names
}

/** 存储配额与已用量（含 Cache Storage / IndexedDB / localStorage） */
export async function readStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate()
    return { usage, quota }
  } catch {
    return null
  }
}

/** 拉取构建时生成的版本清单（判断线上是否有比本地缓存更新的版本） */
export async function readLatestBuild(): Promise<{
  buildId: string
  builtAt: string
  assets: number
} | null> {
  try {
    const res = await fetch(withBase('/version.json'), { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as { buildId?: unknown; builtAt?: unknown; assets?: unknown }
    if (typeof data.buildId !== 'string') return null
    return {
      buildId: data.buildId,
      builtAt: typeof data.builtAt === 'string' ? data.builtAt : '',
      assets: typeof data.assets === 'number' ? data.assets : 0,
    }
  } catch {
    return null
  }
}
