<script setup lang="ts">
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
</style>
