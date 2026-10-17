/**
 * 特效等级 / 3D 开关 / 运行时自动降级。
 *
 * 与 settings store 的分工：
 * - settings store 管「外观偏好」：主题、强调色、字号、动效开关、液态玻璃。
 * - 本 store 管「渲染负载」：等级选择、3D 开关、自动降级进度。
 *   两者互不写入，只在读取时协作（见 effectiveTier）。
 *
 * 持久化策略（重要）：
 * - **只有用户手动选择**（tierPreference / threeEnabled）写入 localStorage，键名 `effects`。
 * - **自动降级（degradeSteps）不持久化**：它是本次会话的运行时状态。刷新后应重新按设备能力
 *   起步，否则一次偶发卡顿会给设备「判无期」。
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { useSettingsStore } from '@/store/settings'
import type { DeviceProfile, EffectTier } from '@/utils/perf'
import { detectDevice, FpsMonitor, refineWithBattery } from '@/utils/perf'
import { getJSON, setJSON } from '@/utils/storage'
import { canRun3D } from '@/utils/webgl'

/** 用户在设置里选择的档位；auto = 交给设备探测 */
export type TierPreference = 'auto' | EffectTier

interface PersistedEffects {
  tierPreference?: TierPreference
  /** 用户是否希望启用 3D 场景（最终是否真的启用还要看等级与降级状态） */
  threeEnabled?: boolean
}

/**
 * 降级阶梯（数字越大越保守）：
 *   0 正常
 *   1 DPR 降到 1
 *   2 关闭后处理（Bloom）
 *   3 减少粒子 / 降低几何细节
 *   4 整体降到 L1（关闭 3D，改用 CSS 2.5D 徽章）
 *   5 降到 L0（静态图 + 关闭全部装饰性特效）
 */
export const MAX_DEGRADE_STEP = 5

export const DEGRADE_LABELS: readonly string[] = [
  '特效运行正常',
  '已降低渲染精度（DPR 1）',
  '已关闭后处理',
  '已减少粒子与几何细节',
  '已关闭 3D 场景',
  '已切换为静态模式',
]

const DEFAULT_PROFILE: DeviceProfile = {
  tier: 'L0',
  score: 0,
  reasons: [],
  pointerFine: false,
  cores: 2,
  memory: null,
  webgl: { webgl2: false, webgl1: false, renderer: null },
  reducedMotion: false,
  saveData: false,
  effectiveType: null,
  mobile: false,
  lowPower: null,
}

export const useEffectsStore = defineStore('effects', () => {
  const settings = useSettingsStore()
  const stored = getJSON<PersistedEffects>('effects', {})

  const device = ref<DeviceProfile>(DEFAULT_PROFILE)
  const probed = ref(false)

  const tierPreference = ref<TierPreference>(stored.tierPreference ?? 'auto')
  const threeEnabled = ref<boolean>(stored.threeEnabled ?? true)

  const degradeSteps = ref(0)
  /** 最近一次降级/恢复的提示语，供 aria-live 播报 */
  const degradeNotice = ref('')

  let monitor: FpsMonitor | null = null

  const canUseWebgl = computed(() => canRun3D(device.value.webgl))

  /**
   * 最终生效等级：用户手动选择 > 设备建议，再叠加两条运行时约束：
   * - settings.animations 关闭（用户要求减少动效）→ 强制 L0
   * - 自动降级达到第 4 / 5 步 → 强制 L1 / L0
   */
  const effectiveTier = computed<EffectTier>(() => {
    if (!settings.settings.animations) return 'L0'
    if (degradeSteps.value >= 5) return 'L0'
    if (degradeSteps.value >= 4) return 'L1'
    if (tierPreference.value !== 'auto') return tierPreference.value
    return device.value.tier
  })

  /** 3D 场景是否应该活跃 */
  const threeActive = computed<boolean>(() => {
    if (!threeEnabled.value) return false
    if (!canUseWebgl.value) return false
    if (!settings.settings.animations) return false
    if (degradeSteps.value >= 4) return false
    return effectiveTier.value === 'L2'
  })

  /** 是否处于 L1 及以上（用于启用 tilt / 粒子 / 视差等轻量特效） */
  const enhancedActive = computed<boolean>(
    () => effectiveTier.value !== 'L0' && settings.settings.animations,
  )

  /** 传给 3D 场景的画质参数 */
  const quality = computed(() => ({
    // 硬约束：DPR 上限 1.5；降级第 1 步压到 1
    dpr: degradeSteps.value >= 1 ? 1 : Math.min(window.devicePixelRatio || 1, 1.5),
    postprocessing: degradeSteps.value < 2,
    detail: degradeSteps.value >= 3 ? 0.55 : 1,
  }))

  /** 用户想开 3D 但当前条件不满足时的原因（供 UI 提示） */
  const threeBlockedReason = computed<string | null>(() => {
    if (!threeEnabled.value) return null
    if (!canUseWebgl.value) return '当前设备不支持 WebGL，无法启用 3D'
    if (!settings.settings.animations) return '已关闭「页面动效」，3D 场景同步停用'
    if (degradeSteps.value >= 4) return DEGRADE_LABELS[degradeSteps.value] ?? null
    if (effectiveTier.value !== 'L2') return '当前特效等级低于「高」，3D 场景未启用'
    return null
  })

  /** 设备画像的可读摘要（设置页展示） */
  const deviceSummary = computed(() => {
    const d = device.value
    const gpu = d.webgl.renderer ? d.webgl.renderer.replace(/^ANGLE \(|\)$/g, '') : '未知'
    return {
      score: d.score,
      tier: d.tier,
      cores: d.cores,
      memory: d.memory === null ? '未知' : `${d.memory}GB`,
      gpu,
      webgl2: d.webgl.webgl2,
      reasons: d.reasons,
    }
  })

  /** 探测设备（幂等）。首屏同步可得结果，电池信息随后异步补齐 */
  function probe(): void {
    if (probed.value) return
    probed.value = true
    device.value = detectDevice()
    void refineBattery()
  }

  async function refineBattery(): Promise<void> {
    const refined = await refineWithBattery(device.value)
    device.value = refined
  }

  /**
   * 动态加载 3D 模块入口。
   * 这是整个工程里唯一通往 three 的边 —— 它必须保持为动态 import，
   * 否则 three 会进入静态依赖图、被打进首屏 chunk。
   */
  async function loadSceneModule() {
    return import('@/utils/webgl')
  }

  /** 启动 FPS 采样（仅在 L1 及以上时才有意义） */
  function startMonitoring(): void {
    if (monitor) return
    monitor = new FpsMonitor({
      threshold: 45,
      sustainMs: 2000,
      onLow: () => degrade(),
      onRecover: () => {
        if (degradeSteps.value === 0) return
        degradeNotice.value = '帧率已恢复稳定，特效保持当前档位'
      },
    })
    monitor.start()
  }

  function stopMonitoring(): void {
    monitor?.stop()
    monitor = null
  }

  /** 当前实测帧率（无采样时为 0） */
  function currentFps(): number {
    return monitor?.fps ?? 0
  }

  /**
   * 自动降级一步。返回是否发生了降级（已达最低步则返回 false）。
   * 顺序：DPR → 后处理 → 粒子 → L1 → L0
   */
  function degrade(): boolean {
    if (degradeSteps.value >= MAX_DEGRADE_STEP) return false
    degradeSteps.value += 1
    degradeNotice.value = DEGRADE_LABELS[degradeSteps.value] ?? '已降低特效'
    if (degradeSteps.value >= 5) stopMonitoring()
    return true
  }

  /** 手动恢复（清空自动降级进度） */
  function resetDegrade(): void {
    degradeSteps.value = 0
    degradeNotice.value = '已恢复完整特效'
  }

  function setTier(next: TierPreference): void {
    tierPreference.value = next
    resetDegrade()
    persist()
  }

  function setThree(enabled: boolean): void {
    threeEnabled.value = enabled
    resetDegrade()
    persist()
  }

  function persist(): void {
    setJSON('effects', {
      tierPreference: tierPreference.value,
      threeEnabled: threeEnabled.value,
    } satisfies PersistedEffects)
  }

  return {
    device,
    deviceSummary,
    tierPreference,
    threeEnabled,
    degradeSteps,
    degradeNotice,
    canUseWebgl,
    effectiveTier,
    threeActive,
    enhancedActive,
    quality,
    threeBlockedReason,
    probe,
    loadSceneModule,
    startMonitoring,
    stopMonitoring,
    currentFps,
    degrade,
    resetDegrade,
    setTier,
    setThree,
  }
})
