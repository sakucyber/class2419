/** 通用格式化与节流 / 防抖工具 */

/** 两位补零：日期、时长、备份文件名共用 */
export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function formatDate(iso: string, withTime = false): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const date = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  if (!withTime) return date
  return `${date} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/** 本地时区的「年-月」，用于按年月归档（相册时间轴） */
export function monthKey(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '0000-00'
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
}

/** '2025-10' → '2025 年 10 月'；解析失败时原样返回 */
export function monthLabel(key: string): string {
  const [year, month] = key.split('-')
  const m = Number(month)
  if (!year || !Number.isFinite(m)) return key
  return `${year} 年 ${m} 月`
}

/** 人类可读的字节数（备份大小、缓存体积） */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / 1024 ** index
  // 个位数保留一位小数（1.2 MB），三位数取整（120 KB）
  return `${value >= 100 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`
}

export function formatRelative(iso: string): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return iso
  const diff = Date.now() - t
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < minute) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`
  return formatDate(iso)
}

/** 参数元组从原函数推导，调用方不丢类型，也不需要 any */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, wait = 250) {
  let timer: ReturnType<typeof setTimeout> | null = null
  return Object.assign(
    (...args: A) => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        fn(...args)
      }, wait)
    },
    {
      cancel() {
        if (timer) clearTimeout(timer)
        timer = null
      },
    },
  )
}

export function throttle<A extends unknown[]>(fn: (...args: A) => void, wait = 100) {
  let last = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: A) => {
    const now = Date.now()
    const remaining = wait - (now - last)
    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      last = now
      fn(...args)
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now()
        timer = null
        fn(...args)
      }, remaining)
    }
  }
}

/** 估算阅读时长（中文约 400 字/分钟） */
export function estimateReadingMinutes(text: string): number {
  const words = text.replace(/\s+/g, '').length
  return Math.max(1, Math.round(words / 400))
}
