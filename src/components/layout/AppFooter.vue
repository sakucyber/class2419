<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import CheckInButton from '@/components/common/CheckInButton.vue'
import { STYLE_LABEL } from '@/config/styles'
import { useContentStore } from '@/store/content'
import { useSettingsStore } from '@/store/settings'

const content = useContentStore()
const settings = useSettingsStore()
const year = new Date().getFullYear()
</script>

<template>
  <footer class="site-footer">
    <div class="container footer-inner">
      <div class="footer-brand">
        <span class="footer-mark" aria-hidden="true">19</span>
        <div>
          <strong>{{ content.classInfo.fullName }}</strong>
          <p>{{ content.classInfo.slogan }}</p>
        </div>
      </div>

      <nav class="footer-links" aria-label="页脚导航">
        <RouterLink to="/albums">相册</RouterLink>
        <RouterLink to="/videos">视频</RouterLink>
        <RouterLink to="/articles">文章</RouterLink>
        <RouterLink to="/about">关于班级</RouterLink>
        <RouterLink to="/favorites">我的收藏</RouterLink>
        <RouterLink to="/settings">设置</RouterLink>
      </nav>

      <CheckInButton />

      <!-- 访问地址：永久链接在前、备用链接弱化；两条都是真链接，手机上可直接点 -->
      <div class="footer-access">
        <a
          class="footer-access-main"
          href="https://class2419.pages.dev/"
          target="_blank"
          rel="noopener noreferrer"
        >
          class2419.pages.dev
        </a>
        <span class="footer-access-sep" aria-hidden="true">·</span>
        <a
          class="footer-access-backup"
          href="https://class2419.zh.kg/"
          target="_blank"
          rel="noopener noreferrer"
          title="阿里云 CDN 加速链接，可能失效"
        >
          备用 class2419.zh.kg
        </a>
      </div>

      <p class="footer-hint">
        打不开时先切换网络（WiFi ↔ 移动数据）；备用地址可能失效，请优先保存永久地址。
      </p>

      <p class="footer-note">
        © {{ year }} {{ content.classInfo.shortName }} · 纯前端静态站点 · 数据仅保存在本地浏览器
        <span class="footer-style">
          <AppIcon name="palette" :size="12" :stroke-width="1.8" />
          当前风格：{{ STYLE_LABEL[settings.settings.style] }}
        </span>
      </p>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  position: relative;
  z-index: 1;
  margin-top: var(--space-12);
  padding: var(--space-10) 0 var(--space-8);
  border-top: 1px solid var(--line);
  background: var(--surface-2);
  color: var(--text-3);
  font-size: var(--fs-sm);
}
[data-style='brutal'] .site-footer {
  border-top: 3px solid #111;
  background: var(--surface);
}
[data-style='annual'] .site-footer {
  background: transparent;
  border-top: 1px solid var(--line-2);
}
[data-style='legacy'] .site-footer {
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: var(--surface-blur);
  -webkit-backdrop-filter: var(--surface-blur);
}
[data-style='legacy'][data-theme='dark'] .site-footer {
  background: rgba(12, 12, 20, 0.62);
}

/* 校园：页脚是一块深绿板报，顶部压一条木框 */
[data-style='campus'] .site-footer {
  border-top: 10px solid var(--campus-wood);
  background: var(--campus-board);
  color: var(--campus-chalk-soft);
}
[data-style='campus'] .footer-brand strong {
  color: var(--campus-chalk);
  font-family: var(--font-hand);
  font-size: 1.18rem;
  font-weight: 400;
  letter-spacing: 0.5px;
}
[data-style='campus'] .footer-brand p {
  color: var(--campus-chalk-soft);
  font-family: var(--font-hand);
  font-size: var(--fs-sm);
}
[data-style='campus'] .footer-mark {
  width: 40px;
  height: 40px;
  border: 2.5px solid var(--campus-sun);
  border-radius: 50%;
  background: transparent;
  color: var(--campus-sun);
  font-family: var(--font-display);
  font-size: 0.95rem;
}
[data-style='campus'] .footer-links a {
  color: var(--campus-chalk-soft);
  border-radius: 999px;
}
[data-style='campus'] .footer-links a:hover {
  color: var(--campus-sun);
  border-bottom-color: transparent;
}
[data-style='campus'] .footer-access-main {
  color: var(--campus-sun);
}
[data-style='campus'] .footer-access-backup,
[data-style='campus'] .footer-hint,
[data-style='campus'] .footer-note,
[data-style='campus'] .footer-style {
  color: var(--campus-chalk-soft);
}
[data-style='campus'] .footer-access-sep {
  color: rgba(242, 248, 242, 0.4);
}
[data-style='campus'] .footer-style {
  border-left-color: rgba(242, 248, 242, 0.24);
}

/* 移动端：页脚在 <main> 之外，拿不到底部导航预留的 padding，必须自己补一份 */
@media (max-width: 767px) {
  .site-footer {
    padding-bottom: calc(var(--space-8) + var(--bottom-nav-h) + env(safe-area-inset-bottom, 0px));
  }
  /* 校园的底栏是悬浮胶囊，离底边还有 8px */
  [data-style='campus'] .site-footer {
    padding-bottom: calc(
      var(--space-8) + var(--bottom-nav-h) + 16px + env(safe-area-inset-bottom, 0px)
    );
  }
}

.footer-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  text-align: center;
}
.footer-brand {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  text-align: left;
}
.footer-mark {
  flex: none;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line-2);
  color: var(--text-2);
  font-family: var(--font-display);
  font-size: 0.8rem;
  letter-spacing: 0.5px;
}
[data-style='japandi'] .footer-mark {
  border: none;
  border-radius: 50%;
  background: var(--sage);
  color: #fffefb;
}
[data-style='brutal'] .footer-mark {
  border: 3px solid #111;
  background: var(--accent);
  color: #111;
  box-shadow: 2px 2px 0 #111;
  font-weight: 900;
}
[data-style='legacy'] .footer-mark {
  border: none;
  border-radius: 10px;
  background: var(--accent-soft);
  color: var(--accent-ink);
}
.footer-brand strong {
  display: block;
  font-family: var(--font-display);
  font-size: var(--fs-md);
  color: var(--text);
  letter-spacing: 0.5px;
}
.footer-brand p {
  margin-top: 2px;
  font-size: var(--fs-xs);
}

.footer-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-1) var(--space-2);
}
.footer-links a {
  padding: 5px 10px;
  color: var(--text-2);
  font-size: var(--fs-sm);
  border-bottom: 1px solid transparent;
  transition:
    color var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease);
}
.footer-links a:hover {
  color: var(--accent-ink);
  border-bottom-color: var(--accent-ink);
}

.footer-access {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: var(--fs-xs);
}
.footer-access a {
  font-weight: 600;
  word-break: break-all;
}
.footer-access-main {
  color: var(--accent-ink);
}
.footer-access-backup {
  color: var(--text-3);
}
.footer-access-backup:hover {
  color: var(--text-2);
}
.footer-access-sep {
  color: var(--line-2);
}
.footer-hint {
  max-width: 60ch;
  font-size: var(--fs-2xs);
  line-height: 1.7;
}
.footer-note {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px 12px;
  font-size: var(--fs-2xs);
}
.footer-style {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding-left: 12px;
  border-left: 1px solid var(--line);
  color: var(--text-3);
}
@media (max-width: 520px) {
  .footer-style {
    border-left: none;
    padding-left: 0;
  }
}
</style>
