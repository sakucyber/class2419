<script setup lang="ts">
/**
 * 环境背景：极光光斑 + 上浮粒子。
 * 纯装饰，pointer-events: none。
 * 动画的启停由 styles/base.css 统一接管：「关闭动效」设置（html.no-animations）
 * 与系统 prefers-reduced-motion 都会让光斑与粒子静止（只停动画，不隐藏）。
 *
 * 性能注意：光斑的柔边用 radial-gradient 实现，**不要改回 filter: blur()** ——
 * 那会让浏览器每帧对大尺寸图层重新做高斯模糊，是移动端滚动卡顿的典型来源。
 */
import { ref } from 'vue'

interface Particle {
  id: number
  size: number
  left: number
  duration: number
  delay: number
  color: string
}

const COLORS = ['#e879b0', '#c084fc', '#60a5fa', '#fbbf24', '#6ee7b7', '#f5a8d0']

const particles = ref<Particle[]>(
  Array.from({ length: 16 }, (_, i) => ({
    id: i,
    size: Math.random() * 5 + 2,
    left: Math.random() * 100,
    duration: Math.random() * 14 + 12,
    delay: Math.random() * 12,
    color: COLORS[i % COLORS.length],
  })),
)
</script>

<template>
  <div class="ambient" aria-hidden="true">
    <span class="aurora aurora--1"></span>
    <span class="aurora aurora--2"></span>
    <span class="aurora aurora--3"></span>
    <span class="grain"></span>
    <span
      v-for="p in particles"
      :key="p.id"
      class="particle"
      :style="{
        width: p.size + 'px',
        height: p.size + 'px',
        left: p.left + 'vw',
        background: p.color,
        animationDuration: p.duration + 's',
        animationDelay: '-' + p.delay + 's',
      }"
    ></span>
  </div>
</template>

<style scoped>
.ambient {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

/* 极光光斑
   这里刻意**不用 filter: blur()**：柔边效果用 radial-gradient 就能做出来，
   而 filter 会让浏览器每帧对大尺寸图层重新做高斯模糊——这是移动端/低端 GPU
   上最典型的滚动卡顿源。渐变版本视觉几乎一致，但渲染成本接近于零。
   因为要留出渐变淡出的边，元素尺寸比原来的"实心圆"放大到约 1/0.7。 */
.aurora {
  position: absolute;
  border-radius: 50%;
  opacity: 0.55;
}
.aurora--1 {
  width: 66vw;
  height: 66vw;
  top: -22vw;
  left: -18vw;
  background: radial-gradient(circle, var(--aurora-1) 0%, var(--aurora-1) 25%, transparent 70%);
  animation: drift-1 26s ease-in-out infinite alternate;
}
.aurora--2 {
  width: 57vw;
  height: 57vw;
  bottom: -22.5vw;
  right: -14.5vw;
  background: radial-gradient(circle, var(--aurora-2) 0%, var(--aurora-2) 25%, transparent 70%);
  animation: drift-2 32s ease-in-out infinite alternate;
}
.aurora--3 {
  width: 43vw;
  height: 43vw;
  top: 35.5%;
  left: 39.5%;
  background: radial-gradient(circle, var(--aurora-1) 0%, var(--aurora-1) 25%, transparent 70%);
  opacity: 0.3;
  animation: drift-3 38s ease-in-out infinite alternate;
}
@keyframes drift-1 {
  to {
    transform: translate(8vw, 6vw) scale(1.15);
  }
}
@keyframes drift-2 {
  to {
    transform: translate(-7vw, -5vw) scale(1.2);
  }
}
@keyframes drift-3 {
  to {
    transform: translate(-10vw, 8vw) scale(0.85);
  }
}

/* 细微噪点，避免大面积纯色显平 */
.grain {
  position: absolute;
  inset: 0;
  opacity: 0.035;
  background-image: radial-gradient(rgba(255, 255, 255, 0.9) 1px, transparent 1px);
  background-size: 3px 3px;
}

/* 上浮粒子 */
.particle {
  position: absolute;
  bottom: -20px;
  border-radius: 50%;
  opacity: 0;
  animation-name: float-up;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}
@keyframes float-up {
  0% {
    transform: translateY(0) scale(0.4);
    opacity: 0;
  }
  12% {
    opacity: 0.5;
  }
  88% {
    opacity: 0.45;
  }
  100% {
    transform: translateY(-105vh) scale(1);
    opacity: 0;
  }
}
</style>
