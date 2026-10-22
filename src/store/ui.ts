/**
 * 全局 UI 状态：抽屉（更多菜单）与全站搜索面板。
 * 两者互斥，任一展开时统一锁定页面滚动，避免各处重复操作 body。
 */
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

import { lockBodyScroll, unlockBodyScroll } from '@/utils/overlay'

export const useUiStore = defineStore('ui', () => {
  /** 右侧抽屉（更多菜单）是否展开 */
  const drawerOpen = ref(false)
  /** 全站搜索面板是否展开 */
  const searchOpen = ref(false)

  // 引用计数滚动锁：与灯箱/弹窗叠加时互不干扰（详见 utils/overlay.ts）
  let scrollLocked = false
  watch([drawerOpen, searchOpen], ([drawer, search]) => {
    const shouldLock = drawer || search
    if (shouldLock && !scrollLocked) {
      lockBodyScroll()
      scrollLocked = true
    } else if (!shouldLock && scrollLocked) {
      unlockBodyScroll()
      scrollLocked = false
    }
  })

  function closeDrawer() {
    drawerOpen.value = false
  }

  function openDrawer() {
    searchOpen.value = false
    drawerOpen.value = true
  }

  function toggleDrawer() {
    if (drawerOpen.value) closeDrawer()
    else openDrawer()
  }

  function closeSearch() {
    searchOpen.value = false
  }

  function openSearch() {
    drawerOpen.value = false
    searchOpen.value = true
  }

  return { drawerOpen, searchOpen, closeDrawer, openDrawer, toggleDrawer, closeSearch, openSearch }
})
