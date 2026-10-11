<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import type { Article } from '@/types'
import { estimateReadingMinutes } from '@/utils/format'
import { compressImage, pickFile } from '@/utils/image'
import { renderMarkdown } from '@/utils/markdown'
import { uid } from '@/utils/storage'

const props = defineProps<{ article?: Article | null }>()
const emit = defineEmits<{ save: [article: Article]; cancel: [] }>()

const form = reactive({
  title: props.article?.title || '',
  category: props.article?.category || '随笔',
  tags: (props.article?.tags || []).join(','),
  author: props.article?.author || '',
  excerpt: props.article?.excerpt || '',
  content: props.article?.content || '',
  draft: props.article?.draft || false,
})

const cover = ref(props.article?.cover || '')
const previewHtml = ref('')
const showPreview = ref(false)
const errorMsg = ref('')
const busy = ref(false)

async function updatePreview() {
  if (!showPreview.value) return
  previewHtml.value = await renderMarkdown(form.content)
}

watch([showPreview, () => form.content], updatePreview, { immediate: false })

async function setCover() {
  const file = await pickFile('image/*')
  if (!file) return
  busy.value = true
  try {
    cover.value = await compressImage(file)
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : '封面处理失败'
  } finally {
    busy.value = false
  }
}

const readingMinutes = computed(() => estimateReadingMinutes(form.content))

function submit() {
  if (!form.title.trim()) {
    errorMsg.value = '请填写文章标题'
    return
  }
  if (!form.content.trim()) {
    errorMsg.value = '正文不能为空'
    return
  }
  const article: Article = {
    id: props.article?.id || uid('art'),
    title: form.title.trim(),
    excerpt: form.excerpt.trim() || form.content.replace(/\s+/g, '').slice(0, 100),
    cover: cover.value || '/images/misc/class-card-bg.svg',
    category: form.category.trim() || '随笔',
    tags: form.tags
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean),
    author: form.author.trim() || '匿名同学',
    createdAt: props.article?.createdAt || new Date().toISOString(),
    updatedAt: props.article ? new Date().toISOString() : undefined,
    readingMinutes: readingMinutes.value,
    content: form.content,
    source: 'user',
    draft: form.draft,
  }
  emit('save', article)
}
</script>

<template>
  <form class="form card" @submit.prevent="submit">
    <h2 class="form-title">{{ article ? '编辑文章' : '写文章' }}</h2>

    <div class="field">
      <label for="art-title">标题 *</label>
      <input
        id="art-title"
        v-model="form.title"
        class="input"
        required
        placeholder="给文章起个好名字"
      />
    </div>

    <div class="grid-2">
      <div class="field">
        <label for="art-cat">分类</label>
        <input id="art-cat" v-model="form.category" class="input" placeholder="随笔 / 活动记录…" />
      </div>
      <div class="field">
        <label for="art-author">作者</label>
        <input id="art-author" v-model="form.author" class="input" placeholder="昵称即可" />
      </div>
    </div>

    <div class="field">
      <label for="art-tags">标签</label>
      <input
        id="art-tags"
        v-model="form.tags"
        class="input"
        placeholder="逗号分隔，如：运动会, 青春"
      />
    </div>

    <div class="field">
      <label for="art-excerpt">摘要</label>
      <input
        id="art-excerpt"
        v-model="form.excerpt"
        class="input"
        placeholder="留空则自动截取正文前 100 字"
      />
    </div>

    <div class="field">
      <label>封面图</label>
      <div class="row">
        <img v-if="cover" :src="cover" alt="封面预览" class="cover-preview" />
        <button type="button" class="btn btn--ghost btn--sm" :disabled="busy" @click="setCover">
          {{ cover ? '更换封面' : '上传封面' }}
        </button>
      </div>
    </div>

    <div class="field">
      <div class="label-row">
        <label for="art-content">正文（Markdown）*</label>
        <button type="button" class="btn btn--ghost btn--sm" @click="showPreview = !showPreview">
          {{ showPreview ? '关闭预览' : '实时预览' }}
        </button>
      </div>
      <textarea
        id="art-content"
        v-model="form.content"
        class="textarea md-editor"
        rows="14"
        placeholder="支持 Markdown：# 标题、**加粗**、- 列表、> 引用、`代码`、![图片](url) …"
        required
      ></textarea>
      <p class="hint">
        预计阅读时长：约 {{ readingMinutes }} 分钟。保存前将自动进行 XSS 消毒渲染。
      </p>
    </div>

    <div v-if="showPreview" class="preview card">
      <p class="preview-label">预览</p>
      <!-- 已经过 DOMPurify 消毒 -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="prose" v-html="previewHtml"></div>
    </div>

    <label class="check-row">
      <input v-model="form.draft" type="checkbox" />
      保存为草稿（不在前台展示）
    </label>

    <p v-if="errorMsg" class="form-error" role="alert">{{ errorMsg }}</p>

    <div class="form-actions">
      <button type="submit" class="btn" :disabled="busy">
        {{ busy ? '处理中…' : '保存文章' }}
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
.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
.md-editor {
  font-family: var(--font-mono);
  font-size: 0.9rem;
}
.row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}
.cover-preview {
  width: 96px;
  height: 54px;
  object-fit: cover;
  border-radius: var(--radius-xs);
  border: 1px solid var(--border);
}
.preview {
  padding: var(--space-4);
  margin-bottom: var(--space-4);
  max-height: 420px;
  overflow-y: auto;
}
.preview-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-3);
  margin-bottom: var(--space-2);
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
.hint {
  font-size: 0.8rem;
  color: var(--text-3);
}
</style>
