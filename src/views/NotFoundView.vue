<script setup lang="ts">
import { useContentStore } from '@/store/content'

const content = useContentStore()
</script>

<template>
  <div class="container not-found">
    <p class="code" aria-hidden="true">404</p>
    <h1>页面走丢了</h1>
    <p class="desc">你要找的页面可能已被移动或删除。回到首页，继续逛逛2419吧～</p>
    <div class="actions">
      <RouterLink to="/" class="btn">回到首页</RouterLink>
      <RouterLink to="/albums" class="btn btn--ghost">去相册</RouterLink>
      <RouterLink to="/articles" class="btn btn--soft">读文章</RouterLink>
    </div>
    <p class="hint">
      当前共 {{ content.publicAlbums.length }} 个相册 · {{ content.publicVideos.length }} 个视频 ·
      {{ content.publicArticles.length }} 篇文章
    </p>
  </div>
</template>

<style scoped>
.not-found {
  padding: var(--space-16) var(--space-4);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}
.code {
  font-size: clamp(4rem, 15vw, 7rem);
  font-weight: 900;
  line-height: 1;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  opacity: 0.9;
}
h1 {
  font-size: 1.5rem;
}
.desc {
  color: var(--text-2);
  max-width: 360px;
}
.actions {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  justify-content: center;
  margin-top: var(--space-3);
}
.hint {
  margin-top: var(--space-4);
  color: var(--text-3);
  font-size: 0.82rem;
}
</style>
