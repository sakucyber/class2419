<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(defineProps<{ target: string; label?: string }>(), {
  label: '倒计时',
})

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
  const day = Math.floor(diff / 86400000)
  const hour = Math.floor((diff % 86400000) / 3600000)
  const minute = Math.floor((diff % 3600000) / 60000)
  const second = Math.floor((diff % 60000) / 1000)
  return { day, hour, minute, second, done: diff <= 0 }
})
</script>

<template>
  <div class="countdown" role="timer" :aria-label="`距离${props.label}还有 ${parts.day} 天`">
    <template v-if="!parts.done">
      <div class="unit">
        <strong>{{ parts.day }}</strong>
        <span>天</span>
      </div>
      <span class="sep">:</span>
      <div class="unit">
        <strong>{{ String(parts.hour).padStart(2, '0') }}</strong>
        <span>时</span>
      </div>
      <span class="sep">:</span>
      <div class="unit">
        <strong>{{ String(parts.minute).padStart(2, '0') }}</strong>
        <span>分</span>
      </div>
      <span class="sep">:</span>
      <div class="unit">
        <strong>{{ String(parts.second).padStart(2, '0') }}</strong>
        <span>秒</span>
      </div>
    </template>
    <p v-else class="done-msg">{{ props.label }}开始了，2419 加油！</p>
  </div>
</template>

<style scoped>
.countdown {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.unit {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 3.4em;
  padding: var(--space-2) var(--space-3);
  background: var(--primary-soft);
  border: 1px solid var(--primary-soft-2);
  border-radius: var(--radius-md);
  transition: transform var(--duration) var(--ease-spring);
}
.unit:hover {
  transform: translateY(-3px) scale(1.05);
}
.unit strong {
  font-size: 1.55rem;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1.2;
}
.unit span {
  font-size: 0.72rem;
  color: var(--text-3);
  font-weight: 600;
}
.sep {
  color: var(--text-3);
  font-weight: 700;
}
.done-msg {
  font-weight: 700;
  color: var(--primary);
}
</style>
