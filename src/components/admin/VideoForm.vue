<script setup lang="ts">
import { reactive, ref } from 'vue'

import type { VideoItem } from '@/types'
import { compressImage, pickFile } from '@/utils/image'
import { putBlob } from '@/utils/idb'
import { uid } from '@/utils/storage'

const props = defineProps<{ video?: VideoItem | null }>()
const emit = defineEmits<{ save: [video: VideoItem]; cancel: [] }>()

type SourceType = 'upload' | 'url' | 'embed' | 'external'

function inferType(v?: VideoItem | null): SourceType {
  if (!v) return 'upload'
  if (v.embedUrl) return 'embed'
  if (v.externalUrl) return 'external'
  return 'url'
}

const form = reactive({
  title: props.video?.title || '',
  category: props.video?.category || '校园生活',
  tags: (props.video?.tags || []).join(','),
  description: props.video?.description || '',
  author: props.video?.author || '',
  duration: props.video?.duration || '',
  draft: props.video?.draft || false,
  type: inferType(props.video),
  url: props.video?.src && !props.video.src.startsWith('idb:') ? props.video.src : '',
  embedUrl: props.video?.embedUrl || '',
  externalUrl: props.video?.externalUrl || '',
})

const cover = ref(props.video?.cover || '')
const localFileName = ref(props.video?.src?.startsWith('idb:') ? '（已上传的本地视频）' : '')
const busy = ref(false)
const errorMsg = ref('')
const progressText = ref('')

/** 从视频文件自动截取一帧作为封面 */
function grabPoster(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.src = url
    video.onloadeddata = () => {
      video.currentTime = Math.min(1, (video.duration || 2) / 3)
    }
    video.onseeked = () => {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 1280
      canvas.height = video.videoHeight || 720
      const ctx = canvas.getContext('2d')
      URL.revokeObjectURL(url)
      if (!ctx) {
        reject(new Error('截图失败'))
        return
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('视频读取失败'))
    }
  })
}

let idbKey = props.video?.src?.startsWith('idb:') ? props.video.src.slice(4) : ''

async function uploadVideo() {
  const file = await pickFile('video/*')
  if (!file) return
  busy.value = true
  errorMsg.value = ''
  progressText.value = '正在上传到浏览器本地数据库…'
  try {
    idbKey = `vid_${uid('v')}`
    await putBlob(idbKey, file)
    localFileName.value = file.name
    progressText.value = ''
    if (!cover.value) {
      progressText.value = '正在截取封面…'
      try {
        cover.value = await grabPoster(file)
      } catch {
        /* 封面失败不阻断 */
      }
    }
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : '视频上传失败（可能是存储空间不足）'
  } finally {
    busy.value = false
    progressText.value = ''
  }
}

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

function submit() {
  errorMsg.value = ''
  if (!form.title.trim()) {
    errorMsg.value = '请填写视频标题'
    return
  }
  if (form.type === 'upload' && !idbKey && !form.url) {
    errorMsg.value = '请上传本地视频或填写视频直链'
    return
  }
  if (form.type === 'url' && !/^https?:\/\//i.test(form.url)) {
    errorMsg.value = '视频直链需要以 http(s):// 开头'
    return
  }
  if (form.type === 'embed' && !/^https:\/\//i.test(form.embedUrl)) {
    errorMsg.value = '外链播放器地址需要以 https:// 开头'
    return
  }
  if (form.type === 'external' && !/^https?:\/\//i.test(form.externalUrl)) {
    errorMsg.value = '外部链接需要以 http(s):// 开头'
    return
  }

  const video: VideoItem = {
    id: props.video?.id || uid('vid'),
    title: form.title.trim(),
    description: form.description.trim(),
    cover: cover.value || '/images/misc/class-card-bg.svg',
    category: form.category.trim() || '其他',
    tags: form.tags
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean),
    author: form.author.trim() || '匿名同学',
    createdAt: props.video?.createdAt || new Date().toISOString(),
    src:
      form.type === 'upload'
        ? idbKey
          ? `idb:${idbKey}`
          : form.url || undefined
        : form.type === 'url'
          ? form.url || undefined
          : undefined,
    embedUrl: form.type === 'embed' ? form.embedUrl : undefined,
    externalUrl: form.type === 'external' ? form.externalUrl : undefined,
    duration: form.duration.trim() || undefined,
    source: 'user',
    draft: form.draft,
  }
  emit('save', video)
}
</script>

<template>
  <form class="form card" @submit.prevent="submit">
    <h2 class="form-title">{{ video ? '编辑视频' : '新建视频' }}</h2>

    <div class="field">
      <label for="vid-title">标题 *</label>
      <input
        id="vid-title"
        v-model="form.title"
        class="input"
        required
        placeholder="例如：运动会集锦"
      />
    </div>

    <div class="field">
      <label for="vid-type">视频来源</label>
      <select id="vid-type" v-model="form.type" class="select">
        <option value="upload">上传本地视频（存入 IndexedDB）</option>
        <option value="url">在线视频直链（mp4 等）</option>
        <option value="embed">外链播放器（Bilibili / YouTube iframe）</option>
        <option value="external">外部链接（跳转播放）</option>
      </select>
    </div>

    <div v-if="form.type === 'upload'" class="field">
      <label>本地视频文件</label>
      <div class="row">
        <button type="button" class="btn btn--ghost btn--sm" :disabled="busy" @click="uploadVideo">
          {{ localFileName ? '重新上传' : '选择视频文件' }}
        </button>
        <span class="hint">{{ localFileName || '未选择文件' }}</span>
      </div>
      <p class="hint">视频以 Blob 形式保存在浏览器 IndexedDB，不会上传到任何服务器。</p>
    </div>

    <div v-if="form.type === 'url'" class="field">
      <label for="vid-url">视频直链</label>
      <input
        id="vid-url"
        v-model="form.url"
        class="input"
        placeholder="https://example.com/video.mp4"
      />
    </div>

    <div v-if="form.type === 'embed'" class="field">
      <label for="vid-embed">播放器地址</label>
      <input
        id="vid-embed"
        v-model="form.embedUrl"
        class="input"
        placeholder="https://player.bilibili.com/player.html?bvid=BVxxxx"
      />
    </div>

    <div v-if="form.type === 'external'" class="field">
      <label for="vid-ext">外部链接</label>
      <input id="vid-ext" v-model="form.externalUrl" class="input" placeholder="https://…" />
    </div>

    <div class="grid-2">
      <div class="field">
        <label for="vid-cat">分类</label>
        <input id="vid-cat" v-model="form.category" class="input" placeholder="校园生活 / 活动…" />
      </div>
      <div class="field">
        <label for="vid-dur">时长（展示用）</label>
        <input id="vid-dur" v-model="form.duration" class="input" placeholder="如 03:20" />
      </div>
    </div>

    <div class="grid-2">
      <div class="field">
        <label for="vid-tags">标签</label>
        <input id="vid-tags" v-model="form.tags" class="input" placeholder="逗号分隔" />
      </div>
      <div class="field">
        <label for="vid-author">作者</label>
        <input id="vid-author" v-model="form.author" class="input" placeholder="昵称即可" />
      </div>
    </div>

    <div class="field">
      <label for="vid-desc">描述</label>
      <textarea id="vid-desc" v-model="form.description" class="textarea" rows="3"></textarea>
    </div>

    <div class="field">
      <label>封面图</label>
      <div class="row">
        <img v-if="cover" :src="cover" alt="封面预览" class="cover-preview" />
        <button type="button" class="btn btn--ghost btn--sm" :disabled="busy" @click="setCover">
          {{ cover ? '更换封面' : '上传封面' }}
        </button>
        <span v-if="busy" class="hint">{{ progressText || '处理中…' }}</span>
      </div>
      <p class="hint">上传本地视频时将自动截取首帧作为封面（可手动更换）。</p>
    </div>

    <label class="check-row">
      <input v-model="form.draft" type="checkbox" />
      保存为草稿（不在前台展示）
    </label>

    <p v-if="errorMsg" class="form-error" role="alert">{{ errorMsg }}</p>

    <div class="form-actions">
      <button type="submit" class="btn" :disabled="busy">
        {{ busy ? '处理中…' : '保存视频' }}
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
