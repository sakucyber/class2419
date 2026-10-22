<script setup lang="ts">
/**
 * 首页 hero 的班级徽章。
 *
 * 三种形态（由 effects store 的等级决定）：
 *   L2 + 3D 开关：动态加载 Three.js 场景，就绪后由 canvas 淡入覆盖在静态徽章上
 *                （先渲染静态占位，3D 就绪后淡入 —— 不阻塞 LCP）
 *   L1：CSS 2.5D —— 指针驱动的轻微倾斜，纯 transform，无 WebGL
 *   L0 / 关闭 3D / 加载失败：纯静态 SVG
 *
 * 无障碍与布局约束：
 *   · 纯装饰，整块 aria-hidden，不进入无障碍树，也不接收指针事件（pointer-events: none），
 *     因此绝不会遮挡班级名片、倒计时、公告等关键内容
 *   · 窄屏（< 900px）直接隐藏：hero 变单列后右侧没有它的位置
 *   · 指针位置在 window 上监听后换算，不依赖元素自身命中
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { useEffectsStore } from '@/store/effects'
import type { SceneHandle } from '@/utils/webgl'

const effects = useEffectsStore()

const hostRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
/** idle → loading → ready / failed */
const phase = ref<'idle' | 'loading' | 'ready' | 'failed'>('idle')
/** L1 指针倾斜角（度） */
const tilt = ref({ x: 0, y: 0 })

let scene: SceneHandle | null = null
let rafId = 0
let observer: IntersectionObserver | null = null
let resizeObserver: ResizeObserver | null = null
let inView = false
let starting = false
let disposed = false
let lastTiltFlush = 0

const tiltStyle = computed(() => ({
  transform: `perspective(900px) rotateX(${tilt.value.x.toFixed(2)}deg) rotateY(${tilt.value.y.toFixed(
    2,
  )}deg)`,
}))

/* ─────────────────────────── 生命周期 ─────────────────────────── */

function loop(): void {
  rafId = 0
  if (!scene || disposed) return
  // 不可见（滚出视口 / 标签页隐藏）时暂停渲染，省电也避免把后台的 0 帧算进 FPS 采样
  if (!inView || document.hidden) {
    rafId = requestAnimationFrame(loop)
    return
  }
  scene.render(performance.now())
  rafId = requestAnimationFrame(loop)
}

async function start(): Promise<void> {
  if (starting || scene || disposed) return
  if (!effects.threeActive) return
  const canvas = canvasRef.value
  if (!canvas) return

  starting = true
  phase.value = 'loading'
  try {
    const mod = await effects.loadSceneModule()
    // 加载期间用户可能关了 3D、或组件已卸载
    if (disposed || !effects.threeActive) return
    scene = await mod.createBadgeScene({
      canvas,
      quality: effects.quality,
      onContextLost: () => {
        // WebGL 上下文丢失：释放并退回静态徽章，不整页崩
        disposeScene()
        phase.value = 'failed'
      },
    })
    if (disposed) {
      scene.dispose()
      scene = null
      return
    }
    scene.resize()
    phase.value = 'ready'
    effects.startMonitoring()
    if (!rafId) rafId = requestAnimationFrame(loop)
  } catch {
    // 模块加载超时 / import 失败 / 创建失败 → 保留静态占位即可
    phase.value = 'failed'
  } finally {
    starting = false
  }
}

function disposeScene(): void {
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = 0
  }
  scene?.dispose()
  scene = null
  effects.stopMonitoring()
}

/* ─────────────────────────── 输入与观察 ─────────────────────────── */

function onPointerMove(event: PointerEvent): void {
  const el = hostRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return

  const nx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)
  const ny = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)
  const cx = Math.max(-1, Math.min(1, nx))
  const cy = Math.max(-1, Math.min(1, ny))

  // L2：直接把指针交给相机视差（不产生 Vue 响应式更新）
  scene?.setPointer(cx, cy)

  // L1：倾斜角做节流，避免每次 pointermove 都触发重渲染
  if (!effects.enhancedActive) return
  const now = performance.now()
  if (now - lastTiltFlush < 40) return
  lastTiltFlush = now
  tilt.value = { x: -cy * 7, y: cx * 9 }
}

function onVisibilityChange(): void {
  if (!document.hidden && scene && !rafId) rafId = requestAnimationFrame(loop)
}

onMounted(() => {
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  document.addEventListener('visibilitychange', onVisibilityChange)

  if (typeof ResizeObserver !== 'undefined' && hostRef.value) {
    resizeObserver = new ResizeObserver(() => scene?.resize())
    resizeObserver.observe(hostRef.value)
  }

  // 进入视口才启动（首页 hero 本身就在首屏，这一层主要防的是"不在首页时也跑"）
  if (typeof IntersectionObserver === 'undefined') {
    inView = true
    void start()
    return
  }
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        inView = entry.isIntersecting
        if (inView) void start()
      }
    },
    { rootMargin: '160px' },
  )
  if (hostRef.value) observer.observe(hostRef.value)
})

onBeforeUnmount(() => {
  disposed = true
  window.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  observer?.disconnect()
  observer = null
  resizeObserver?.disconnect()
  resizeObserver = null
  disposeScene()
})

/* ─────────────────────────── 联动 effects store ─────────────────────────── */

// 3D 开关 / 等级 / 降级状态任何一项变化导致 threeActive 翻转时，销毁并重建，避免内存泄漏
watch(
  () => effects.threeActive,
  (active) => {
    if (active) {
      void start()
      return
    }
    disposeScene()
    phase.value = 'idle'
  },
)

// 运行时降级只下调 DPR（几何细节 / 后处理在创建时就已确定，改它们需要重建场景，
// 对徽章这种小场景不值得；DPR 本来就是开销最大的一项）
watch(
  () => effects.quality,
  (quality) => scene?.setQuality(quality),
  { deep: true },
)

// 等级掉到 L1 及以下时，清掉倾斜残角
watch(
  () => effects.enhancedActive,
  (active) => {
    if (!active) tilt.value = { x: 0, y: 0 }
  },
)
</script>

<template>
  <div ref="hostRef" class="hero-badge" aria-hidden="true">
    <!-- 静态占位：始终渲染。既是 L0/L1 的最终形态，也是 L2 的首帧占位 -->
    <div
      class="badge-static"
      :style="effects.enhancedActive ? tiltStyle : undefined"
      :class="{ 'is-tilting': effects.enhancedActive }"
    >
      <svg viewBox="0 0 200 200" role="presentation" focusable="false">
        <defs>
          <linearGradient id="hb-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#f0c56a" />
            <stop offset="55%" stop-color="#e879b0" />
            <stop offset="100%" stop-color="#a78bfa" />
          </linearGradient>
          <linearGradient id="hb-star" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#fff2c9" />
            <stop offset="100%" stop-color="#e8b84b" />
          </linearGradient>
          <radialGradient id="hb-disc" cx="38%" cy="32%" r="72%">
            <stop offset="0%" stop-color="#3b3358" />
            <stop offset="100%" stop-color="#151223" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="94" fill="url(#hb-disc)" />
        <circle cx="100" cy="100" r="94" fill="none" stroke="url(#hb-ring)" stroke-width="4.5" />
        <circle
          cx="100"
          cy="100"
          r="79"
          fill="none"
          stroke="#e879b0"
          stroke-width="1.2"
          opacity="0.7"
        />
        <path
          d="M100 44 L112.4 79.6 L150 79.6 L119.8 101.6 L131.4 137.4 L100 115.4 L68.6 137.4 L80.2 101.6 L50 79.6 L87.6 79.6 Z"
          fill="url(#hb-star)"
        />
        <circle
          v-for="n in 12"
          :key="n"
          :cx="100 + Math.cos(((n - 1) * Math.PI) / 6) * 86"
          :cy="100 + Math.sin(((n - 1) * Math.PI) / 6) * 86"
          r="2.6"
          fill="#e879b0"
          opacity="0.85"
        />
      </svg>
    </div>

    <!-- WebGL 画布：就绪后淡入覆盖静态占位 -->
    <canvas
      ref="canvasRef"
      class="badge-canvas"
      :class="{ 'is-ready': phase === 'ready' }"
      width="320"
      height="320"
    ></canvas>
  </div>
</template>

<style scoped>
.hero-badge {
  /* 装饰层：不接收指针事件，绝不遮挡右侧的班级信息；点击穿透到下层 */
  position: absolute;
  top: 50%;
  right: clamp(18px, 4vw, 56px);
  z-index: 1;
  /* 宽度来源与 HomeView 的 .class-card 共用同一个变量，
     这样 .intro 的避让距离与徽章实际宽度永远对得上 */
  width: var(--hero-badge-w, clamp(150px, 17vw, 230px));
  height: var(--hero-badge-w, clamp(150px, 17vw, 230px));
  transform: translateY(-50%);
  pointer-events: none;
  user-select: none;
  opacity: 0.95;
  /* 旧内核 / 关闭动效时不参与任何动画 */
  transition: opacity var(--duration) var(--ease);
}

/* 窄屏 hero 变单列，右侧没有它的位置 —— 直接不显示，避免压住文字 */
@media (max-width: 899px) {
  .hero-badge {
    display: none;
  }
}

.badge-static,
.badge-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.badge-static svg {
  display: block;
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 12px 28px rgba(12, 8, 24, 0.45));
}

/* L1：指针倾斜用 transform 实现，代价极低；进出过渡稍慢，手感更"实体" */
.badge-static.is-tilting {
  transition: transform 220ms var(--ease-out-quart);
  will-change: transform;
}

/* L2：静态徽章淡出，canvas 淡入。两者时长一致避免闪烁 */
.badge-canvas {
  opacity: 0;
  transition: opacity 520ms var(--ease);
}
.badge-canvas.is-ready {
  opacity: 1;
}

/* 简化模式 / 关闭动效：去掉倾斜与淡入，直接呈现最终状态 */
:global(.is-legacy-browser) .badge-static.is-tilting {
  transition: none;
  will-change: auto;
}
:global(.is-legacy-browser) .badge-canvas {
  transition: none;
}
</style>
