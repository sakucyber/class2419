<script setup lang="ts">
/**
 * 首次访问的 PWA 安装引导（底部抽屉）。
 *
 * 出现条件（全部满足才弹）：
 *   1. 移动端          2. 支持安装（原生事件或 iOS 手动路径）
 *   3. 未安装          4. 未被「以后都不弹出」永久屏蔽
 *   5. 本次会话没点过「以后再说」
 *   6. 距挂载已过 10 秒
 *
 * 两个退出选项的语义不同（这是需求的核心）：
 *   - 「以后再说」只作用于**本次会话**（内存 ref，不落盘）
 *   - 「以后都不弹出」写 localStorage（键 `pwa`），永久生效
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'

import AppIcon from '@/components/common/AppIcon.vue'
import InstallGuide from '@/components/common/InstallGuide.vue'
import { canInstall, isMobileDevice, promptInstall, pwaState } from '@/utils/pwa'
import { getJSON, setJSON } from '@/utils/storage'

const DELAY_MS = 10_000

const visible = ref(false)
const guideOpen = ref(false)
const guideVariant = ref<'ios' | 'other'>('ios')
/** 本次会话已选择「以后再说」——刻意不落盘 */
let sessionDismissed = false
let timer = 0

interface PwaPrefs {
  dismissed?: boolean
}

function permanentlyDismissed(): boolean {
  return getJSON<PwaPrefs>('pwa', {}).dismissed === true
}

function installable(): boolean {
  // iOS 没有 beforeinstallprompt，但永远存在手动路径，所以算"可安装"
  return pwaState.canPrompt || canInstall()
}

function maybeShow(): void {
  if (sessionDismissed) return
  if (pwaState.installed) return
  if (permanentlyDismissed()) return
  if (!isMobileDevice()) return
  if (!installable()) return
  visible.value = true
}

onMounted(() => {
  // 先在挂载时就排掉明显不该弹的情况，避免白等 10 秒。
  // 注意不能在这一步就要求 canInstall() —— Android 的 beforeinstallprompt
  // 常常晚于挂载才派发，那样会把这个会话永久跳过。
  if (pwaState.installed || permanentlyDismissed() || !isMobileDevice()) return
  timer = window.setTimeout(maybeShow, DELAY_MS)
})

onBeforeUnmount(() => window.clearTimeout(timer))

function later(): void {
  sessionDismissed = true
  visible.value = false
}

function never(): void {
  setJSON('pwa', { dismissed: true } satisfies PwaPrefs)
  sessionDismissed = true
  visible.value = false
}

async function install(): Promise<void> {
  const result = await promptInstall()
  visible.value = false
  if (result === 'manual-ios') {
    guideVariant.value = 'ios'
    guideOpen.value = true
  } else if (result === 'manual-other') {
    guideVariant.value = 'other'
    guideOpen.value = true
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div
        v-if="visible"
        class="sheet-layer"
        role="dialog"
        aria-modal="false"
        aria-labelledby="sheet-title"
        @click.self="later"
      >
        <div class="sheet">
          <div class="sheet-head">
            <span class="sheet-icon" aria-hidden="true">
              <AppIcon name="download" :size="18" :stroke-width="2" />
            </span>
            <div>
              <h2 id="sheet-title" class="sheet-title">把班级空间装到桌面</h2>
              <p class="sheet-desc">全屏打开、离线也能翻相册，像 App 一样顺手。</p>
            </div>
          </div>

          <button class="sheet-primary" type="button" @click="install">
            <AppIcon name="plus" :size="16" :stroke-width="2.4" />
            添加到主屏幕
          </button>

          <div class="sheet-actions">
            <button type="button" class="sheet-link" @click="later">以后再说</button>
            <span class="sheet-sep" aria-hidden="true">·</span>
            <button type="button" class="sheet-link" @click="never">以后都不弹出</button>
          </div>
        </div>
      </div>
    </Transition>

    <InstallGuide
      :open="guideOpen"
      :variant="guideVariant"
      @close="guideOpen = false"
    />
  </Teleport>
</template>

<style scoped>
.sheet-layer {
  position: fixed;
  inset: 0;
  z-index: var(--z-drawer);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0 var(--space-3);
  background: rgba(0, 0, 0, 0.42);
}

.sheet {
  width: 100%;
  max-width: 520px;
  /* 底部安全区：iPhone 的 Home 指示条不会压住按钮 */
  padding: var(--space-5) var(--space-5) max(var(--space-4), env(safe-area-inset-bottom));
  border: 1px solid var(--border);
  border-bottom: none;
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  background: var(--bg);
  box-shadow: var(--shadow-3);
}

.sheet-head {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.sheet-icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: var(--radius-sm);
  background: var(--primary-soft);
  color: var(--primary);
}
.sheet-title {
  margin: 0 0 4px;
  font-size: 1rem;
}
.sheet-desc {
  margin: 0;
  font-size: 0.84rem;
  line-height: 1.6;
  color: var(--text-3);
}

.sheet-primary {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 18px;
  border: none;
  border-radius: var(--radius-full);
  background: var(--primary);
  color: var(--primary-contrast);
  font-size: 0.94rem;
  font-weight: 700;
  cursor: pointer;
  transition: background var(--duration) var(--ease);
}
.sheet-primary:hover {
  background: var(--primary-hover);
}
.sheet-primary:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 3px;
}

.sheet-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: var(--space-3);
}
.sheet-link {
  padding: 6px 4px;
  border: none;
  background: none;
  color: var(--text-3);
  font-size: 0.8rem;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.sheet-link:hover {
  color: var(--text-2);
}
.sheet-link:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  border-radius: 4px;
}
.sheet-sep {
  color: var(--border-strong);
}

/* 滑入 */
.sheet-enter-active {
  transition: opacity 240ms var(--ease);
}
.sheet-leave-active {
  transition: opacity 180ms var(--ease);
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
.sheet-enter-active .sheet {
  animation: sheet-up 380ms var(--ease-out-expo) both;
}
@keyframes sheet-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
</style>
