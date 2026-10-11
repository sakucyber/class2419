<script setup lang="ts">
import { reactive, ref } from 'vue'

import type { Album, Photo } from '@/types'
import { compressImage, pickFile } from '@/utils/image'
import { uid } from '@/utils/storage'

const props = defineProps<{ album?: Album | null }>()
const emit = defineEmits<{ save: [album: Album]; cancel: [] }>()

const form = reactive({
  title: props.album?.title || '',
  category: props.album?.category || '校园生活',
  tags: (props.album?.tags || []).join(','),
  description: props.album?.description || '',
  author: props.album?.author || '',
  draft: props.album?.draft || false,
})

const photos = ref<Photo[]>(props.album?.photos ? props.album.photos.map((p) => ({ ...p })) : [])
const cover = ref(props.album?.cover || '')
const busy = ref(false)
const errorMsg = ref('')

async function addPhotos() {
  const files = await pickFile('image/*')
  if (!files) return
  busy.value = true
  errorMsg.value = ''
  try {
    const dataUrl = await compressImage(files)
    photos.value.push({ id: uid('p'), src: dataUrl, caption: '' })
    if (!cover.value) cover.value = dataUrl
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : '图片处理失败'
  } finally {
    busy.value = false
  }
}

async function setCover() {
  const files = await pickFile('image/*')
  if (!files) return
  busy.value = true
  try {
    cover.value = await compressImage(files)
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : '图片处理失败'
  } finally {
    busy.value = false
  }
}

function removePhoto(i: number) {
  photos.value.splice(i, 1)
}

function submit() {
  if (!form.title.trim()) {
    errorMsg.value = '请填写相册标题'
    return
  }
  if (!photos.value.length) {
    errorMsg.value = '请至少添加一张照片'
    return
  }
  const album: Album = {
    id: props.album?.id || uid('alb'),
    title: form.title.trim(),
    description: form.description.trim(),
    cover: cover.value || photos.value[0].src,
    category: form.category.trim() || '其他',
    tags: form.tags
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean),
    photos: photos.value,
    author: form.author.trim() || '匿名同学',
    createdAt: props.album?.createdAt || new Date().toISOString(),
    likes: props.album?.likes || 0,
    source: 'user',
    draft: form.draft,
  }
  emit('save', album)
}
</script>

<template>
  <form class="form card" @submit.prevent="submit">
    <h2 class="form-title">{{ album ? '编辑相册' : '新建相册' }}</h2>

    <div class="field">
      <label for="alb-title">标题 *</label>
      <input
        id="alb-title"
        v-model="form.title"
        class="input"
        required
        placeholder="例如：秋季运动会"
      />
    </div>

    <div class="grid-2">
      <div class="field">
        <label for="alb-cat">分类</label>
        <input
          id="alb-cat"
          v-model="form.category"
          class="input"
          placeholder="校园生活 / 活动 / 日常…"
        />
      </div>
      <div class="field">
        <label for="alb-author">作者</label>
        <input id="alb-author" v-model="form.author" class="input" placeholder="昵称即可" />
      </div>
    </div>

    <div class="field">
      <label for="alb-tags">标签</label>
      <input
        id="alb-tags"
        v-model="form.tags"
        class="input"
        placeholder="用逗号分隔，如：运动会, 拼搏"
      />
    </div>

    <div class="field">
      <label for="alb-desc">描述</label>
      <textarea
        id="alb-desc"
        v-model="form.description"
        class="textarea"
        rows="3"
        placeholder="说点什么关于这组照片的故事…"
      ></textarea>
    </div>

    <div class="field">
      <label>封面图</label>
      <div class="cover-row">
        <img v-if="cover" :src="cover" alt="封面预览" class="cover-preview" />
        <button type="button" class="btn btn--ghost btn--sm" :disabled="busy" @click="setCover">
          {{ cover ? '更换封面' : '上传封面' }}
        </button>
      </div>
      <p class="hint">建议比例 4:3；上传图片会自动压缩后保存在本地。</p>
    </div>

    <div class="field">
      <label>照片（{{ photos.length }}）*</label>
      <div class="photo-list">
        <div v-for="(p, i) in photos" :key="p.id" class="photo-item">
          <img :src="p.src" :alt="p.caption || `照片 ${i + 1}`" class="thumb" />
          <input
            v-model="p.caption"
            class="input caption-input"
            :aria-label="`第 ${i + 1} 张照片说明`"
            placeholder="照片说明（可选）"
          />
          <button
            type="button"
            class="btn btn--ghost btn--sm"
            :aria-label="`删除第 ${i + 1} 张`"
            @click="removePhoto(i)"
          >
            ✕
          </button>
        </div>
        <button type="button" class="btn btn--ghost" :disabled="busy" @click="addPhotos">
          ＋ 添加照片
        </button>
      </div>
    </div>

    <label class="check-row">
      <input v-model="form.draft" type="checkbox" />
      保存为草稿（不在前台展示）
    </label>

    <p v-if="errorMsg" class="form-error" role="alert">{{ errorMsg }}</p>

    <div class="form-actions">
      <button type="submit" class="btn" :disabled="busy">
        {{ busy ? '处理中…' : '保存相册' }}
      </button>
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
.cover-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.cover-preview {
  width: 96px;
  height: 72px;
  object-fit: cover;
  border-radius: var(--radius-xs);
  border: 1px solid var(--border);
}
.photo-list {
  display: grid;
  gap: var(--space-2);
}
.photo-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.thumb {
  width: 56px;
  height: 42px;
  object-fit: cover;
  border-radius: var(--radius-xs);
  flex: none;
  border: 1px solid var(--border);
}
.caption-input {
  flex: 1;
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
