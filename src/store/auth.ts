/**
 * 本地模拟登录（仅演示用途）：
 * 密码为前端明文常量，不构成任何真实鉴权，请勿存放敏感信息。
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/** 演示密码：2419 */
export const DEMO_PASSWORD = '2419'
const SESSION_KEY = 'cls2419:session-user'

export const useAuthStore = defineStore('auth', () => {
  const username = ref<string>(sessionStorage.getItem(SESSION_KEY) || '')
  const isLoggedIn = computed(() => !!username.value)

  function login(password: string): boolean {
    if (password !== DEMO_PASSWORD) return false
    username.value = '2419 管理员'
    sessionStorage.setItem(SESSION_KEY, username.value)
    return true
  }

  function logout() {
    username.value = ''
    sessionStorage.removeItem(SESSION_KEY)
  }

  return { username, isLoggedIn, login, logout }
})
