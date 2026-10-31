<script setup lang="ts">
/**
 * 「有新版本」提示条。
 *
 * 位置：右下角浮层（移动端底部居中，避开底部导航）。
 * 出现条件：Service Worker 报告有新版待接管（见 utils/swUpdate.ts）。
 * 行为：
 *   - 「立即更新」→ 交给 SW 接管 → 页面自动 reload；
 *   - 「稍后」→ 本次会话内不再提示（内存变量，不落盘）——
 *     用户正在读东西时不该被反复打断，但也不能永久屏蔽，否则永远看不到更新。
 */
import { computed, ref } from 'vue'

import AppIcon from '@/components/common/AppIcon.vue'
import { applyUpdate, updateState } from '@/utils/swUpdate'

const dismissed = ref(false)

const visible = computed(() => updateState.available && !dismissed.value)

function later(): void {
  dismissed.value = true
}
</script>

<template>
  <Teleport to="body">
    <Transition name="upd">
      <div v-if="visible" class="upd" role="status" aria-live="polite">
        <span class="icon" aria-hidden="true">
          <AppIcon name="sparkles" :size="18" :stroke-width="2" />
        </span>
        <div class="body">
          <strong class="title">网站有新版本</strong>
          <span class="desc">刷新后即可看到最新内容</span>
        </div>
        <div class="actions">
          <button type="button" class="upd-btn ghost" @click="later">稍后</button>
          <button type="button" class="upd-btn solid" @click="applyUpdate">立即更新</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.upd {
  position: fixed;
  right: clamp(16px, 3vw, 32px);
  bottom: clamp(16px, 3vw, 32px);
  z-index: var(--z-overlay);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  max-width: min(420px, calc(100vw - 32px));
  padding: var(--space-3) var(--space-3) var(--space-3) var(--space-4);
  border: var(--card-bd-w) solid var(--line);
  border-radius: var(--card-radius);
  background: var(--surface);
  box-shadow: var(--shadow-3);
}
.icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: var(--radius-xs);
  background: var(--accent-soft);
  color: var(--accent-ink);
}
.body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.title {
  font-size: var(--fs-sm);
  font-weight: 600;
  line-height: 1.3;
}
.desc {
  color: var(--text-3);
  font-size: var(--fs-xs);
  line-height: 1.4;
}
.actions {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.upd-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-xs);
  font-size: var(--fs-xs);
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  /* 刻意不复用全局 .btn —— 那套带各风格的厚底阴影（如校园风的黄色 5px 硬边），
     贴在小提示条上会显得笨重。这里自己声明完整的一套。 */
  box-shadow: none;
  transition:
    transform var(--dur) var(--ease),
    background var(--dur) var(--ease),
    border-color var(--dur) var(--ease);
}
.upd-btn.ghost {
  border: var(--card-bd-w) solid var(--line);
  background: transparent;
  color: var(--text-2);
}
.upd-btn.ghost:hover {
  background: var(--surface-2);
  color: var(--text);
}
.upd-btn.solid {
  border: var(--card-bd-w) solid transparent;
  background: var(--accent);
  color: var(--accent-contrast);
}
.upd-btn.solid:hover {
  transform: translateY(-1px);
}

/* 粗指针：把点击目标抬到指尖舒适区 */
@media (pointer: coarse) {
  .upd-btn {
    min-height: 40px;
  }
}

/* 移动端：改为底部居中的一条，避开底部导航 */
@media (max-width: 767px) {
  .upd {
    right: var(--space-3);
    left: var(--space-3);
    bottom: calc(var(--bottom-nav-h) + 16px + env(safe-area-inset-bottom, 0px));
    max-width: none;
  }
  .desc {
    display: none;
  }
}

/* 年鉴：黑底白字的印刷感 */
[data-style='annual'] .upd {
  background: var(--text);
  border-color: var(--text);
}
[data-style='annual'] .upd .title,
[data-style='annual'] .upd .desc {
  color: var(--bg);
}
[data-style='annual'] .upd .icon {
  background: rgba(255, 255, 255, 0.16);
  color: var(--bg);
}
[data-style='annual'] .upd .upd-btn.ghost {
  border-color: rgba(255, 255, 255, 0.35);
  color: var(--bg);
}
[data-style='annual'] .upd .upd-btn.ghost:hover {
  background: rgba(255, 255, 255, 0.12);
}
[data-style='annual'] .upd .upd-btn.solid {
  background: var(--bg);
  color: var(--text);
}

/* Japandi：哑光鼠尾草绿。
   浅鼠尾草 #9caf88 配白字只有 2.34:1（远低于 4.5:1），配深墨 #241a14 是 7.22:1，
   所以按钮用深墨字 —— 也更贴合 Japandi 的哑光纸感。 */
[data-style='japandi'] .upd {
  border-radius: var(--radius-lg);
  background: var(--surface);
}
[data-style='japandi'] .upd .icon {
  background: var(--sage);
  color: #241a14;
}
[data-style='japandi'] .upd .upd-btn.solid {
  background: var(--sage);
  color: #241a14;
}
[data-style='japandi'] .upd .upd-btn.solid:hover {
  background: #8ba274;
}

/* 硬边：3px 黑边 + 硬投影 */
[data-style='brutal'] .upd {
  border: 3px solid #111;
  border-radius: 0;
  box-shadow: 6px 6px 0 #111;
}
[data-style='brutal'] .upd .icon {
  background: var(--accent);
  color: #111;
}
[data-style='brutal'] .upd .upd-btn {
  border-radius: 0;
}
[data-style='brutal'] .upd .upd-btn.ghost {
  border: 2px solid #111;
}
[data-style='brutal'] .upd .upd-btn.solid {
  background: var(--accent);
  color: #111;
  border: 2px solid #111;
}

/* 原版：玻璃拟态 */
[data-style='legacy'] .upd {
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: var(--surface);
  backdrop-filter: blur(20px);
  box-shadow: 0 18px 48px var(--glow);
}
[data-style='legacy'] .upd .upd-btn.solid {
  background: var(--accent-gradient);
  color: #fff;
}

.upd-enter-active {
  transition:
    opacity var(--dur) var(--ease),
    transform var(--dur) var(--ease);
}
.upd-leave-active {
  transition:
    opacity 160ms var(--ease),
    transform 160ms var(--ease);
}
.upd-enter-from,
.upd-leave-to {
  opacity: 0;
  transform: translateY(16px);
}
</style>
