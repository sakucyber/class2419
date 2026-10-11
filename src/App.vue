<script setup lang="ts">
import { onMounted } from 'vue'

import AmbientBackground from '@/components/common/AmbientBackground.vue'
import BackToTop from '@/components/common/BackToTop.vue'
import ScrollProgress from '@/components/common/ScrollProgress.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import MobileNav from '@/components/layout/MobileNav.vue'
import { useContentStore } from '@/store/content'

const content = useContentStore()
onMounted(() => {
  content.init()
})
</script>

<template>
  <a class="skip-link" href="#main">跳到主要内容</a>
  <AmbientBackground />
  <ScrollProgress />
  <AppHeader />
  <main id="main" class="main-content">
    <router-view v-slot="{ Component }">
      <transition name="page" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </main>
  <AppFooter />
  <MobileNav />
  <BackToTop />
</template>
