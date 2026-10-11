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
        <p>{{ content.classInfo.motto }} · {{ content.classInfo.slogan }}</p>
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
  border-top: 1px solid var(--border);
  background: var(--card);
  padding: var(--space-8) 0;
  color: var(--text-3);
  font-size: 0.85rem;
}
.footer-inner {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  align-items: center;
  text-align: center;
}
.footer-brand strong {
  color: var(--text-2);
}
.footer-brand p {
  margin-top: 4px;
}
.footer-links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  justify-content: center;
}
.footer-links a {
  color: var(--text-2);
}
.footer-links a:hover {
  color: var(--primary);
}
</style>
