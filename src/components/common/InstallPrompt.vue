<script setup lang="ts">
/**
 * 首次访问的 PWA 安装引导（底部抽屉）。
 *
 * 出现条件（全部满足才弹）：
 *   1. 移动端  2. 支持安装  3. 未安装  4. 未被「以后都不弹出」永久屏蔽
 *   5. 本次会话没点过「以后再说」  6. 距挂载已过 10 秒
 *
 * 两个退出选项的语义不同：
 *   - 「以后再说」只作用于本次会话（内存变量，不落盘）
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
let sessionDismissed = false
let timer = 0

interface PwaPrefs {
  dismissed?: boolean
}

function permanentlyDismissed(): boolean {
  return getJSON<PwaPrefs>('pwa', {}).dismissed === true
}

function installable(): boolean {
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
        class="layer"
        role="dialog"
        aria-modal="false"
        aria-labelledby="sheet-title"
        @click.self="later"
      >
        <div class="sheet">
          <div class="head">
            <span class="icon" aria-hidden="true">
              <AppIcon name="download" :size="18" :stroke-width="2" />
            </span>
            <div>
              <h2 id="sheet-title" class="title">把班级空间装到桌面</h2>
              <p class="desc">全屏打开、离线也能翻相册，像 App 一样顺手。</p>
            </div>
          </div>

          <button class="btn sheet-primary" type="button" @click="install">
            <AppIcon name="plus" :size="16" :stroke-width="2.4" />
            添加到主屏幕
          </button>

          <div class="actions">
            <button type="button" class="link" @click="later">以后再说</button>
            <span class="sep" aria-hidden="true">·</span>
            <button type="button" class="link" @click="never">以后都不弹出</button>
          </div>
        </div>
      </div>
    </Transition>

    <InstallGuide :open="guideOpen" :variant="guideVariant" @close="guideOpen = false" />
  </Teleport>
</template>

<style scoped>
.layer {
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
  padding: var(--space-5) var(--space-5) max(var(--space-4), env(safe-area-inset-bottom));
  border: var(--card-bd-w) solid var(--line);
  border-bottom: none;
  border-radius: var(--card-radius) var(--card-radius) 0 0;
  background: var(--surface);
  box-shadow: var(--shadow-3);
}
.head {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  color: var(--accent-ink);
  background: var(--accent-soft);
  border: 1px solid var(--accent-soft-2);
  border-radius: var(--radius-xs);
}
.title {
  margin-bottom: 4px;
  font-size: var(--fs-md);
}
.desc {
  color: var(--text-3);
  font-size: var(--fs-xs);
  line-height: 1.6;
}
.sheet-primary {
  width: 100%;
}
.actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: var(--space-3);
}
.link {
  padding: 6px 4px;
  border: none;
  background: none;
  color: var(--text-3);
  font-size: var(--fs-xs);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.link:hover {
  color: var(--text-2);
}
.sep {
  color: var(--line-2);
}

.sheet-enter-active {
  transition: opacity 220ms var(--ease);
}
.sheet-leave-active {
  transition: opacity 160ms var(--ease);
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
.sheet-enter-active .sheet {
  animation: sheet-up 360ms var(--ease-out) both;
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
