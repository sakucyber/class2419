<script setup lang="ts">
import { reactive, ref } from 'vue'

import type { Announcement } from '@/types'
import { uid } from '@/utils/storage'

const props = defineProps<{ item?: Announcement | null }>()
const emit = defineEmits<{ save: [item: Announcement]; cancel: [] }>()

const form = reactive({
  title: props.item?.title || '',
  content: props.item?.content || '',
  level: (props.item?.level || 'info') as 'info' | 'success' | 'warning',
  pinned: props.item?.pinned || false,
})

const errorMsg = ref('')

function submit() {
  if (!form.title.trim() || !form.content.trim()) {
    errorMsg.value = '标题和内容都不能为空'
    return
  }
  emit('save', {
    id: props.item?.id || uid('ann'),
    title: form.title.trim(),
    content: form.content.trim(),
    createdAt: props.item?.createdAt || new Date().toISOString(),
    pinned: form.pinned,
    level: form.level,
    source: 'user',
  })
}
</script>

<template>
  <form class="form card" @submit.prevent="submit">
    <h2 class="form-title">{{ item ? '编辑公告' : '发布公告' }}</h2>

    <div class="field">
      <label for="ann-title">标题 *</label>
      <input
        id="ann-title"
        v-model="form.title"
        class="input"
        required
        placeholder="例如：班会通知"
      />
    </div>

    <div class="field">
      <label for="ann-content">内容 *</label>
      <textarea
        id="ann-content"
        v-model="form.content"
        class="textarea"
        rows="4"
        required
      ></textarea>
    </div>

    <div class="grid-2">
      <div class="field">
        <label for="ann-level">级别</label>
        <select id="ann-level" v-model="form.level" class="select">
          <option value="info">普通</option>
          <option value="success">喜讯</option>
          <option value="warning">重要</option>
        </select>
      </div>
      <div class="field">
        <label class="check-row inline">
          <input v-model="form.pinned" type="checkbox" />
          置顶显示
        </label>
      </div>
    </div>

    <p v-if="errorMsg" class="form-error" role="alert">{{ errorMsg }}</p>

    <div class="form-actions">
      <button type="submit" class="btn">保存公告</button>
      <button type="button" class="btn btn--ghost" @click="emit('cancel')">取消</button>
    </div>
  </form>
</template>

<style scoped>
.form {
  padding: clamp(18px, 3vw, 26px);
  margin-bottom: var(--space-5);
}
.form-title {
  font-size: 1.15rem;
  margin-bottom: var(--space-4);
}
.grid-2 {
  display: grid;
  gap: 0 var(--space-4);
}
@media (min-width: 560px) {
  .grid-2 {
    grid-template-columns: 1fr 1fr;
  }
}
.check-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.92rem;
  color: var(--text-2);
  cursor: pointer;
  margin-bottom: var(--space-4);
}
.check-row.inline {
  margin-top: 28px;
  margin-bottom: 0;
}
.form-error {
  color: var(--danger);
  font-size: 0.88rem;
  font-weight: 600;
  margin-bottom: var(--space-3);
}
.form-actions {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}
</style>
