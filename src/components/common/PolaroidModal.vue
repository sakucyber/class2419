<script setup lang="ts">
/**
 * 「随机回忆」拍立得弹层。
 *
 * 关键约束：
 * - 必须 Teleport 到 body：页面切换动画会给视图根节点加 transform，
 *   会让 position:fixed 的子元素以它为包含块而错位。
 * - 只在 `photo` 非空时渲染（v-if），平时零成本。
 * - 年鉴风格下刻意取消倾斜与胶带感（设计规范禁忌），改为方正的照片版；
 *   其余风格保留拍立得手感。
 */
import { ref } from 'vue'

import AppIcon from '@/components/common/AppIcon.vue'
import type { PolaroidPhoto } from '@/types'
import { formatDate } from '@/utils/format'
import { useFocusTrap, useScrollLock } from '@/utils/overlay'

const props = defineProps<{ photo: PolaroidPhoto | null }>()
const emit = defineEmits<{ close: [] }>()

/** 焦点圈定的容器：包含关闭按钮，Open 后焦点直接落到它上面 */
const panelRef = ref<HTMLElement | null>(null)

useScrollLock(() => props.photo !== null)
useFocusTrap(panelRef, () => props.photo !== null, { onEscape: () => emit('close') })
</script>

<template>
  <Teleport to="body">
    <Transition name="polaroid">
      <div
        v-if="photo"
        class="layer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="polaroid-caption"
        @click.self="emit('close')"
      >
        <div ref="panelRef" class="shell">
          <div class="card">
            <div class="frame">
              <img :src="photo.src" :alt="photo.caption || photo.albumTitle" decoding="async" />
            </div>
            <p id="polaroid-caption" class="caption">
              {{ photo.caption || photo.albumTitle }}
            </p>
            <p class="meta">
              <span>{{ photo.albumTitle }}</span>
              <span class="dot" aria-hidden="true">·</span>
              <span>收录于 {{ formatDate(photo.date) }}</span>
            </p>
          </div>
          <button class="close" type="button" aria-label="关闭" @click="emit('close')">
            <AppIcon name="close" :size="15" :stroke-width="2.6" />
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.layer {
  position: fixed;
  inset: 0;
  z-index: var(--z-lightbox);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--overlay);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.shell {
  position: relative;
  width: min(86vw, 340px);
  transform: rotate(-1.5deg);
}

.card {
  width: 100%;
  max-height: calc(100vh - 48px);
  overflow: auto;
  padding: 14px 14px 0;
  background: var(--surface);
  border: var(--card-bd-w) solid var(--line);
  border-radius: 6px;
  color: var(--text);
  box-shadow: var(--shadow-3);
}
.frame {
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-radius: 3px;
  background: var(--bg-soft);
}
.frame img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.caption {
  margin: 14px 2px 4px;
  font-family: var(--font-display);
  font-size: var(--fs-md);
  font-weight: var(--display-weight);
  line-height: 1.5;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 0 2px 16px;
  font-size: var(--fs-2xs);
  color: var(--text-3);
}
.dot {
  color: var(--line-2);
}

.close {
  position: absolute;
  top: -12px;
  right: -12px;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line-2);
  border-radius: 50%;
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-2);
  transition: transform var(--dur-fast) var(--ease);
}
.close:hover {
  transform: scale(1.06);
}

/* 年鉴：方正照片版，无倾斜 */
[data-style='annual'] .shell {
  transform: none;
}
[data-style='annual'] .card {
  border-radius: 2px;
  background: #fff;
  padding: 10px 10px 0;
}
[data-style='annual'] .frame {
  border-radius: 0;
}
[data-style='annual'] .caption {
  font-family: var(--font-serif);
  font-weight: 600;
}

[data-style='japandi'] .shell {
  transform: rotate(-2deg);
}
[data-style='japandi'] .card {
  border-color: transparent;
  border-radius: 18px;
  background: #fffefb;
  box-shadow: 0 26px 60px -30px rgba(61, 74, 66, 0.5);
}
[data-style='japandi'] .frame {
  border-radius: 12px;
}

[data-style='brutal'] .shell {
  transform: rotate(-2deg);
}
[data-style='brutal'] .card {
  border: 3px solid #111;
  border-radius: 0;
  background: #fffdf7;
  box-shadow: 8px 8px 0 #111;
}
[data-style='brutal'] .frame {
  border-radius: 0;
}
[data-style='brutal'] .caption {
  font-weight: 900;
}

[data-style='legacy'] .card {
  border: none;
  border-radius: 6px;
  background: #fdfbf7;
  color: #2a2438;
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.45),
    0 2px 6px rgba(0, 0, 0, 0.2);
}
[data-style='legacy'] .frame {
  background: #e8e4dc;
}
[data-style='legacy'] .meta {
  color: #7d7688;
}

/* 暗色：三种「浅色相纸」都换成墨面纸。
   否则卡片是白的、正文却是浅色（--text），标题会直接看不见。 */
[data-style='annual'][data-theme='dark'] .card {
  background: var(--surface);
}
[data-style='japandi'][data-theme='dark'] .card {
  background: var(--surface);
  box-shadow: 0 26px 60px -30px rgba(0, 0, 0, 0.6);
}
[data-style='brutal'][data-theme='dark'] .card {
  background: var(--surface);
  border-color: var(--line);
  box-shadow: 8px 8px 0 var(--accent-2);
}

/* 过渡与入场 */
.polaroid-enter-active {
  transition: opacity 220ms var(--ease);
}
.polaroid-leave-active {
  transition: opacity 160ms var(--ease);
}
.polaroid-enter-from,
.polaroid-leave-to {
  opacity: 0;
}
.polaroid-enter-active .shell {
  animation: polaroid-in 420ms var(--ease-out) both;
}
@keyframes polaroid-in {
  from {
    transform: rotate(-6deg) scale(0.9);
    opacity: 0;
  }
  60% {
    opacity: 1;
  }
  to {
    transform: rotate(-1.5deg) scale(1);
    opacity: 1;
  }
}
[data-style='annual'] .polaroid-enter-active .shell {
  animation: plate-in 380ms var(--ease-out) both;
}
@keyframes plate-in {
  from {
    transform: translateY(14px);
    opacity: 0;
  }
  to {
    transform: none;
    opacity: 1;
  }
}
</style>
