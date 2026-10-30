<script setup lang="ts">
/**
 * 进度条：阅读进度 / 轮播 / 视频加载共用。
 * 高度、圆角、描边、填充色全部来自皮肤令牌，三种规范里的
 * 「6px 无圆角 / 6px 全圆角 / 14px 黑边荧光绿」由此自动成立。
 */
const props = withDefaults(
  defineProps<{
    value: number
    label?: string
    /** 是否显示右侧百分比文字 */
    showValue?: boolean
  }>(),
  { label: '进度', showValue: false },
)

const clamped = () => Math.min(100, Math.max(0, Math.round(props.value)))
</script>

<template>
  <div
    class="progress-row"
    role="progressbar"
    :aria-label="label"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="clamped()"
  >
    <div class="progress">
      <div class="progress__fill" :style="{ width: `${clamped()}%` }"></div>
    </div>
    <span v-if="showValue" class="progress-value num">{{ clamped() }}%</span>
  </div>
</template>

<style scoped>
.progress-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.progress {
  flex: 1;
  min-width: 0;
}
.progress-value {
  flex: none;
  font-size: var(--fs-2xs);
  color: var(--text-3);
  letter-spacing: 0.5px;
}
</style>
