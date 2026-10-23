<script setup lang="ts">
import CheckInButton from '@/components/common/CheckInButton.vue'
import { useContentStore } from '@/store/content'

const content = useContentStore()
const year = new Date().getFullYear()
</script>

<template>
  <footer class="site-footer">
    <div class="container footer-inner">
      <div class="footer-brand">
        <strong>{{ content.classInfo.fullName }}</strong>
        <p>{{ content.classInfo.slogan }}</p>
      </div>
      <nav class="footer-links" aria-label="页脚导航">
        <RouterLink to="/albums">相册</RouterLink>
        <RouterLink to="/videos">视频</RouterLink>
        <RouterLink to="/articles">文章</RouterLink>
        <RouterLink to="/about">关于班级</RouterLink>
        <RouterLink to="/settings">设置</RouterLink>
      </nav>
      <!-- 打卡是"动作"，放在版权行之前：读者视线按 链接 → 互动 → 法务 的顺序走 -->
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
      </p>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  position: relative;
  z-index: 1;
  border-top: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg) 60%, transparent);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  padding: var(--space-10) 0 var(--space-8);
  color: var(--text-3);
  font-size: 0.85rem;
}

/* 移动端：页脚在 <main> 之外，拿不到 .main-content 为底部导航预留的那段 padding，
   必须自己补一份，否则最下面的「今日打卡」会被固定底栏压住（实测压住 37px）。 */
@media (max-width: 767px) {
  .site-footer {
    padding-bottom: calc(var(--space-8) + var(--bottom-nav-h) + env(safe-area-inset-bottom, 0px));
  }
}
.site-footer::before {
  content: '';
  position: absolute;
  top: -1px;
  left: 50%;
  transform: translateX(-50%);
  width: min(420px, 70%);
  height: 1px;
  background: var(--primary-gradient);
  opacity: 0.6;
}
.footer-inner {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  align-items: center;
  text-align: center;
}
.footer-brand strong {
  font-family: var(--font-display);
  font-size: 1.05rem;
  letter-spacing: 0.5px;
  color: var(--text);
}
.footer-brand p {
  margin-top: 4px;
}
.footer-links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  justify-content: center;
}
.footer-links a {
  color: var(--text-2);
  padding: 6px 16px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border);
  font-weight: 600;
  transition: all var(--duration) var(--ease-spring);
}
.footer-links a:hover {
  color: var(--primary);
  border-color: var(--primary-soft-2);
  background: var(--primary-soft);
  transform: translateY(-2px);
}

/* 访问地址：主链接用主色，备用链接降到次级，一眼看出优先级 */
.footer-access {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 0.82rem;
}
.footer-access a {
  font-weight: 600;
  word-break: break-all;
}
.footer-access-main {
  color: var(--primary);
}
.footer-access-backup {
  color: var(--text-3);
}
.footer-access-backup:hover {
  color: var(--text-2);
}
.footer-access-sep {
  color: var(--border-strong);
}
.footer-hint {
  max-width: 60ch;
  font-size: 0.75rem;
  line-height: 1.6;
  color: var(--text-3);
}
</style>
