<script setup lang="ts">
/**
 * 首页 hero 的班级徽章。
 *
 * 形态由风格决定：
 *   年鉴   —— 66px 方形描边框 + 衬线「叁」
 *   Japandi —— 圆形鼠尾草绿底 + 白色衬线「叁」
 *   粗野   —— 70px 黑底黄字方块 + 5px 硬投影
 *   原版   —— 保留圆形星章
 *
 * 渲染等级由 effects store 决定：
 *   L2 + 3D 开关：动态加载 Three.js 场景，就绪后淡入覆盖在静态徽章上
 *   L1：CSS 2.5D —— 指针驱动的轻微倾斜
 *   L0 / 关闭 3D / 加载失败：纯静态
 *
 * 无障碍与布局约束：整块 aria-hidden 且 pointer-events: none，绝不遮挡文案；
 * 窄屏由父级决定是否隐藏。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { useEffectsStore } from '@/store/effects'
import { useSettingsStore } from '@/store/settings'
import type { SceneHandle } from '@/utils/webgl'

const effects = useEffectsStore()
const settings = useSettingsStore()

const hostRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
/** 每次销毁场景都换一块新画布：WebGL 上下文被 forceContextLoss 之后不能复用 */
const canvasKey = ref(0)
const phase = ref<'idle' | 'loading' | 'ready' | 'failed'>('idle')
const tilt = ref({ x: 0, y: 0 })

const style = computed(() => settings.settings.style)
const glyph = computed(() => (style.value === 'brutal' ? '19' : '叁'))
const sub = computed(() => (style.value === 'brutal' ? 'CLASS OF 2027' : 'EST. 2024'))

/** 3D 场景的材质配色；与静态徽章同源，切换风格时重建 */
const PALETTES = {
  annual: { paper: 0xfaf9f6, ink: 0x16283d, line: 0xcfcabd, accent: 0xab5c19, side: 0x16283d },
  japandi: { paper: 0x9caf88, ink: 0xfffefb, line: 0xf5e6dd, accent: 0xf5e6dd, side: 0x6f8a6a },
  brutal: { paper: 0xffd23f, ink: 0x111111, line: 0x111111, accent: 0x111111, side: 0x111111 },
  legacy: { paper: 0x151223, ink: 0xe8b84b, line: 0xe8b84b, accent: 0xe879b0, side: 0x241f38 },
} as const

/** 几何体随风格：原版星章 / Japandi 圆牌 / 年鉴与粗野方形牌 */
const variant = computed<'star' | 'plaque' | 'disc'>(() => {
  if (style.value === 'legacy') return 'star'
  return style.value === 'japandi' ? 'disc' : 'plaque'
})

let scene: SceneHandle | null = null
let rafId = 0
let observer: IntersectionObserver | null = null
let resizeObserver: ResizeObserver | null = null
let inView = false
let starting = false
let disposed = false
let lastTiltFlush = 0
/** 场景代次：异步加载期间若风格/开关又变了，旧结果必须丢弃 */
let generation = 0
let restartQueued = false

const tiltStyle = computed(() => ({
  transform: `perspective(900px) rotateX(${tilt.value.x.toFixed(2)}deg) rotateY(${tilt.value.y.toFixed(
    2,
  )}deg)`,
}))

function loop(): void {
  rafId = 0
  if (!scene || disposed) return
  if (!inView || document.hidden) {
    rafId = requestAnimationFrame(loop)
    return
  }
  scene.render(performance.now())
  rafId = requestAnimationFrame(loop)
}

async function start(): Promise<void> {
  if (disposed || !effects.threeActive) return
  if (starting) {
    // 上一次创建还没结束：记一笔，等它收尾后再用新参数重来
    restartQueued = true
    return
  }
  if (scene) return

  const gen = generation
  starting = true
  phase.value = 'loading'
  try {
    // 销毁时会换一块新 canvas，等 DOM patch 完成再取
    await nextTick()
    const canvas = canvasRef.value
    if (!canvas) return
    const mod = await effects.loadSceneModule()
    if (gen !== generation || disposed || !effects.threeActive) return
    const created = await mod.createBadgeScene({
      canvas,
      quality: effects.quality,
      variant: variant.value,
      glyph: glyph.value,
      sub: sub.value,
      palette: PALETTES[style.value],
      onContextLost: () => {
        disposeScene()
        phase.value = 'failed'
      },
    })
    if (gen !== generation || disposed || !effects.threeActive) {
      created.dispose()
      return
    }
    scene = created
    scene.resize()
    phase.value = 'ready'
    effects.startMonitoring()
    if (!rafId) rafId = requestAnimationFrame(loop)
  } catch {
    if (gen === generation) phase.value = 'failed'
  } finally {
    starting = false
    if (restartQueued) {
      restartQueued = false
      void start()
    }
  }
}

function disposeScene(): void {
  // 让正在进行的 start() 结果失效
  generation += 1
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = 0
  }
  scene?.dispose()
  scene = null
  effects.stopMonitoring()
  // 关键：WebGL 上下文被 forceContextLoss 之后，同一块 canvas 不能再次创建渲染器
  canvasKey.value += 1
}

function onPointerMove(event: PointerEvent): void {
  const el = hostRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return
  const nx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)
  const ny = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)
  const cx = Math.max(-1, Math.min(1, nx))
  const cy = Math.max(-1, Math.min(1, ny))

  scene?.setPointer(cx, cy)

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

watch(
  () => effects.quality,
  (quality) => scene?.setQuality(quality),
  { deep: true },
)

watch(
  () => effects.enhancedActive,
  (active) => {
    if (!active) tilt.value = { x: 0, y: 0 }
  },
)

/** 换风格：3D 场景要按新配色重建 */
watch(style, () => {
  disposeScene()
  phase.value = 'idle'
  void start()
})
</script>

<template>
  <div ref="hostRef" class="hero-badge" :class="{ 'is-3d': phase === 'ready' }" aria-hidden="true">
    <!-- 静态徽章：始终渲染。既是 L0/L1 的最终形态，也是 L2 的首帧占位 -->
    <div
      class="badge-static"
      :class="{ 'is-tilting': effects.enhancedActive }"
      :style="effects.enhancedActive ? tiltStyle : undefined"
    >
      <svg
        v-if="style === 'legacy'"
        class="star"
        viewBox="0 0 200 200"
        role="presentation"
        focusable="false"
      >
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
        <circle cx="100" cy="100" r="79" fill="none" stroke="#e879b0" stroke-width="1.2" opacity="0.7" />
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

      <span v-else class="plate">
        <span class="plate-glyph">{{ glyph }}</span>
        <span class="plate-sub">{{ sub }}</span>
      </span>
    </div>

    <canvas
      ref="canvasRef"
      :key="canvasKey"
      class="badge-canvas"
      :class="{ 'is-ready': phase === 'ready' }"
      width="360"
      height="360"
    ></canvas>
  </div>
</template>

<style scoped>
.hero-badge {
  position: relative;
  flex: none;
  width: var(--badge-size);
  height: var(--badge-size);
  pointer-events: none;
  user-select: none;
}

.badge-static,
.badge-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.badge-static {
  z-index: 0;
}
.badge-canvas {
  z-index: 1;
}

/* 粗野：3D 画布本身没有硬投影，用一层实色块补上「按在纸上」的重量 */
[data-style='brutal'] .hero-badge.is-3d::before {
  content: '';
  position: absolute;
  inset: 9%;
  z-index: 0;
  transform: translate(6px, 6px) rotate(-2deg);
  background: var(--accent-2);
}
.badge-static {
  display: grid;
  place-items: center;
}
.star {
  display: block;
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 12px 28px rgba(12, 8, 24, 0.45));
}
.badge-static.is-tilting {
  transition: transform 220ms var(--ease-out);
  will-change: transform;
}

.plate {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: var(--badge-bd-w) solid var(--line-2);
  border-radius: var(--badge-radius);
  background: var(--badge-bg);
  color: var(--badge-color);
  box-shadow: var(--badge-shadow);
}
.plate-glyph {
  font-family: var(--font-serif);
  font-size: 2rem;
  font-weight: 600;
  line-height: 1;
}
.plate-sub {
  font-size: 0.42rem;
  letter-spacing: 1.4px;
  opacity: 0.72;
}

/* 年鉴：方形描边、衬线大字，副标压到最小 */
[data-style='annual'] .plate {
  border-color: var(--text);
  background: transparent;
}
[data-style='annual'] .plate-glyph {
  font-size: 2.15rem;
}
[data-style='annual'] .plate-sub {
  font-size: 0.4rem;
  letter-spacing: 1px;
  color: var(--text-3);
}

/* Japandi：圆形鼠尾草绿底 + 白色衬线字 + 外圈描边 */
[data-style='japandi'] .plate {
  border: none;
  border-radius: 50%;
  background: var(--sage);
  color: #fffefb;
  box-shadow:
    0 0 0 2px var(--accent-soft-2),
    0 12px 26px -18px rgba(61, 74, 66, 0.6);
}
[data-style='japandi'] .plate-sub {
  font-family: var(--font-hand);
  font-size: 0.5rem;
  letter-spacing: 1px;
}

/* 粗野：黑底黄字方块 + 蓝色硬投影 */
[data-style='brutal'] .plate {
  border: 3px solid #111;
  background: #111;
  color: var(--accent-ink);
  box-shadow: 5px 5px 0 var(--accent-2);
}
[data-style='brutal'] .plate-glyph {
  font-family: var(--font-display);
  font-weight: 900;
  font-size: 2rem;
  letter-spacing: -0.5px;
}
[data-style='brutal'] .plate-sub {
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #f5f0e1;
}

/* L2：静态徽章淡出、canvas 淡入，时长一致避免闪烁 */
.badge-canvas {
  opacity: 0;
  transition: opacity 520ms var(--ease);
}
.badge-canvas.is-ready {
  opacity: 1;
}
.hero-badge.is-3d .badge-static {
  opacity: 0;
  transition: opacity 520ms var(--ease);
}
:global(.is-legacy-browser) .badge-static.is-tilting {
  transition: none;
  will-change: auto;
}
:global(.is-legacy-browser) .badge-canvas {
  transition: none;
}
</style>
