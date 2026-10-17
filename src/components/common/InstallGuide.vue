<script setup lang="ts">
/**
 * 安装图文指引。
 *
 * 两个变体：
 * - `ios`：iOS Safari 没有 beforeinstallprompt，只能用示意图 + 文案教用户手动添加
 * - `other`：Chromium 但没拿到安装事件（已安装过 / 不满足条件）时的兜底说明
 *
 * 示意图是**内联 SVG**：不引外部图片（CSP 下也不产生额外请求）。
 */
import { onBeforeUnmount, onMounted, watch } from 'vue'

import AppIcon from '@/components/common/AppIcon.vue'

const props = defineProps<{ open: boolean; variant: 'ios' | 'other' }>()
const emit = defineEmits<{ close: [] }>()

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
  if (props.open && event.key === 'Escape') emit('close')
}

watch(
  () => props.open,
  (open) => lockScroll(open),
)

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  lockScroll(false)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="guide">
      <div
        v-if="open"
        class="guide-layer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
        @click.self="emit('close')"
      >
        <div class="guide-card">
          <h2 id="guide-title" class="guide-title">添加到主屏幕</h2>

          <!-- 示意：Safari 底部工具栏，分享按钮高亮 -->
          <svg
            v-if="variant === 'ios'"
            class="guide-figure"
            viewBox="0 0 280 118"
            role="img"
            aria-label="示意图：Safari 底部工具栏中间的分享按钮"
          >
            <rect
              x="8"
              y="60"
              width="264"
              height="48"
              rx="13"
              fill="currentColor"
              opacity="0.07"
            />
            <rect x="32" y="76" width="17" height="15" rx="3" fill="currentColor" opacity="0.32" />
            <rect x="68" y="76" width="17" height="15" rx="3" fill="currentColor" opacity="0.32" />
            <rect x="196" y="76" width="17" height="15" rx="3" fill="currentColor" opacity="0.32" />
            <rect x="232" y="76" width="17" height="15" rx="3" fill="currentColor" opacity="0.32" />

            <circle cx="140" cy="83" r="21" fill="var(--primary)" opacity="0.15" />
            <g
              fill="none"
              stroke="var(--primary)"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M140 70v13" />
              <path d="m135.2 74.8 4.8-4.8 4.8 4.8" />
              <path d="M130.4 80.6v8.8h19.2v-8.8" />
            </g>

            <path
              d="M140 44v-9"
              stroke="var(--primary)"
              stroke-width="2"
              stroke-linecap="round"
              opacity="0.55"
            />
            <path d="m135.6 39.6 4.4-4.6 4.4 4.6" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.55" />
            <text
              x="140"
              y="26"
              text-anchor="middle"
              font-size="12"
              font-weight="700"
              fill="var(--primary)"
            >
              点这里
            </text>
          </svg>

          <ol class="guide-steps">
            <template v-if="variant === 'ios'">
              <li>点击底部工具栏的<strong>「分享」</strong>图标（方框 + 向上箭头）</li>
              <li>在弹出的菜单里向下滑，选择<strong>「添加到主屏幕」</strong></li>
              <li>点右上角<strong>「添加」</strong>即可</li>
            </template>
            <template v-else>
              <li>打开浏览器右上角的<strong>菜单</strong>（⋮ 或 ···）</li>
              <li>选择<strong>「添加到主屏幕」</strong>或<strong>「安装应用」</strong></li>
              <li>确认后，图标会出现在桌面上</li>
            </template>
          </ol>

          <p class="guide-note">装到桌面后可以全屏打开，像 App 一样使用。</p>

          <button class="guide-close" type="button" @click="emit('close')">
            <AppIcon name="check" :size="15" :stroke-width="2.6" />
            我知道了
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.guide-layer {
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

.guide-card {
  width: min(90vw, 380px);
  max-height: calc(100vh - 48px);
  overflow: auto;
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--bg);
  box-shadow: var(--shadow-3);
}

.guide-title {
  margin: 0 0 var(--space-4);
  font-size: 1.05rem;
}

.guide-figure {
  display: block;
  width: 100%;
  height: auto;
  margin: 0 0 var(--space-4);
  color: var(--text-2);
}

.guide-steps {
  margin: 0 0 var(--space-3);
  padding-left: 1.2em;
  display: grid;
  gap: 8px;
  font-size: 0.9rem;
  line-height: 1.65;
  color: var(--text-2);
}
.guide-steps strong {
  color: var(--text);
}

.guide-note {
  margin: 0 0 var(--space-4);
  font-size: 0.8rem;
  color: var(--text-3);
}

.guide-close {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 11px 18px;
  border: none;
  border-radius: var(--radius-full);
  background: var(--primary);
  color: var(--primary-contrast);
  font-weight: 700;
  font-size: 0.92rem;
  cursor: pointer;
  transition: background var(--duration) var(--ease);
}
.guide-close:hover {
  background: var(--primary-hover);
}
.guide-close:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 3px;
}

.guide-enter-active,
.guide-leave-active {
  transition: opacity 200ms var(--ease);
}
.guide-enter-from,
.guide-leave-to {
  opacity: 0;
}
.guide-enter-active .guide-card {
  animation: guide-in 320ms var(--ease-out-expo) both;
}
@keyframes guide-in {
  from {
    transform: translateY(10px) scale(0.97);
    opacity: 0;
  }
  to {
    transform: none;
    opacity: 1;
  }
}
</style>
