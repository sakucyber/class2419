/**
 * 备份中心的编排层。
 *
 * 纯数据逻辑在 `utils/backup.ts`（可单测），持久化在 `utils/backupStore.ts`；
 * 这里只负责把「三个 store + IndexedDB + 文件下载」串成页面能直接用的动作。
 *
 * 两条安全底线：
 *   1. 任何会**覆盖或清空**本地数据的操作，先自动留一份快照（`auto` / `reset`）；
 *   2. 恢复前必须经过 `inspectBackup` 预检，页面拿到的是「会恢复什么」而不是裸 JSON。
 */
import { computed, ref } from 'vue'

import { useContentStore } from '@/store/content'
import { useInteractionStore } from '@/store/interaction'
import { useSettingsStore } from '@/store/settings'
import type { BackupPayload } from '@/types'
import { backupFileName, buildBackup, inspectBackup, type BackupInspection } from '@/utils/backup'
import {
  deleteSnapshot,
  listSnapshots,
  MAX_SNAPSHOTS,
  pruneSnapshots,
  readSnapshotPayload,
  saveSnapshot,
  snapshotId,
  type SnapshotKind,
  type SnapshotMeta,
} from '@/utils/backupStore'
import { readStorageEstimate } from '@/utils/offline'

export type RestoreMode = 'merge' | 'replace'

/** 历史版本的来源标签 */
export const KIND_LABEL: Record<SnapshotKind, string> = {
  manual: '手动',
  auto: '自动',
  reset: '清空前',
}

function download(payload: BackupPayload, filename: string): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function sizeOf(payload: BackupPayload): number {
  try {
    return new Blob([JSON.stringify(payload)]).size
  } catch {
    return 0
  }
}

export function useBackupCenter() {
  const content = useContentStore()
  const interaction = useInteractionStore()
  const settings = useSettingsStore()

  const snapshots = ref<SnapshotMeta[]>([])
  const busy = ref('')
  const error = ref('')
  const notice = ref('')
  const storage = ref<{ usage: number; quota: number } | null>(null)

  const latest = computed(() => snapshots.value[0] ?? null)

  function clearMessages(): void {
    error.value = ''
    notice.value = ''
  }

  async function refresh(): Promise<void> {
    try {
      snapshots.value = await listSnapshots()
    } catch (e) {
      error.value = e instanceof Error ? e.message : '读取历史版本失败'
    }
    storage.value = await readStorageEstimate()
  }

  /** 用当前状态组装一份完整备份 */
  async function buildCurrent(): Promise<BackupPayload> {
    const envelope = await content.exportAll()
    return buildBackup({
      data: envelope.data,
      interaction: interaction.exportState(),
      settings: { ...settings.settings },
    })
  }

  /**
   * 立即创建一份快照。
   * @param kind 来源（手动 / 恢复前自动 / 清空前）
   * @param label 覆盖默认标签
   * @param silent 内部调用时不弹成功提示
   */
  async function createSnapshot(
    kind: SnapshotKind = 'manual',
    label?: string,
    silent = false,
  ): Promise<SnapshotMeta | null> {
    try {
      const payload = await buildCurrent()
      const meta: SnapshotMeta = {
        id: snapshotId(),
        createdAt: new Date().toISOString(),
        label: label ?? (kind === 'manual' ? '手动快照' : KIND_LABEL[kind]),
        kind,
        version: payload.version,
        summary: payload.summary ?? {
          albums: 0,
          photos: 0,
          videos: 0,
          articles: 0,
          announcements: 0,
          favorites: 0,
        },
        bytes: sizeOf(payload),
      }
      await saveSnapshot(meta, payload)
      const pruned = await pruneSnapshots(MAX_SNAPSHOTS)
      await refresh()
      if (!silent) {
        notice.value = pruned
          ? `已创建快照（超出 ${MAX_SNAPSHOTS} 份上限，最旧的 ${pruned} 份已清理）`
          : '已创建快照，保存在本机浏览器里'
      }
      return meta
    } catch (e) {
      error.value = e instanceof Error ? e.message : '创建快照失败'
      return null
    }
  }

  /** 导出当前完整备份（内容 + 互动 + 外观） */
  async function exportCurrent(): Promise<void> {
    busy.value = 'export'
    clearMessages()
    try {
      const payload = await buildCurrent()
      download(payload, backupFileName())
      notice.value = '备份已导出：内容、收藏/进度、外观设置都在同一个 JSON 里'
    } catch (e) {
      error.value = e instanceof Error ? e.message : '导出失败'
    } finally {
      busy.value = ''
    }
  }

  /** 读取某个历史版本并做预检（不落地） */
  async function inspectSnapshot(id: string): Promise<BackupInspection | null> {
    clearMessages()
    try {
      const payload = await readSnapshotPayload(id)
      if (!payload) {
        error.value = '这份快照的数据已丢失（可能被浏览器清理过）'
        return null
      }
      return inspectBackup(payload, sizeOf(payload))
    } catch (e) {
      error.value = e instanceof Error ? e.message : '读取快照失败'
      return null
    }
  }

  async function downloadSnapshot(id: string): Promise<void> {
    clearMessages()
    try {
      const payload = await readSnapshotPayload(id)
      if (!payload) {
        error.value = '这份快照的数据已丢失'
        return
      }
      const stamp = payload.exportedAt.replace(/[-:]/g, '').slice(0, 13)
      download(payload, `class2419-snapshot-${stamp}.json`)
      notice.value = '已下载这份历史版本'
    } catch (e) {
      error.value = e instanceof Error ? e.message : '下载失败'
    }
  }

  async function removeSnapshot(id: string): Promise<void> {
    clearMessages()
    try {
      await deleteSnapshot(id)
      await refresh()
      notice.value = '已删除这份历史版本'
    } catch (e) {
      error.value = e instanceof Error ? e.message : '删除失败'
    }
  }

  /** 读取用户选择的文件并预检 */
  async function inspectFile(file: File): Promise<BackupInspection | null> {
    clearMessages()
    try {
      const text = await file.text()
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        error.value = '这个文件不是有效的 JSON'
        return null
      }
      return inspectBackup(parsed, file.size)
    } catch (e) {
      error.value = e instanceof Error ? e.message : '读取文件失败'
      return null
    }
  }

  /**
   * 执行恢复。
   *
   * merge：内容同 id 覆盖、其余保留；收藏取并集、进度取较新、阅读位置取更远。
   * replace：内容整份替换，互动与外观也整份覆盖。
   * 两种模式都会先自动留一份「恢复前」快照。
   */
  async function restore(inspection: BackupInspection, mode: RestoreMode): Promise<boolean> {
    busy.value = 'restore'
    clearMessages()
    try {
      await createSnapshot('auto', mode === 'replace' ? '覆盖恢复前' : '合并恢复前', true)
      if (mode === 'replace') await content.replaceAll(inspection.payload)
      else await content.importAll(inspection.payload)

      if (inspection.payload.interaction) {
        if (mode === 'replace') interaction.importState(inspection.payload.interaction)
        else interaction.mergeState(inspection.payload.interaction)
      }
      if (inspection.payload.settings) {
        settings.settings = { ...settings.settings, ...inspection.payload.settings }
      }

      const { albums, videos, articles, announcements } = inspection.summary
      notice.value = `已${mode === 'replace' ? '覆盖' : '合并'}恢复：相册 ${albums}、视频 ${videos}、文章 ${articles}、公告 ${announcements}`
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : '恢复失败'
      return false
    } finally {
      busy.value = ''
    }
  }

  /** 清空本地内容与互动数据（外观设置保留），清空前自动留底 */
  async function resetEverything(): Promise<void> {
    busy.value = 'reset'
    clearMessages()
    try {
      await createSnapshot('reset', '清空本地数据前', true)
      await content.resetUserData()
      interaction.resetAll()
      notice.value = '已清空本地内容、收藏与观看进度；外观设置保留，快照仍在历史版本里'
    } catch (e) {
      error.value = e instanceof Error ? e.message : '清空失败'
    } finally {
      busy.value = ''
    }
  }

  return {
    snapshots,
    latest,
    busy,
    error,
    notice,
    storage,
    refresh,
    createSnapshot,
    exportCurrent,
    inspectSnapshot,
    downloadSnapshot,
    removeSnapshot,
    inspectFile,
    restore,
    resetEverything,
  }
}
