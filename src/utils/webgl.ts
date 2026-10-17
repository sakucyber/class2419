/**
 * WebGL / Three.js 的懒加载与回退。
 *
 * ⚠️ 本文件**不得静态 import three**（也不要 import 任何会间接引入 three 的模块），
 * 否则 three 会进入静态依赖图、被打进主包。所有 three 相关代码都必须通过
 * 这里提供的动态 import 入口加载。
 */

import type { WebglInfo } from './perf'

/** 模型加载 / 动态 import 的超时上限 */
export const SCENE_LOAD_TIMEOUT_MS = 8000

/** 3D 场景实例需要实现的接口（由 badgeScene.ts 实现） */
export interface SceneHandle {
  /** 每帧渲染；由外部 rAF 驱动 */
  render(timeMs: number): void
  /** 视口尺寸变化；具体尺寸由场景自行从父容器读取 */
  resize(): void
  /** 指针位置（-1 ~ 1），用于相机视差 */
  setPointer(x: number, y: number): void
  /** 运行时画质调整：降级状态机通过它降 DPR / 关后处理 */
  setQuality(quality: SceneQuality): void
  /** 是否成功启用了后处理（降级状态机据此决定下一步） */
  readonly hasPostprocessing: boolean
  /** 释放所有 GPU 资源 */
  dispose(): void
}

export interface SceneQuality {
  /** 设备像素比上限 */
  dpr: number
  /** 是否启用后处理（Bloom） */
  postprocessing: boolean
  /** 几何细节缩放（0.5 = 减半的环段数等） */
  detail: number
}

export interface CreateSceneOptions {
  canvas: HTMLCanvasElement
  quality: SceneQuality
  /** 可选的 GLB 模型地址；为空或加载失败则使用内置几何体徽章 */
  modelUrl?: string
  /** 上下文丢失回调，调用方据此切回静态图 */
  onContextLost?: () => void
}

/** 给 Promise 加超时；超时会 reject，由调用方回退 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} 超时（${ms}ms）`))
    }, ms)
    promise.then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        window.clearTimeout(timer)
        reject(error instanceof Error ? error : new Error(String(error)))
      },
    )
  })
}

/** WebGL 能力是否满足 3D 场景的最低要求 */
export function canRun3D(webgl: WebglInfo): boolean {
  return webgl.webgl2 || webgl.webgl1
}

/** 不支持的简要原因，用于 UI 提示 */
export function describeWebglIssue(webgl: WebglInfo): string | null {
  if (webgl.webgl2 || webgl.webgl1) return null
  return '当前浏览器/设备不支持 WebGL，无法启用 3D 场景'
}

/**
 * 动态创建 3D 场景。
 *
 * 这里用变量化的 import 路径，是为了让打包器把 three 与场景代码切成独立 chunk，
 * 只有在真正需要 L2 时才会下载。
 */
export async function createBadgeScene(options: CreateSceneOptions): Promise<SceneHandle> {
  const mod = await withTimeout(
    import('@/components/effects/three/badgeScene'),
    SCENE_LOAD_TIMEOUT_MS,
    '3D 场景模块加载',
  )
  return mod.createBadgeScene(options)
}
