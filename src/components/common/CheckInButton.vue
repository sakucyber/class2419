<script setup lang="ts">
/**
 * 页脚「今日打卡」。
 *
 * - 纯本地：只写 localStorage（键 `checkin`），无网络、无后端。
 * - 已打卡后渲染成 <span>（不是 disabled 的 button）——从结构上就不可能重复点击。
 * - 粒子层挂在容器上而不是按钮里，这样按钮被替换成文案时动画不会被掐断。
 * - 粒子形状与配色按风格切换（年鉴=纸屑、日式=圆点、粗野=方块、原版=圆点）。
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
const notice = ref('')
let seq = 0
let clearTimer = 0

function onCheckIn(): void {
  if (!interaction.checkIn()) return
  notice.value = '今日打卡成功'

  if (!effects.enhancedActive) return

  sparks.value = Array.from({ length: 12 }, () => {
    seq += 1
    return { id: seq, left: 6 + Math.random() * 88, delay: Math.random() * 170 }
  })
  window.clearTimeout(clearTimer)
  clearTimer = window.setTimeout(() => {
    sparks.value = []
  }, 1000)
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

    <span class="sparks" aria-hidden="true">
      <i
        v-for="(s, i) in sparks"
        :key="s.id"
        :class="`spark-${i % 4}`"
        :style="{ left: s.left + '%', animationDelay: s.delay + 'ms' }"
      />
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
  padding: 7px 16px;
  border-radius: var(--radius-pill);
  font-size: var(--fs-xs);
  line-height: 1.6;
}
.checkin-btn {
  border: 1px dashed var(--line-2);
  background: transparent;
  color: var(--text-2);
  transition:
    color var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease),
    background-color var(--dur-fast) var(--ease);
}
.checkin-btn:hover {
  color: var(--accent-ink);
  border-color: var(--accent-ink);
  background: var(--accent-soft);
}
.checkin-done {
  border: 1px solid var(--line);
  color: var(--text-3);
}
[data-style='annual'] .checkin-btn,
[data-style='annual'] .checkin-done {
  border-radius: 2px;
  letter-spacing: 0.5px;
}
[data-style='brutal'] .checkin-btn,
[data-style='brutal'] .checkin-done {
  border-radius: 0;
  border-width: 3px;
  border-style: solid;
  font-weight: 900;
}
[data-style='brutal'] .checkin-btn {
  background: var(--accent);
  color: #111;
  border-color: #111;
  box-shadow: 3px 3px 0 #111;
}
[data-style='brutal'] .checkin-btn:hover {
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 #111;
}

/* 校园：按钮在深绿页脚上，改成粉笔描边 + 浅色字，否则正文灰字会沉进板面 */
[data-style='campus'] .checkin-btn,
[data-style='campus'] .checkin-done {
  border-color: rgba(242, 248, 242, 0.42);
  background: rgba(255, 255, 255, 0.08);
  color: var(--campus-chalk);
}
[data-style='campus'] .checkin-btn:hover {
  border-color: var(--campus-sun);
  background: rgba(255, 255, 255, 0.16);
  color: var(--campus-sun);
}
[data-style='campus'] .checkin-done {
  color: var(--campus-chalk-soft);
}
[data-style='campus'] .sparks i {
  background: var(--campus-sun);
}
[data-style='campus'] .sparks .spark-1 {
  background: var(--campus-pink);
}

.sparks {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
}
.sparks i {
  position: absolute;
  bottom: 38%;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0;
  animation: spark-up 820ms var(--ease-out) forwards;
}
.sparks .spark-1 {
  background: var(--accent-2);
}
.sparks .spark-2 {
  background: var(--text-3);
}
.sparks .spark-3 {
  background: var(--warning);
}
[data-style='annual'] .sparks i {
  width: 3px;
  height: 8px;
  border-radius: 0;
}
[data-style='brutal'] .sparks i {
  width: 7px;
  height: 7px;
  border-radius: 0;
}
[data-style='brutal'] .sparks .spark-0 {
  background: var(--accent);
}
[data-style='brutal'] .sparks .spark-1 {
  background: var(--accent-2);
}
[data-style='brutal'] .sparks .spark-2 {
  background: var(--danger);
}
[data-style='brutal'] .sparks .spark-3 {
  background: var(--success);
}

@keyframes spark-up {
  0% {
    transform: translateY(0) scale(0.6) rotate(0deg);
    opacity: 0;
  }
  22% {
    opacity: 0.95;
  }
  100% {
    transform: translateY(-46px) scale(0.25) rotate(140deg);
    opacity: 0;
  }
}
</style>
