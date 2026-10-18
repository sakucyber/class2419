<script setup lang="ts">
/**
 * 「随机回忆」拍立得弹层。
 *
 * 关键约束：
 * - **必须 Teleport 到 body**：页面切换动画会给视图根节点加 transform，
 *   会让 position:fixed 的子元素以它为包含块而错位（项目已有踩坑记录）。
 * - 只在 `photo` 非空时渲染（v-if），平时零成本。
 * - 入场动效被 `legacy.css` / 「关闭动效」的全局 `animation: none` 关掉时，
 *   卡片直接以最终状态呈现（基础样式里已写好倾斜角），不会出现"空白卡片"。
 */
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import AppIcon from '@/components/common/AppIcon.vue'
import type { PolaroidPhoto } from '@/types'
import { formatDate } from '@/utils/format'

const props = defineProps<{ photo: PolaroidPhoto | null }>()
const emit = defineEmits<{ close: [] }>()

const cardRef = ref<HTMLDivElement | null>(null)
const closeBtn = ref<HTMLButtonElement | null>(null)

/** 记住是否由我们锁定了滚动，避免误伤别处（抽屉/搜索浮层）的状态 */
let scrollLocked = false

function lockScroll(lock: boolean): void {
  if (lock && !scrollLocked) {
    document.body.style.overflow = 'hidden'
    scrollLocked = true
  } else if (!lock && scrollLocked) {
    document.body.style.overflow = ''
    scrollLocked = false
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (!props.photo) return
  if (event.key === 'Escape') {
    emit('close')
    return
  }
  // 简易焦点圈定：Tab 在卡片内的可聚焦元素之间循环
  if (event.key !== 'Tab' || !cardRef.value) return
  const focusables = Array.from(
    cardRef.value.querySelectorAll<HTMLElement>(
      'button, [href], [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.hasAttribute('disabled'))
  if (focusables.length === 0) return
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  }
}

watch(
  () => props.photo,
  (photo) => {
    lockScroll(photo !== null)
    if (photo) void nextTick(() => closeBtn.value?.focus())
  },
)

onMounted(() => document.addEventListener('keydown', onKeydown))

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  lockScroll(false)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="polaroid">
      <div
        v-if="photo"
        class="polaroid-layer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="polaroid-caption"
        @click.self="emit('close')"
      >
        <div class="polaroid-shell">
          <div ref="cardRef" class="polaroid-card">
            <div class="polaroid-frame">
              <img :src="photo.src" :alt="photo.caption || photo.albumTitle" decoding="async" />
            </div>
            <p id="polaroid-caption" class="polaroid-caption">
              {{ photo.caption || photo.albumTitle }}
            </p>
            <p class="polaroid-meta">
              {{ photo.albumTitle }} · 收录于 {{ formatDate(photo.date) }}
            </p>
          </div>
          <!-- 关闭按钮放在不裁切的壳层上：卡片自身是 overflow:auto（移动端短屏要能滚），
               按钮定位在卡片外侧 11px，若挂在卡片里会被直接裁掉一半 -->
          <button
            ref="closeBtn"
            class="polaroid-close"
            type="button"
            aria-label="关闭"
            @click="emit('close')"
          >
            <AppIcon name="close" :size="15" :stroke-width="2.6" />
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.polaroid-layer {
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

/* 壳层：负责定位与倾斜，不裁切，让关闭按钮可以探出卡片外 */
.polaroid-shell {
  position: relative;
  width: min(86vw, 340px);
  /* 无动效环境下的最终倾斜角（有动效时由 keyframes 覆盖，结束值也是它） */
  transform: rotate(-1.5deg);
}

/* 拍立得相纸：刻意用暖白 + 深字，明暗主题下都成立（真实相纸就是这个颜色） */
.polaroid-card {
  width: 100%;
  max-height: calc(100vh - 48px);
  overflow: auto;
  padding: 14px 14px 0;
  background: #fdfbf7;
  border-radius: 6px;
  color: #2a2438;
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.45),
    0 2px 6px rgba(0, 0, 0, 0.2);
}

.polaroid-frame {
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-radius: 3px;
  background: #e8e4dc;
}
.polaroid-frame img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.polaroid-caption {
  margin: 12px 2px 4px;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.5;
}
.polaroid-meta {
  margin: 0 2px 14px;
  font-size: 0.74rem;
  color: #7d7688;
  font-family: var(--font-mono);
}

.polaroid-close {
  position: absolute;
  top: -11px;
  right: -11px;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.5);
  background: rgba(28, 22, 40, 0.82);
  color: #fff;
  cursor: pointer;
  transition:
    transform var(--duration) var(--ease-spring),
    background var(--duration) var(--ease);
}
.polaroid-close:hover {
  transform: scale(1.08);
  background: rgba(28, 22, 40, 1);
}
.polaroid-close:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* ── 过渡与入场 ── */
.polaroid-enter-active {
  transition: opacity 240ms var(--ease);
}
.polaroid-leave-active {
  transition: opacity 180ms var(--ease);
}
.polaroid-enter-from,
.polaroid-leave-to {
  opacity: 0;
}

/* 「翻出来」的手感：从侧面翻正 + 轻微放大（作用于壳层，按钮跟着一起翻） */
.polaroid-enter-active .polaroid-shell {
  animation: polaroid-in 460ms var(--ease-out-expo) both;
}
@keyframes polaroid-in {
  from {
    transform: perspective(900px) rotateY(-18deg) rotate(-6deg) scale(0.88);
    opacity: 0;
  }
  55% {
    opacity: 1;
  }
  to {
    transform: perspective(900px) rotateY(0deg) rotate(-1.5deg) scale(1);
    opacity: 1;
  }
}
</style>
