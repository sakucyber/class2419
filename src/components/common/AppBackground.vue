<script setup lang="ts">
/**
 * 环境背景：按风格切换的四套装饰层。
 *
 * 约束（来自设计规范）：装饰不能遮挡内容、不能影响阅读；
 * 所有元素 pointer-events: none，且层级固定为 0（内容层为 1）。
 * 关闭动效 / 系统减弱动效时只停动画，不隐藏 —— 静止的装饰仍是设计的一部分。
 */
import { ref } from 'vue'

import { useSettingsStore } from '@/store/settings'

const settings = useSettingsStore()

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
  Array.from({ length: 12 }, (_, i) => ({
    id: i,
    size: Math.random() * 5 + 2,
    left: Math.random() * 100,
    duration: Math.random() * 14 + 14,
    delay: Math.random() * 12,
    color: COLORS[i % COLORS.length],
  })),
)
</script>

<template>
  <div class="bg" aria-hidden="true">
    <!-- 年鉴：稿纸横线 + 极淡的衬线大字 -->
    <template v-if="settings.settings.style === 'annual'">
      <span class="paper"></span>
      <span class="ghost ghost--a">No.19</span>
      <span class="ghost ghost--b">Class of 2027</span>
    </template>

    <!-- Japandi：低透明度几何/叶片，缓慢漂浮 -->
    <template v-else-if="settings.settings.style === 'japandi'">
      <svg class="shape shape--ring" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="78" fill="none" stroke="currentColor" stroke-width="1.2" />
        <circle cx="100" cy="100" r="54" fill="none" stroke="currentColor" stroke-width="0.8" />
      </svg>
      <svg class="shape shape--leaf" viewBox="0 0 200 200">
        <path
          d="M100 18C148 46 168 92 100 182 32 92 52 46 100 18Z"
          fill="currentColor"
          opacity="0.5"
        />
        <path d="M100 34v128" stroke="var(--bg)" stroke-width="2" opacity="0.5" />
      </svg>
      <svg class="shape shape--cloud" viewBox="0 0 240 140">
        <path
          d="M58 108c-20 0-34-13-34-30 0-16 12-28 29-29 4-20 20-33 41-33 22 0 39 14 43 35 18 1 31 13 31 29 0 16-14 28-33 28Z"
          fill="currentColor"
        />
      </svg>
      <svg class="shape shape--arc" viewBox="0 0 200 200">
        <path d="M20 160a80 80 0 0 1 160 0" fill="none" stroke="currentColor" stroke-width="2" />
      </svg>
    </template>

    <!-- 粗野：极大字号的粗黑字，纯静态 -->
    <template v-else-if="settings.settings.style === 'brutal'">
      <span class="bword bword--a">19</span>
      <span class="bword bword--b">2027</span>
      <span class="bword bword--c">GO!</span>
    </template>

    <!-- 原版：极光光斑 + 噪点 + 上浮粒子 -->
    <template v-else>
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
    </template>
  </div>
</template>

<style scoped>
.bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

/* ---------------- 年鉴 ---------------- */
.paper {
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent 31px,
    var(--paper-rule) 31px,
    var(--paper-rule) 32px
  );
}
.ghost {
  position: absolute;
  font-family: var(--font-serif);
  font-style: italic;
  color: var(--text);
  opacity: var(--deco-opacity);
  white-space: nowrap;
  user-select: none;
  line-height: 1;
}
.ghost--a {
  left: -0.06em;
  bottom: 6vh;
  font-size: clamp(120px, 18vw, 280px);
}
.ghost--b {
  right: 0.02em;
  top: 22vh;
  font-size: clamp(64px, 8vw, 132px);
  writing-mode: vertical-rl;
  letter-spacing: 4px;
}
@media (max-width: 1023px) {
  .ghost--b {
    display: none;
  }
}
@media (max-width: 767px) {
  .ghost--a {
    font-size: 128px;
    bottom: 2vh;
  }
}

/* ---------------- Japandi ---------------- */
.shape {
  position: absolute;
  color: var(--accent-2);
  opacity: var(--deco-opacity);
}
.shape--ring {
  width: clamp(220px, 30vw, 420px);
  top: -6vw;
  right: -4vw;
  animation: drift-a 26s ease-in-out infinite alternate;
}
.shape--leaf {
  width: clamp(140px, 16vw, 240px);
  left: -3vw;
  bottom: 8vh;
  color: var(--sage);
  transform: rotate(-12deg);
  animation: drift-b 30s ease-in-out infinite alternate;
}
.shape--cloud {
  width: clamp(180px, 22vw, 320px);
  right: 6vw;
  bottom: -2vw;
  opacity: calc(var(--deco-opacity) * 0.75);
  animation: drift-c 24s ease-in-out infinite alternate;
}
.shape--arc {
  width: clamp(160px, 18vw, 260px);
  left: 12vw;
  top: 14vh;
  color: var(--accent-ink);
  opacity: calc(var(--deco-opacity) * 0.6);
}
@keyframes drift-a {
  to {
    transform: translate(-18px, 24px) rotate(6deg);
  }
}
@keyframes drift-b {
  to {
    transform: rotate(-4deg) translate(16px, -26px);
  }
}
@keyframes drift-c {
  to {
    transform: translate(-24px, -18px);
  }
}
@media (max-width: 767px) {
  .shape--ring,
  .shape--arc {
    display: none;
  }
}
html.no-animations .shape {
  animation: none;
}

/* ---------------- 粗野 ---------------- */
.bword {
  position: absolute;
  font-family: var(--font-display);
  font-weight: 900;
  color: var(--text);
  opacity: var(--deco-opacity);
  line-height: 0.8;
  letter-spacing: -0.04em;
  user-select: none;
}
.bword--a {
  right: -2vw;
  bottom: -4vh;
  font-size: clamp(220px, 34vw, 520px);
}
.bword--b {
  left: -3vw;
  top: 10vh;
  font-size: clamp(120px, 18vw, 280px);
}
.bword--c {
  right: 8vw;
  top: 40vh;
  font-size: clamp(80px, 10vw, 160px);
  color: var(--accent-2);
  transform: rotate(-8deg);
}
@media (max-width: 767px) {
  .bword--b,
  .bword--c {
    display: none;
  }
}

/* ---------------- 原版 ---------------- */
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
  background: radial-gradient(circle, var(--accent-soft-2) 0%, var(--accent-soft-2) 25%, transparent 70%);
  animation: aurora-a 26s ease-in-out infinite alternate;
}
.aurora--2 {
  width: 57vw;
  height: 57vw;
  bottom: -22.5vw;
  right: -14.5vw;
  background: radial-gradient(circle, var(--accent-soft) 0%, var(--accent-soft) 25%, transparent 70%);
  animation: aurora-b 32s ease-in-out infinite alternate;
}
.aurora--3 {
  width: 43vw;
  height: 43vw;
  top: 35.5%;
  left: 39.5%;
  opacity: 0.3;
  background: radial-gradient(circle, var(--accent-soft-2) 0%, var(--accent-soft-2) 25%, transparent 70%);
  animation: aurora-c 38s ease-in-out infinite alternate;
}
@keyframes aurora-a {
  to {
    transform: translate(8vw, 6vw) scale(1.15);
  }
}
@keyframes aurora-b {
  to {
    transform: translate(-7vw, -5vw) scale(1.2);
  }
}
@keyframes aurora-c {
  to {
    transform: translate(-10vw, 8vw) scale(0.85);
  }
}
.grain {
  position: absolute;
  inset: 0;
  opacity: 0.035;
  background-image: radial-gradient(rgba(255, 255, 255, 0.9) 1px, transparent 1px);
  background-size: 3px 3px;
}
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
    opacity: 0.45;
  }
  88% {
    opacity: 0.4;
  }
  100% {
    transform: translateY(-105vh) scale(1);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .aurora,
  .particle,
  .shape {
    animation: none !important;
  }
}
</style>
