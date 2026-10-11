/**
 * 全局 UI 状态：抽屉（更多菜单）与全站搜索面板。
 * 两者互斥，任一展开时统一锁定页面滚动，避免各处重复操作 body。
 */
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useUiStore = defineStore('ui', () => {
  /** 右侧抽屉（更多菜单）是否展开 */
  const drawerOpen = ref(false)
  /** 全站搜索面板是否展开 */
  const searchOpen = ref(false)

  watch([drawerOpen, searchOpen], ([drawer, search]) => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = drawer || search ? 'hidden' : ''
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
