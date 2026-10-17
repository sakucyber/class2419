<script setup lang="ts">
/**
 * 页脚「今日打卡」。
 *
 * - 纯本地：只写 localStorage（键 `checkin`），无网络、无后端。
 * - 已打卡后渲染成 <span>（不是 disabled 的 button）——从结构上就不可能重复点击。
 * - 粒子动画在 L0 / 关闭动效时直接跳过，只更新文案；
 *   粒子层挂在容器上而不是按钮里，这样按钮被替换成文案时动画不会被掐断。
 */
import { onBeforeUnmount, ref } from 'vue'

import AppIcon from '@/components/common/AppIcon.vue'
import { useEffectsStore } from '@/store/effects'
import { useInteractionStore } from '@/store/interaction'

const interaction = useInteractionStore()
const effects = useEffectsStore()

interface Spark {
  id: number
  left: number
  delay: number
}

const sparks = ref<Spark[]>([])
/** 供读屏播报的即时提示 */
const notice = ref('')
let seq = 0
let clearTimer = 0

function onCheckIn(): void {
  if (!interaction.checkIn()) return
  notice.value = '今日打卡成功'

  // 低性能设备（L0）或关闭动效时不放粒子，避免为一次点击引入 12 个动画节点
  if (!effects.enhancedActive) return

  sparks.value = Array.from({ length: 12 }, () => {
    seq += 1
    return { id: seq, left: 6 + Math.random() * 88, delay: Math.random() * 170 }
  })
  window.clearTimeout(clearTimer)
  clearTimer = window.setTimeout(() => {
    sparks.value = []
  }, 950)
}

onBeforeUnmount(() => window.clearTimeout(clearTimer))
</script>

<template>
  <div class="checkin">
    <button v-if="!interaction.checkedInToday" class="checkin-btn" type="button" @click="onCheckIn">
      <AppIcon name="footprint" :size="15" :stroke-width="1.8" />
      <span>点击留下今日脚印</span>
    </button>
    <span v-else class="checkin-done">
      <AppIcon name="check" :size="14" :stroke-width="2.8" />
      您今日已打卡<template v-if="interaction.checkin.total > 1">
        · 累计 {{ interaction.checkin.total }} 天</template
      >
    </span>

    <span class="checkin-sparks" aria-hidden="true">
      <i v-for="s in sparks" :key="s.id" :style="{ left: s.left + '%', animationDelay: s.delay + 'ms' }" />
    </span>

    <span class="visually-hidden" aria-live="polite">{{ notice }}</span>
  </div>
</template>

<style scoped>
.checkin {
  position: relative;
  display: flex;
  justify-content: center;
  margin-bottom: var(--space-4);
}

.checkin-btn,
.checkin-done {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: var(--radius-full);
  font-size: 0.82rem;
  line-height: 1.6;
}

.checkin-btn {
  border: 1px dashed var(--border-strong);
  background: transparent;
  color: var(--text-2);
  cursor: pointer;
  transition:
    color var(--duration) var(--ease),
    border-color var(--duration) var(--ease),
    background var(--duration) var(--ease);
}
.checkin-btn:hover {
  color: var(--primary);
  border-color: var(--primary);
  background: var(--primary-soft);
}
.checkin-btn:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.checkin-done {
  color: var(--text-3);
  border: 1px solid var(--border);
}

/* 粒子层：不接收指针事件，按钮被替换成文案时它仍在 */
.checkin-sparks {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
}
.checkin-sparks i {
  position: absolute;
  bottom: 38%;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--primary);
  opacity: 0;
  animation: spark-up 780ms var(--ease-out-quart) forwards;
}
@keyframes spark-up {
  0% {
    transform: translateY(0) scale(0.6);
    opacity: 0;
  }
  22% {
    opacity: 0.95;
  }
  100% {
    transform: translateY(-44px) scale(0.2);
    opacity: 0;
  }
}
</style>
