<script setup lang="ts">
/**
 * 列表页工具栏：关键词搜索 + 分类筛选（可选排序插槽）。
 *
 * 相册 / 视频 / 文章三个列表页原来各有一份几乎相同的模板：
 * 一个带图标的搜索框 + 一组 chip。抽成组件后三处的无障碍标注、
 * 按下态与响应式行为天然一致，页面只剩「声明字段 + 排版」。
 */
import AppIcon from '@/components/common/AppIcon.vue'

withDefaults(
  defineProps<{
    /** 分类列表，第一项通常是「全部」 */
    categories: string[]
    placeholder: string
    /** 搜索框的无障碍名称，例如「搜索相册」 */
    searchLabel: string
    /** 分类按钮组的无障碍名称 */
    categoryLabel?: string
  }>(),
  { categoryLabel: '分类筛选' },
)

const keyword = defineModel<string>('keyword', { required: true })
const category = defineModel<string>('category', { required: true })

/** 输入即筛选，由页面决定是否需要防抖后重置分页 */
const emit = defineEmits<{ search: [] }>()
</script>

<template>
  <div class="toolbar card">
    <label class="search-field">
      <AppIcon name="search" :size="16" :stroke-width="1.9" />
      <span class="visually-hidden">{{ searchLabel }}</span>
      <input v-model="keyword" type="search" :placeholder="placeholder" @input="emit('search')" />
    </label>

    <div class="chips" role="group" :aria-label="categoryLabel">
      <button
        v-for="c in categories"
        :key="c"
        class="chip"
        type="button"
        :class="{ 'chip--active': category === c }"
        :aria-pressed="category === c"
        @click="category = c"
      >
        {{ c }}
      </button>
    </div>

    <!-- 排序等页面专属控件由调用方提供（它的作用域样式留在页面里） -->
    <slot name="sort" />
  </div>
</template>
