<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { useContentStore } from '@/store/content'

const content = useContentStore()
</script>

<template>
  <div class="container not-found">
    <p class="code num" aria-hidden="true">404</p>
    <p class="kicker">Page not found</p>
    <h1>页面走丢了</h1>
    <p class="desc">你要找的页面可能已被移动或删除。回到首页，继续逛逛2419吧。</p>
    <div class="actions">
      <RouterLink to="/" class="btn">
        回到首页
        <AppIcon name="arrowRight" :size="15" :stroke-width="2" />
      </RouterLink>
      <RouterLink to="/albums" class="btn btn--ghost">去相册</RouterLink>
      <RouterLink to="/articles" class="btn btn--ghost">读文章</RouterLink>
    </div>
    <p class="hint num">
      当前共 {{ content.publicAlbums.length }} 个相册 · {{ content.publicVideos.length }} 个视频 ·
      {{ content.publicArticles.length }} 篇文章
    </p>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-16) var(--space-4);
  text-align: center;
}
.code {
  font-family: var(--font-display);
  font-size: clamp(4.5rem, 16vw, 8rem);
  font-weight: 900;
  line-height: 0.9;
  letter-spacing: -0.04em;
  color: var(--text);
  opacity: 0.12;
}
h1 {
  font-size: 1.6rem;
}
.desc {
  max-width: 380px;
  color: var(--text-2);
}
.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-3);
  margin-top: var(--space-3);
}
.hint {
  margin-top: var(--space-4);
  color: var(--text-3);
  font-size: var(--fs-2xs);
}
[data-style='japandi'] .code {
  color: var(--sage);
  opacity: 0.5;
}
[data-style='brutal'] .code {
  opacity: 1;
  color: var(--accent-ink);
  -webkit-text-stroke: 3px #111;
}
</style>
