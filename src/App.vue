<script setup lang="ts">
import { onMounted } from 'vue'

import AppBackground from '@/components/common/AppBackground.vue'
import AppToast from '@/components/common/AppToast.vue'
import BackToTop from '@/components/common/BackToTop.vue'
import InstallPrompt from '@/components/common/InstallPrompt.vue'
import UpdatePrompt from '@/components/common/UpdatePrompt.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppTicker from '@/components/layout/AppTicker.vue'
import MobileNav from '@/components/layout/MobileNav.vue'
import { useContentStore } from '@/store/content'

const content = useContentStore()
onMounted(() => {
  content.init()
})
</script>

<template>
  <a class="skip-link" href="#main">跳到主要内容</a>
  <AppBackground />
  <AppHeader />
  <AppTicker />
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
  <InstallPrompt />
  <UpdatePrompt />
  <AppToast />
</template>
