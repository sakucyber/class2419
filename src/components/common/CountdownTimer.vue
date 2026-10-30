<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    target: string
    label?: string
    /** 日式风格里数字上方的英文小标签 */
    caption?: string
  }>(),
  { label: '倒计时', caption: 'COUNTDOWN' },
)

const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null

function tick() {
  now.value = Date.now()
}

onMounted(() => {
  tick()
  timer = setInterval(tick, 1000)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

const parts = computed(() => {
  const target = new Date(props.target).getTime()
  const diff = Math.max(0, target - now.value)
  return {
    day: Math.floor(diff / 86400000),
    hour: Math.floor((diff % 86400000) / 3600000),
    minute: Math.floor((diff % 3600000) / 60000),
    second: Math.floor((diff % 60000) / 1000),
    done: diff <= 0,
  }
})

const units = computed(() => [
  { value: String(parts.value.day), label: '天' },
  { value: String(parts.value.hour).padStart(2, '0'), label: '时' },
  { value: String(parts.value.minute).padStart(2, '0'), label: '分' },
  { value: String(parts.value.second).padStart(2, '0'), label: '秒' },
])
</script>

<template>
  <div class="countdown" role="timer" :aria-label="`距离${props.label}还有 ${parts.day} 天`">
    <p class="cap">{{ props.caption }}</p>
    <div v-if="!parts.done" class="units">
      <template v-for="(unit, i) in units" :key="unit.label">
        <div class="unit">
          <strong class="num">{{ unit.value }}</strong>
          <span>{{ unit.label }}</span>
        </div>
        <span v-if="i < units.length - 1" class="sep" aria-hidden="true">:</span>
      </template>
    </div>
    <p v-else class="done">{{ props.label }}开始了，2419 加油！</p>
  </div>
</template>

<style scoped>
.countdown {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.cap {
  display: none;
  font-size: var(--fs-2xs);
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--text-3);
}
.units {
  display: flex;
  align-items: stretch;
  gap: var(--space-2);
}
.unit {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-width: 0;
  gap: 2px;
}
.unit strong {
  font-family: var(--font-display);
  font-size: clamp(1.7rem, 3.2vw, 2.35rem);
  font-weight: var(--display-weight);
  line-height: 1.1;
  color: var(--text);
}
.unit span {
  font-size: var(--fs-2xs);
  color: var(--text-3);
  letter-spacing: 1px;
}
.sep {
  display: none;
  align-self: center;
  color: var(--line-2);
  font-size: 1.4rem;
  line-height: 1;
}
.done {
  font-weight: 700;
  color: var(--accent-ink);
}

/* ---- 年鉴：细线分栏，数字用衬线，无卡片 ---- */
[data-style='annual'] .units {
  border-top: 1px solid var(--line-2);
  padding-top: var(--space-3);
  gap: 0;
}
[data-style='annual'] .unit {
  border-left: 1px solid var(--line);
}
[data-style='annual'] .unit:first-child {
  border-left: none;
}
[data-style='annual'] .unit strong {
  font-size: clamp(2rem, 3.6vw, 2.9rem);
  font-weight: 600;
}
[data-style='annual'] .unit span {
  letter-spacing: 2px;
}

/* ---- Japandi：大号衬线数字 + 上方英文小标，无卡片 ---- */
[data-style='japandi'] .cap {
  display: block;
}
[data-style='japandi'] .units {
  gap: var(--space-4);
}
[data-style='japandi'] .unit {
  align-items: flex-start;
}
[data-style='japandi'] .unit strong {
  font-size: clamp(2.1rem, 4vw, 3rem);
  font-weight: 500;
  letter-spacing: 0.5px;
}
[data-style='japandi'] .unit span {
  font-size: var(--fs-2xs);
  color: var(--text-3);
}

/* ---- Brutal：黑底黄字卡片 + 蓝色硬投影 ---- */
[data-style='brutal'] .units {
  gap: 6px;
  padding: 10px;
  border: 3px solid #111;
  background: #111;
  box-shadow: 6px 6px 0 var(--accent-2);
}
[data-style='brutal'] .unit strong {
  color: var(--accent);
  font-size: clamp(1.9rem, 3.6vw, 2.9rem);
  font-weight: 900;
  letter-spacing: -0.5px;
}
[data-style='brutal'] .unit span {
  color: #f5f0e1;
  font-weight: 700;
}
[data-style='brutal'] .sep {
  display: block;
  color: var(--accent);
}

/* ---- 原版：柔和色块 + 渐变数字 ---- */
[data-style='legacy'] .units {
  gap: var(--space-2);
  flex-wrap: wrap;
}
[data-style='legacy'] .unit {
  flex: 1;
  min-width: 3.4em;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--accent-soft-2);
  border-radius: var(--radius-md);
  background: var(--accent-soft);
}
[data-style='legacy'] .unit strong {
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 900;
}
[data-style='legacy'] .sep {
  display: block;
}

/* ---- 校园：便签上的大号手账数字，冒号用棕色 ---- */
[data-style='campus'] .units {
  gap: 4px;
}
[data-style='campus'] .unit strong {
  font-family: var(--font-display);
  font-size: clamp(1.9rem, 3.6vw, 2.7rem);
  font-weight: 400;
  color: var(--campus-blue-d);
}
[data-style='campus'] .unit span {
  color: var(--campus-sticky-brown);
  font-weight: 700;
  letter-spacing: 0.5px;
}
[data-style='campus'] .sep {
  display: block;
  color: rgba(110, 83, 0, 0.42);
}
</style>
