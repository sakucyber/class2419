<script setup lang="ts">
/**
 * 相册时间轴：把已发布相册里的照片按「年-月」摊平重排，支持按年份筛选。
 *
 * 照片本身没有拍摄日期，归档时间取 `photo.takenAt ?? album.createdAt`
 * —— 与「随机回忆」里的「收录于」保持一致，文案上也写「收录」而不是「拍摄」。
 * 真实照片以后补 `takenAt` 时，这里会自动按真实日期归档，不需要改代码。
 */
import { computed, ref, watch } from 'vue'

import AppIcon from '@/components/common/AppIcon.vue'
import Breadcrumb from '@/components/common/Breadcrumb.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import LazyImage from '@/components/common/LazyImage.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import Lightbox from '@/components/media/Lightbox.vue'
import { useContentStore } from '@/store/content'
import { monthKey, monthLabel } from '@/utils/format'

interface TimelinePhoto {
  key: string
  src: string
  caption: string
  srcset?: string
  sizes?: string
  width?: number
  height?: number
  albumId: string
  albumTitle: string
  albumCategory: string
  date: string
}

interface MonthGroup {
  key: string
  label: string
  photos: TimelinePhoto[]
  albums: { id: string; title: string; count: number }[]
}

const content = useContentStore()

/** 摊平所有照片，日期取 takenAt，缺省回退到相册收录时间 */
const photos = computed<TimelinePhoto[]>(() =>
  content.publicAlbums.flatMap((album) =>
    (album.photos ?? []).map((photo) => ({
      key: `${album.id}:${photo.id}`,
      src: photo.src,
      caption: photo.caption ?? '',
      srcset: photo.srcset,
      sizes: photo.sizes,
      width: photo.width,
      height: photo.height,
      albumId: album.id,
      albumTitle: album.title,
      albumCategory: album.category,
      date: photo.takenAt || album.createdAt,
    })),
  ),
)

/** 时间倒序；同一天的按相册 id 稳定排序，避免每次渲染顺序抖动 */
const sorted = computed(() =>
  [...photos.value].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : a.key < b.key ? 1 : -1,
  ),
)

const years = computed(() => {
  const counts = new Map<string, number>()
  for (const photo of photos.value) {
    const year = monthKey(photo.date).slice(0, 4)
    counts.set(year, (counts.get(year) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([year, count]) => ({ year, count }))
})

const activeYear = ref('all')
const activeMonth = ref('all')

/** 选中某一年后，再给出该年有照片的月份（二级筛选） */
const monthsOfYear = computed(() => {
  if (activeYear.value === 'all') return []
  const counts = new Map<string, number>()
  for (const photo of photos.value) {
    const key = monthKey(photo.date)
    if (!key.startsWith(activeYear.value)) continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, count]) => ({ key, label: `${Number(key.slice(5))} 月`, count }))
})

const yearCount = computed(() => monthsOfYear.value.reduce((sum, item) => sum + item.count, 0))

/** 结果行上的筛选描述 */
const filterLabel = computed(() => {
  if (activeYear.value === 'all') return '全部年份'
  const year = `${activeYear.value} 年`
  if (activeMonth.value === 'all') return year
  return `${year} ${Number(activeMonth.value.slice(5))} 月`
})

function resetFilter(): void {
  activeYear.value = 'all'
  activeMonth.value = 'all'
}

const filtered = computed(() =>
  sorted.value.filter((photo) => {
    const key = monthKey(photo.date)
    if (activeYear.value !== 'all' && !key.startsWith(activeYear.value)) return false
    if (activeMonth.value !== 'all' && key !== activeMonth.value) return false
    return true
  }),
)

/* ---------- 灯箱：索引对应当前筛选后的照片序列 ---------- */
const lightboxOpen = ref(false)
const lightboxIndex = ref(0)
const lightboxItems = computed(() =>
  filtered.value.map((photo) => ({
    src: photo.src,
    caption: photo.caption || photo.albumTitle,
  })),
)

/** 按年月分组（Map 保序，沿用 filtered 的倒序） */
const groups = computed<MonthGroup[]>(() => {
  const buckets = new Map<string, TimelinePhoto[]>()
  for (const photo of filtered.value) {
    const key = monthKey(photo.date)
    const list = buckets.get(key)
    if (list) list.push(photo)
    else buckets.set(key, [photo])
  }
  return [...buckets.entries()].map(([key, items]) => {
    const albumMap = new Map<string, { id: string; title: string; count: number }>()
    for (const item of items) {
      const entry = albumMap.get(item.albumId)
      if (entry) entry.count += 1
      else albumMap.set(item.albumId, { id: item.albumId, title: item.albumTitle, count: 1 })
    }
    return {
      key,
      label: monthLabel(key),
      photos: items,
      albums: [...albumMap.values()],
    }
  })
})

const summary = computed(() => {
  if (!photos.value.length) return ''
  const months = new Set(photos.value.map((p) => monthKey(p.date)))
  const earliest = sorted.value[sorted.value.length - 1]
  return `共 ${photos.value.length} 张照片 · 跨 ${months.size} 个月 · 最早收录于 ${monthLabel(monthKey(earliest.date))}`
})

function openPhoto(photo: TimelinePhoto): void {
  const index = filtered.value.findIndex((item) => item.key === photo.key)
  if (index < 0) return
  lightboxIndex.value = index
  lightboxOpen.value = true
}

/* 切换筛选后照片序列会变，旧索引不再有效，顺手关掉灯箱 */
watch(activeYear, () => {
  activeMonth.value = 'all'
  lightboxOpen.value = false
})
watch(activeMonth, () => {
  lightboxOpen.value = false
})
</script>

<template>
  <div class="container page">
    <Breadcrumb
      :items="[{ label: '首页', to: '/' }, { label: '相册', to: '/albums' }, { label: '时间轴' }]"
    />

    <PageHeader
      kicker="Timeline"
      title="照片时间轴"
      :subtitle="summary || '按年月自动归档，找一张照片不用再翻相册'"
    >
      <template #actions>
        <RouterLink to="/albums" class="btn btn--ghost">
          <AppIcon name="image" :size="16" />
          按相册浏览
        </RouterLink>
      </template>
    </PageHeader>

    <ErrorState v-if="content.error" :message="content.error" @retry="content.init()" />

    <SkeletonBlock v-else-if="content.loading" variant="grid" :count="6" />

    <template v-else>
      <EmptyState
        v-if="!photos.length"
        icon="camera"
        title="还没有照片"
        description="相册里上传照片后，这里会自动按年月排好。"
        action-text="去相册看看"
        action-to="/albums"
      />

      <template v-else>
        <!-- 时间筛选：年份 + 月份两级 -->
        <div class="filter-bar card">
          <div class="filter-row" role="group" aria-label="按年份筛选">
            <span class="filter-label">
              <AppIcon name="calendar" :size="15" :stroke-width="1.9" />
              时间
            </span>
            <div class="filter-chips">
              <button
                type="button"
                class="chip"
                :class="{ 'chip--active': activeYear === 'all' }"
                :aria-pressed="activeYear === 'all'"
                @click="activeYear = 'all'"
              >
                全部年份
                <span class="chip-count num">{{ photos.length }}</span>
              </button>
              <button
                v-for="item in years"
                :key="item.year"
                type="button"
                class="chip"
                :class="{ 'chip--active': activeYear === item.year }"
                :aria-pressed="activeYear === item.year"
                @click="activeYear = item.year"
              >
                {{ item.year }}
                <span class="chip-count num">{{ item.count }}</span>
              </button>
            </div>
          </div>

          <div
            v-if="monthsOfYear.length"
            class="filter-row filter-row--sub"
            role="group"
            aria-label="按月份筛选"
          >
            <span class="filter-label">月份</span>
            <div class="filter-chips">
              <button
                type="button"
                class="chip"
                :class="{ 'chip--active': activeMonth === 'all' }"
                :aria-pressed="activeMonth === 'all'"
                @click="activeMonth = 'all'"
              >
                全年
                <span class="chip-count num">{{ yearCount }}</span>
              </button>
              <button
                v-for="item in monthsOfYear"
                :key="item.key"
                type="button"
                class="chip"
                :class="{ 'chip--active': activeMonth === item.key }"
                :aria-pressed="activeMonth === item.key"
                @click="activeMonth = item.key"
              >
                {{ item.label }}
                <span class="chip-count num">{{ item.count }}</span>
              </button>
            </div>
          </div>
        </div>

        <p class="result-line">
          当前筛选：<strong>{{ filterLabel }}</strong> · {{ filtered.length }} 张 ·
          {{ groups.length }} 个月份
        </p>

        <EmptyState
          v-if="!groups.length"
          icon="search"
          title="这个时间段还没有照片"
          description="换一个月份或年份，或者回到全部年份。"
        >
          <button class="btn btn--soft btn--sm" type="button" @click="resetFilter">
            查看全部年份
          </button>
        </EmptyState>

        <ol v-else class="timeline">
          <li v-for="group in groups" :key="group.key" class="tl-item">
            <span class="tl-dot" aria-hidden="true"></span>
            <header class="tl-head">
              <h2 class="tl-title">{{ group.label }}</h2>
              <span class="tl-count num">{{ group.photos.length }} 张</span>
              <div class="tl-albums">
                <RouterLink
                  v-for="album in group.albums"
                  :key="album.id"
                  :to="`/albums/${album.id}`"
                  class="tl-album"
                >
                  {{ album.title }}
                  <span class="num">{{ album.count }}</span>
                </RouterLink>
              </div>
            </header>

            <div class="photo-grid">
              <button
                v-for="(photo, i) in group.photos"
                :key="photo.key"
                type="button"
                class="photo"
                :aria-label="`预览 ${photo.caption || photo.albumTitle}（${photo.albumTitle}）`"
                @click="openPhoto(photo)"
              >
                <LazyImage
                  :src="photo.src"
                  :srcset="photo.srcset"
                  :sizes="photo.sizes"
                  :width="photo.width"
                  :height="photo.height"
                  :alt="photo.caption || photo.albumTitle"
                  aspect="1 / 1"
                  radius="0"
                />
                <span class="photo-index num" aria-hidden="true">
                  {{ String(i + 1).padStart(2, '0') }}
                </span>
                <span class="photo-cap">{{ photo.caption || photo.albumTitle }}</span>
              </button>
            </div>
          </li>
        </ol>

        <Lightbox
          v-model:open="lightboxOpen"
          v-model:index="lightboxIndex"
          :items="lightboxItems"
        />
      </template>
    </template>
  </div>
</template>

<style scoped>
/* ---------- 年份筛选 ---------- */
.filter-bar {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
}
.filter-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}
/* 月份是年份的下级筛选，用虚线分隔，避免看起来是同一层 */
.filter-row--sub {
  padding-top: var(--space-2);
  border-top: 1px dashed var(--line);
}
.filter-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: none;
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--text-2);
}
.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.chip-count {
  margin-left: 4px;
  padding: 0 5px;
  border-radius: var(--radius-pill);
  background: var(--bg-soft);
  font-size: 0.66rem;
  color: var(--text-3);
}
.chip--active .chip-count {
  background: rgba(255, 255, 255, 0.22);
  color: inherit;
}

.result-line {
  margin: var(--space-4) 0 var(--space-5);
  font-size: var(--fs-sm);
  color: var(--text-3);
}
.result-line strong {
  color: var(--text);
}

/* ---------- 时间轴 ---------- */
.timeline {
  display: grid;
  gap: 0;
}
.tl-item {
  position: relative;
  padding-left: 30px;
  padding-bottom: var(--space-8);
}
.tl-item::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 16px;
  bottom: 0;
  width: 2px;
  background: var(--line-2);
}
.tl-item:last-child::before {
  display: none;
}
.tl-dot {
  position: absolute;
  left: 0;
  top: 6px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.tl-head {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-bottom: var(--space-3);
}
.tl-title {
  font-size: var(--fs-xl);
}
.tl-count {
  font-size: var(--fs-2xs);
  color: var(--text-3);
  letter-spacing: 0.5px;
}
.tl-albums {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-left: auto;
}
.tl-album {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 9px;
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  color: var(--text-2);
  font-size: var(--fs-2xs);
  transition:
    color var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease);
}
.tl-album:hover {
  color: var(--accent-ink);
  border-color: var(--accent-soft-2);
}
.tl-album .num {
  color: var(--text-3);
}

/* ---------- 照片墙 ---------- */
.photo-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
}
@media (min-width: 640px) {
  .photo-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (min-width: 960px) {
  .photo-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
@media (min-width: 1600px) {
  .photo-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}
.photo {
  position: relative;
  padding: 0;
  border: var(--card-bd-w) solid var(--line);
  border-radius: var(--radius-xs);
  background: none;
  overflow: hidden;
  cursor: zoom-in;
  aspect-ratio: 1 / 1;
}
.photo :deep(.lazy-image) {
  height: 100%;
}
.photo:hover :deep(.img) {
  transform: scale(1.05);
}
.photo-index {
  position: absolute;
  top: 6px;
  left: 6px;
  padding: 1px 6px;
  background: rgba(250, 249, 246, 0.86);
  color: #16283d;
  font-size: 0.6rem;
  letter-spacing: 1px;
}
.photo-cap {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20px 9px 7px;
  background: linear-gradient(transparent, rgba(8, 15, 30, 0.72));
  color: #fff;
  font-size: var(--fs-2xs);
  line-height: 1.45;
  text-align: left;
  pointer-events: none;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ---------- 移动端 ---------- */
@media (max-width: 640px) {
  .tl-item {
    padding-left: 22px;
    padding-bottom: var(--space-6);
  }
  .tl-item::before {
    left: 4px;
  }
  .tl-dot {
    width: 9px;
    height: 9px;
    box-shadow: 0 0 0 2px var(--accent-soft);
  }
  .tl-albums {
    margin-left: 0;
    width: 100%;
  }
}

/* ---------- 风格差异 ---------- */
[data-style='annual'] .tl-title {
  font-family: var(--font-serif);
  font-weight: 600;
}
[data-style='annual'] .photo {
  border-radius: 0;
}
[data-style='annual'] .photo-index {
  font-family: var(--font-serif);
}
[data-style='japandi'] .photo {
  border: none;
  border-radius: 14px;
}
[data-style='japandi'] .tl-dot {
  box-shadow: 0 0 0 3px var(--accent-soft);
}
[data-style='japandi'] .tl-album {
  border-color: transparent;
  background: var(--bg-soft);
}
[data-style='brutal'] .photo {
  border-width: 3px;
  border-color: var(--line);
  border-radius: 0;
}
[data-style='brutal'] .photo-index {
  border-radius: 0;
  background: var(--accent);
  color: #111;
  font-weight: 900;
}
[data-style='brutal'] .tl-album {
  border-width: 2px;
  border-color: var(--line);
  border-radius: 0;
  color: var(--text);
  font-weight: 700;
}
[data-style='brutal'] .filter-bar {
  border-width: 3px;
}
</style>
