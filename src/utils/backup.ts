/**
 * 备份文件的构建、校验与「恢复前预览」。
 *
 * 这一层刻意做成纯函数：只处理数据结构，不碰 store / DOM。
 * 好处是「预检」可以在**不落地**的前提下先算清会恢复多少条、有没有篡改，
 * 用户确认后才由 `useBackupCenter` 真正写回。
 *
 * 版本演进：
 *   v1 只有 data；v2 加了 interaction；v3 再加 settings / checksum / summary。
 *   解析一律向下兼容，缺什么就跳过什么，并在 warnings 里说明。
 */
import type {
  BackupPayload,
  BackupSummary,
  InteractionSnapshot,
  SiteSettings,
  UserContentBundle,
} from '@/types'
import { parseBackupPayload, parseInteractionSnapshot, parseSettings } from '@/utils/validate'

/** 当前导出格式版本 */
export const BACKUP_VERSION = 3
export const BACKUP_APP = 'xinwuling-class-2419'

export interface BackupSource {
  data: UserContentBundle
  interaction: InteractionSnapshot
  settings: SiteSettings
}

/** 规模摘要：列表与预览都靠它，不需要展开正文 */
export function summarize(
  data: UserContentBundle,
  interaction?: InteractionSnapshot,
): BackupSummary {
  const photos = data.albums.reduce((sum, album) => sum + (album.photos?.length ?? 0), 0)
  return {
    albums: data.albums.length,
    photos,
    videos: data.videos.length,
    articles: data.articles.length,
    announcements: data.announcements.length,
    favorites: interaction ? Object.values(interaction.favorites).filter(Boolean).length : 0,
  }
}

/**
 * 键名排序后再序列化。
 *
 * 校验和必须与「键的书写顺序 / 缩进格式」无关：用户可能用编辑器格式化过 JSON，
 * 也可能用 jq 重排过键；只要内容一样，校验和就不该变。
 */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`
  }
  return value === undefined ? 'null' : (JSON.stringify(value) ?? 'null')
}

/**
 * 内容校验和（FNV-1a 32 位）。
 *
 * 不是加密签名，只用来发现「文件被改过 / 传坏了」这类问题；
 * 真要防篡改得靠签名，纯前端站点没有密钥可用。
 */
export function checksumOf(parts: {
  data: unknown
  interaction?: unknown
  settings?: unknown
}): string {
  const data = (parts.data ?? {}) as Record<string, unknown>
  const canonical = stableStringify({
    data: {
      albums: data.albums ?? [],
      videos: data.videos ?? [],
      articles: data.articles ?? [],
      announcements: data.announcements ?? [],
    },
    interaction: parts.interaction ?? null,
    settings: parts.settings ?? null,
  })

  let hash = 0x811c9dc5
  for (let i = 0; i < canonical.length; i += 1) {
    hash ^= canonical.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

/** 由当前状态组装一份完整备份 */
export function buildBackup(
  source: BackupSource,
  exportedAt = new Date().toISOString(),
): BackupPayload {
  const payload: BackupPayload = {
    version: BACKUP_VERSION,
    app: BACKUP_APP,
    exportedAt,
    data: source.data,
    interaction: source.interaction,
    settings: source.settings,
  }
  payload.summary = summarize(source.data, source.interaction)
  payload.checksum = checksumOf(payload)
  return payload
}

export interface ChecksumResult {
  /** 文件里声明的校验和（老备份没有这一项） */
  declared: string | null
  computed: string
  /** null = 文件没有声明校验和，无法判断 */
  ok: boolean | null
}

export interface BackupInspection {
  /** 归一化后的 v3 结构，可直接交给恢复逻辑 */
  payload: BackupPayload
  version: number
  exportedAt: string
  summary: BackupSummary
  hasInteraction: boolean
  hasSettings: boolean
  checksum: ChecksumResult
  /** 需要用户注意的地方（不含致命错误；致命错误由 parseBackupPayload 抛出） */
  warnings: string[]
  /** 文件体积（字节），来自 File.size 或序列化估算 */
  bytes: number
}

/**
 * 预检一份备份：解析、归一化、算校验和、列出风险。
 *
 * 解析失败会抛出带可读消息的 Error（来自 validate.ts 的 ValidationError），
 * 调用方直接把 message 显示出来即可。
 */
export function inspectBackup(input: unknown, bytes = 0): BackupInspection {
  const envelope = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const base = parseBackupPayload(input)

  const interaction = parseInteractionSnapshot(envelope.interaction)
  const settings = parseSettings(envelope.settings)

  const rawData = (envelope.data ?? envelope) as Record<string, unknown>
  const computed = checksumOf({
    data: rawData,
    interaction: envelope.interaction,
    settings: envelope.settings,
  })
  const declared = typeof envelope.checksum === 'string' ? envelope.checksum : null

  const warnings: string[] = []
  if (!interaction) warnings.push('这份备份不含互动数据（收藏 / 观看进度 / 阅读位置 / 打卡）。')
  if (!settings) warnings.push('不含外观设置，恢复后会保留当前的主题与视觉风格。')
  if (base.version < BACKUP_VERSION) {
    warnings.push(`备份格式为 v${base.version}，比当前版本旧，只能恢复其中包含的部分。`)
  }
  if (declared && declared !== computed) {
    warnings.push('校验和不匹配：文件可能被修改或传输损坏，请确认来源后再恢复。')
  }
  if (!bytes) {
    try {
      bytes = JSON.stringify(input).length
    } catch {
      bytes = 0
    }
  }

  return {
    payload: {
      ...base,
      interaction: interaction ?? undefined,
      settings: settings ?? undefined,
      checksum: declared ?? undefined,
      summary: summarize(base.data, interaction ?? undefined),
    },
    version: base.version,
    exportedAt: base.exportedAt,
    summary: summarize(base.data, interaction ?? undefined),
    hasInteraction: Boolean(interaction),
    hasSettings: Boolean(settings),
    checksum: { declared, computed, ok: declared ? declared === computed : null },
    warnings,
    bytes,
  }
}

/** 备份文件名：class2419-backup-20261101-1530.json */
export function backupFileName(at = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const day = `${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}`
  const clock = `${pad(at.getHours())}${pad(at.getMinutes())}`
  return `class2419-backup-${day}-${clock}.json`
}
