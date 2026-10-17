/**
 * 设备性能探测 + FPS 采样。
 *
 * 设计原则：
 * - 只读取浏览器公开信号，不做任何写操作，可安全地在首屏前同步调用（探测耗时 < 1ms）。
 * - 探测结果是「建议等级」，用户手动选择在 effects store 里优先级更高。
 * - FPS 采样与判定分离：采样器只负责喂数据，降级决策由 store 的状态机做。
 */

export type EffectTier = 'L0' | 'L1' | 'L2'

/** WebGL 能力探测结果 */
export interface WebglInfo {
  /** 是否有 WebGL2 上下文 */
  webgl2: boolean
  /** 是否有 WebGL1 上下文（WebGL2 缺失时作为兜底） */
  webgl1: boolean
  /** 显卡型号字符串（用于评分与日志，可能因隐私设置而为 null） */
  renderer: string | null
}

/** 设备画像：探测结果的完整快照，便于调试与在设置页展示 */
export interface DeviceProfile {
  /** 建议的特效等级（未考虑用户手动选择） */
  tier: EffectTier
  /** 综合评分 0-100 */
  score: number
  /** 每一条扣分/加分的原因，用于解释「为什么是这个等级」 */
  reasons: string[]
  pointerFine: boolean
  cores: number
  /** GB；浏览器不给则为 null */
  memory: number | null
  webgl: WebglInfo
  reducedMotion: boolean
  saveData: boolean
  effectiveType: string | null
  /** 是否判定为移动端（UA + 指针类型） */
  mobile: boolean
  /** 设备是否省电中（Battery API，异步补齐，可能为 null 表示未知） */
  lowPower: boolean | null
}

/* ------------------------------------------------------------------ */
/* 非标准 API 的最小类型声明（避免 any，也避免污染全局类型）            */
/* ------------------------------------------------------------------ */

interface NetworkInformationLike {
  saveData?: boolean
  effectiveType?: string
}

interface NavigatorWithHints extends Navigator {
  deviceMemory?: number
  connection?: NetworkInformationLike
}

interface BatteryManagerLike {
  charging?: boolean
  level?: number
}

interface NavigatorWithBattery extends Navigator {
  getBattery?: () => Promise<BatteryManagerLike>
}

function nav(): NavigatorWithHints {
  return navigator as NavigatorWithHints
}

/* ------------------------------------------------------------------ */
/* 各项信号采集                                                        */
/* ------------------------------------------------------------------ */

/** 探测 WebGL 能力，并尽量取出显卡型号字符串 */
export function detectWebgl(): WebglInfo {
  const result: WebglInfo = { webgl2: false, webgl1: false, renderer: null }
  if (typeof document === 'undefined') return result

  let canvas: HTMLCanvasElement | null = null
  try {
    canvas = document.createElement('canvas')
    const gl2 = canvas.getContext('webgl2')
    if (gl2) {
      result.webgl2 = true
      result.renderer = readRenderer(gl2)
      return result
    }
    const gl1 = canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl')
    if (gl1 && !(gl1 instanceof Event)) {
      result.webgl1 = true
      result.renderer = readRenderer(gl1 as WebGLRenderingContext)
    }
  } catch {
    /* 某些环境创建上下文会抛错，视为不支持 */
  } finally {
    // 主动释放，避免占着一个 WebGL 上下文名额（浏览器通常限制 8-16 个）
    canvas = null
  }
  return result
}

function readRenderer(gl: WebGL2RenderingContext | WebGLRenderingContext): string | null {
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    if (!ext) return null
    const value = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
    return typeof value === 'string' ? value : null
  } catch {
    return null
  }
}

function isMobileDevice(pointerFine: boolean): boolean {
  if (pointerFine) return false
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /Android|iPhone|iPad|iPod|Mobile|HarmonyOS|Windows Phone/i.test(ua)
}

/* ------------------------------------------------------------------ */
/* 评分与分级                                                          */
/* ------------------------------------------------------------------ */

/**
 * 评分表（合计 100 分）：
 *   核心数  ≥8 → 30   ≥4 → 20   ≥2 → 8
 *   内存    ≥8 → 25   ≥4 → 15   ≥2 → 5      （浏览器不给则按 4 分的保守值处理）
 *   精确指针（鼠标）             → 10
 *   WebGL2 支持                  → 15
 *   非移动端 UA                  → 10
 *   非省流模式                   → 10
 *
 * 分级（在评分之前先过「硬性压制」，见 detectDevice）：
 *   ≥70 → L2    ≥45 → L1    其余 → L0
 */
export function scoreDevice(input: {
  cores: number
  memory: number | null
  pointerFine: boolean
  webgl2: boolean
  mobile: boolean
  saveData: boolean
}): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let score = 0

  if (input.cores >= 8) {
    score += 30
    reasons.push(`CPU ${input.cores} 核 +30`)
  } else if (input.cores >= 4) {
    score += 20
    reasons.push(`CPU ${input.cores} 核 +20`)
  } else if (input.cores >= 2) {
    score += 8
    reasons.push(`CPU ${input.cores} 核 +8`)
  } else {
    reasons.push(`CPU 核数未知或过低 +0`)
  }

  if (input.memory === null) {
    score += 4
    reasons.push('内存未知（按保守值 +4）')
  } else if (input.memory >= 8) {
    score += 25
    reasons.push(`内存 ${input.memory}GB +25`)
  } else if (input.memory >= 4) {
    score += 15
    reasons.push(`内存 ${input.memory}GB +15`)
  } else if (input.memory >= 2) {
    score += 5
    reasons.push(`内存 ${input.memory}GB +5`)
  } else {
    reasons.push(`内存 ${input.memory}GB +0`)
  }

  if (input.pointerFine) {
    score += 10
    reasons.push('精确指针（桌面） +10')
  }
  if (input.webgl2) {
    score += 15
    reasons.push('支持 WebGL2 +15')
  }
  if (!input.mobile) {
    score += 10
    reasons.push('非移动端 +10')
  }
  if (!input.saveData) {
    score += 10
    reasons.push('未开启省流 +10')
  } else {
    reasons.push('开启省流模式 +0')
  }

  return { score, reasons }
}

function readReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** 同步探测设备画像（首屏即可用） */
export function detectDevice(): DeviceProfile {
  const pointerFine =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: fine)').matches
  const cores = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency ?? 2) : 2
  const memory = typeof nav().deviceMemory === 'number' ? (nav().deviceMemory as number) : null
  const connection = nav().connection
  const saveData = connection?.saveData === true
  const effectiveType = connection?.effectiveType ?? null
  const reducedMotion = readReducedMotion()
  const mobile = isMobileDevice(pointerFine)
  const webgl = detectWebgl()

  const { score, reasons } = scoreDevice({
    cores,
    memory,
    pointerFine,
    webgl2: webgl.webgl2,
    mobile,
    saveData,
  })

  const decision = decideTier({
    score,
    mobile,
    saveData,
    reducedMotion,
    webgl2: webgl.webgl2,
    cores,
    memory,
  })

  return {
    tier: decision.tier,
    score,
    reasons: [...decision.reasons, ...reasons],
    pointerFine,
    cores,
    memory,
    webgl,
    reducedMotion,
    saveData,
    effectiveType,
    mobile,
    lowPower: null,
  }
}

interface TierInput {
  score: number
  mobile: boolean
  saveData: boolean
  reducedMotion: boolean
  webgl2: boolean
  cores: number
  memory: number | null
}

/**
 * 硬性压制规则（优先级高于评分，逐条向下判断）：
 *  1. prefers-reduced-motion → L0（用户明确要求减少动效，无条件尊重）
 *  2. 省流模式 / 内存 ≤2GB / 核心 ≤2 → L0
 *  3. 移动端 → 最高 L1；核数 <8 或内存 <6 则 L0
 *  4. 无 WebGL2 → 最高 L1（L2 依赖后处理，WebGL1 下不稳）
 *  5. 评分 ≥70 → L2；≥45 → L1；否则 L0
 */
function decideTier(i: TierInput): { tier: EffectTier; reasons: string[] } {
  const pressed: string[] = []

  if (i.reducedMotion) {
    return { tier: 'L0', reasons: ['prefers-reduced-motion: reduce → 压制到 L0', ...pressed] }
  }

  if (i.saveData) pressed.push('省流模式 → 压制到 L0')
  if (i.memory !== null && i.memory <= 2) pressed.push(`内存 ${i.memory}GB ≤2 → 压制到 L0`)
  if (i.cores <= 2) pressed.push(`CPU ${i.cores} 核 ≤2 → 压制到 L0`)
  if (
    i.saveData ||
    (i.memory !== null && i.memory <= 2) ||
    i.cores <= 2
  ) {
    return { tier: 'L0', reasons: pressed }
  }

  if (i.mobile) {
    const strong = i.cores >= 8 && (i.memory === null || i.memory >= 6)
    return {
      tier: strong ? 'L1' : 'L0',
      reasons: [`移动端${strong ? '（高配）' : ''} → 最高 L1`, ...pressed],
    }
  }

  if (!i.webgl2) {
    return { tier: 'L1', reasons: ['无 WebGL2 → 最高 L1', ...pressed] }
  }

  if (i.score >= 70) return { tier: 'L2', reasons: [`评分 ${i.score} ≥70 → L2`, ...pressed] }
  if (i.score >= 45) return { tier: 'L1', reasons: [`评分 ${i.score} ≥45 → L1`, ...pressed] }
  return { tier: 'L0', reasons: [`评分 ${i.score} <45 → L0`, ...pressed] }
}

/** 异步补齐电池信息（不支持则保持 null）。省电中会把等级压到 L0。 */
export async function refineWithBattery(profile: DeviceProfile): Promise<DeviceProfile> {
  const n = navigator as NavigatorWithBattery
  if (typeof n.getBattery !== 'function') return profile
  try {
    const battery = await n.getBattery()
    const charging = battery.charging === true
    const level = typeof battery.level === 'number' ? battery.level : 1
    const lowPower = !charging && level <= 0.2
    if (!lowPower) return { ...profile, lowPower }
    return {
      ...profile,
      lowPower,
      tier: 'L0',
      reasons: [`电量 ${Math.round(level * 100)}% 且未充电 → 压制到 L0`, ...profile.reasons],
    }
  } catch {
    return profile
  }
}

/* ------------------------------------------------------------------ */
/* FPS 采样与降级判定                                                  */
/* ------------------------------------------------------------------ */

export interface FpsMonitorOptions {
  /** 滑动窗口长度（帧数），默认 60（约 1 秒 @60fps） */
  windowSize?: number
  /** 低于该帧率视为不达标，默认 45 */
  threshold?: number
  /** 需持续不达标多久才触发降级，默认 2000ms */
  sustainMs?: number
  /** 触发降级时回调，参数为窗口内平均帧率 */
  onLow?: (avgFps: number) => void
  /** 从低帧率恢复时回调（用于解除降级提示） */
  onRecover?: (avgFps: number) => void
}

/**
 * 基于 requestAnimationFrame 的帧率采样器。
 *
 * - 页面不可见时自动暂停（visibilitychange），既省电也避免把后台的 0 帧算进去。
 * - 判定用「连续不达标时长」而不是单次采样，避免偶发掉帧就降级。
 * - 采样窗口是帧间隔的滑动平均；窗口未满时不做判定，避免冷启动误判。
 */
export class FpsMonitor {
  private readonly windowSize: number
  private readonly threshold: number
  private readonly sustainMs: number
  private readonly onLow?: (avgFps: number) => void
  private readonly onRecover?: (avgFps: number) => void

  private frames: number[] = []
  private rafId = 0
  private lastTime = 0
  private lowSince = 0
  private firing = false
  private running = false
  private visibilityHandler: (() => void) | null = null

  constructor(options: FpsMonitorOptions = {}) {
    this.windowSize = options.windowSize ?? 60
    this.threshold = options.threshold ?? 45
    this.sustainMs = options.sustainMs ?? 2000
    this.onLow = options.onLow
    this.onRecover = options.onRecover
  }

  get isRunning(): boolean {
    return this.running
  }

  /** 当前窗口平均帧率；窗口为空时返回 0 */
  get fps(): number {
    if (this.frames.length === 0) return 0
    const avgMs = this.frames.reduce((a, b) => a + b, 0) / this.frames.length
    return avgMs > 0 ? 1000 / avgMs : 0
  }

  start(): void {
    if (this.running || typeof window === 'undefined') return
    this.running = true
    this.frames = []
    this.lastTime = 0
    this.lowSince = 0
    this.firing = false

    this.visibilityHandler = () => {
      if (document.hidden) this.pauseLoop()
      else this.resumeLoop()
    }
    document.addEventListener('visibilitychange', this.visibilityHandler)
    this.resumeLoop()
  }

  stop(): void {
    this.running = false
    this.pauseLoop()
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler)
      this.visibilityHandler = null
    }
    this.frames = []
  }

  private pauseLoop(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = 0
    }
    // 清空窗口，避免把暂停前后的间隔算成一帧超长间隔
    this.frames = []
    this.lastTime = 0
    this.lowSince = 0
  }

  private resumeLoop(): void {
    if (!this.running || this.rafId) return
    const tick = (now: number): void => {
      this.rafId = requestAnimationFrame(tick)
      if (this.lastTime === 0) {
        this.lastTime = now
        return
      }
      const delta = now - this.lastTime
      this.lastTime = now
      // 过滤异常大的间隔（切标签页、系统休眠）
      if (delta <= 0 || delta > 1000) return

      this.frames.push(delta)
      if (this.frames.length > this.windowSize) this.frames.shift()
      if (this.frames.length < this.windowSize) return

      this.evaluate(now)
    }
    this.rafId = requestAnimationFrame(tick)
  }

  private evaluate(now: number): void {
    const avg = this.fps
    if (avg >= this.threshold) {
      this.lowSince = 0
      if (this.firing) {
        this.firing = false
        this.onRecover?.(avg)
      }
      return
    }
    if (this.lowSince === 0) {
      this.lowSince = now
      return
    }
    if (now - this.lowSince < this.sustainMs) return
    if (this.firing) return
    this.firing = true
    this.onLow?.(avg)
  }
}
