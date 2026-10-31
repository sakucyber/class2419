<script setup lang="ts">
/**
 * 班徽（纯静态）。
 *
 * 这里原先有一版 WebGL 3D 徽章：canvas + three.js 动态 import + 设备分级 + FPS 自动降级。
 * 按需求已将 3D 整体移除（连同 three 依赖、特效等级、GPU 探测一并删掉），
 * 现在只有 CSS/SVG 版本：
 *
 * - 形态、配色、字重全部由皮肤令牌（--badge-*）与各风格的 [data-style] 覆盖决定；
 * - 无 canvas、无动态 import、无运行时动画，首屏直接可见，也不再有"先静态后 3D"的闪烁；
 * - 样式差异：年鉴=方形描边框、Japandi=圆形勋章、校园=白底圆章、粗野=黑底黄字方块、
 *   原版=深色星章。
 */
import { computed } from 'vue'

import { useSettingsStore } from '@/store/settings'

const settings = useSettingsStore()
const style = computed(() => settings.settings.style)
const glyph = computed(() => (style.value === 'brutal' ? '19' : '叁'))
const sub = computed(() => (style.value === 'brutal' ? 'CLASS OF 2027' : 'EST. 2024'))
</script>

<template>
  <div class="hero-badge" aria-hidden="true">
    <div class="badge-static">
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
  </div>
</template>

<style scoped>
.hero-badge {
  position: relative;
  flex: none;
  width: var(--badge-size);
  height: var(--badge-size);
  user-select: none;
}

.badge-static {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
}
.star {
  display: block;
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 12px 28px rgba(12, 8, 24, 0.45));
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
  /* 亮色主题下 --accent-ink 是墨色，压在黑底上会看不见；班号固定用强调黄 */
  color: var(--accent);
}
[data-style='brutal'] .plate-sub {
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #f5f0e1;
}

/* 校园：白底圆章 + 亮黄描边，班号用蓝色手账字 */
[data-style='campus'] .plate {
  border-color: var(--campus-sun);
  background: #fff;
  color: var(--campus-blue-d);
  box-shadow:
    0 0 0 3px rgba(255, 206, 84, 0.4),
    0 10px 20px -12px rgba(47, 111, 168, 0.5);
}
[data-style='campus'] .plate-glyph {
  font-family: var(--font-hand);
  font-size: 2.3rem;
  font-weight: 400;
}
[data-style='campus'] .plate-sub {
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--campus-sun-d);
  opacity: 1;
}
[data-style='campus'][data-theme='dark'] .plate {
  background: #1d2a37;
  color: var(--campus-sun);
}
</style>
