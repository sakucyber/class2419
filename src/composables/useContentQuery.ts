/**
 * 列表页的筛选 / 排序 / 分页公共逻辑。
 *
 * 改写的起因：相册、视频、文章三个列表页各自写了一份几乎相同的 keyword/category/
 * shown 计算属性（约 40 行 × 3），改一处筛选规则要同步改三处。抽出来之后，
 * 视图只剩「声明字段 + 排版」，筛选行为天然一致。
 */
import { computed, ref } from 'vue'

import { debounce } from '@/utils/format'

export type SortOrder = 'newest' | 'oldest'

interface QueryOptions<T> {
  /** 数据源访问器（传 computed 的取值函数，保持响应式） */
  items: () => T[]
  /** 参与关键词匹配的字段 */
  searchFields: (item: T) => string[]
  categoryOf: (item: T) => string
  tagsOf: (item: T) => string[]
  dateOf: (item: T) => string
  pageSize: number
  /** 是否提供「最新/最早」排序 */
  sortable?: boolean
  /** 是否提供标签筛选 */
  withTag?: boolean
}

export function useContentQuery<T>(options: QueryOptions<T>) {
  const { items, pageSize, sortable = false, withTag = false } = options

  const keyword = ref('')
  const category = ref('全部')
  const activeTag = ref('')
  const sort = ref<SortOrder>('newest')
  const shown = ref(pageSize)

  const categories = computed(() => {
    const list = items().map(options.categoryOf)
    return ['全部', ...Array.from(new Set(list))]
  })

  const filtered = computed(() => {
    const kw = keyword.value.trim().toLowerCase()
    const list = items().filter((item) => {
      const okCategory = category.value === '全部' || options.categoryOf(item) === category.value
      const okTag = !withTag || !activeTag.value || options.tagsOf(item).includes(activeTag.value)
      const okKeyword =
        !kw || options.searchFields(item).some((field) => field.toLowerCase().includes(kw))
      return okCategory && okTag && okKeyword
    })
    if (!sortable) return list
    // 日期是 ISO 字符串，可直接比较；「最早优先」反转方向即可
    const asc = sort.value === 'oldest'
    return [...list].sort((a, b) => {
      const [left, right] = [options.dateOf(a), options.dateOf(b)]
      return asc ? (left > right ? 1 : -1) : left < right ? 1 : -1
    })
  })

  const visible = computed(() => filtered.value.slice(0, shown.value))
  const hasMore = computed(() => shown.value < filtered.value.length)
  const remaining = computed(() => Math.max(0, filtered.value.length - shown.value))
  const isEmpty = computed(() => filtered.value.length === 0)

  function loadMore() {
    shown.value += pageSize
  }

  function setCategory(next: string) {
    category.value = next
    activeTag.value = ''
    shown.value = pageSize
  }

  function reset() {
    keyword.value = ''
    category.value = '全部'
    activeTag.value = ''
    sort.value = 'newest'
    shown.value = pageSize
  }

  const onSearch = debounce(() => {
    shown.value = pageSize
  }, 200)

  return {
    keyword,
    category,
    activeTag,
    sort,
    shown,
    categories,
    filtered,
    visible,
    hasMore,
    remaining,
    isEmpty,
    loadMore,
    setCategory,
    reset,
    onSearch,
    pageSize,
  }
}
