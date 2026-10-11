/** 路由与菜单配置化：新增页面只需在此登记 */
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

export interface NavItem {
  path: string
  title: string
  icon: string
  /** 是否出现在移动端底部导航 */
  inBottomNav?: boolean
  /** 特殊行为：不跳转，而是打开右侧抽屉菜单（此时 path 仅作占位） */
  action?: 'drawer'
}

/** 桌面端主导航 */
export const mainNav: NavItem[] = [
  { path: '/', title: '首页', icon: '🏠' },
  { path: '/albums', title: '相册', icon: '🖼️' },
  { path: '/videos', title: '视频', icon: '🎬' },
  { path: '/articles', title: '文章', icon: '📝' },
  { path: '/about', title: '关于班级', icon: '🏫' },
]

/** 移动端底部导航 */
export const bottomNav: NavItem[] = [
  { path: '/', title: '首页', icon: '🏠', inBottomNav: true },
  { path: '/albums', title: '相册', icon: '🖼️', inBottomNav: true },
  { path: '/videos', title: '视频', icon: '🎬', inBottomNav: true },
  { path: '/articles', title: '文章', icon: '📝', inBottomNav: true },
  { path: '#more', title: '更多', icon: '☰', inBottomNav: true, action: 'drawer' },
]

/** 抽屉「更多」分组 */
export const moreNav: NavItem[] = [
  { path: '/admin', title: '投稿 / 管理', icon: '✏️' },
  { path: '/settings', title: '设置', icon: '⚙️' },
]

const SITE_NAME = '新屋岭中学2419班'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: '首页', nav: '/' },
  },
  {
    path: '/albums',
    name: 'albums',
    component: () => import('@/views/AlbumsView.vue'),
    meta: { title: '相册', nav: '/albums' },
  },
  {
    path: '/albums/:id',
    name: 'album-detail',
    component: () => import('@/views/AlbumDetailView.vue'),
    meta: { title: '相册详情' },
  },
  {
    path: '/videos',
    name: 'videos',
    component: () => import('@/views/VideosView.vue'),
    meta: { title: '视频', nav: '/videos' },
  },
  {
    path: '/videos/:id',
    name: 'video-detail',
    component: () => import('@/views/VideoDetailView.vue'),
    meta: { title: '视频详情' },
  },
  {
    path: '/articles',
    name: 'articles',
    component: () => import('@/views/ArticlesView.vue'),
    meta: { title: '文章', nav: '/articles' },
  },
  {
    path: '/articles/:id',
    name: 'article-detail',
    component: () => import('@/views/ArticleDetailView.vue'),
    meta: { title: '文章详情' },
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/views/AboutView.vue'),
    meta: { title: '关于班级', nav: '/about' },
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('@/views/SearchView.vue'),
    meta: { title: '搜索' },
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('@/views/AdminView.vue'),
    meta: { title: '投稿 / 管理' },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { title: '设置' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: '页面走丢了' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, _from, saved) {
    if (saved) return saved
    if (to.hash) return { el: to.hash, top: 72 }
    return { top: 0 }
  },
})

router.afterEach((to) => {
  const title = (to.meta.title as string) || ''
  document.title = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} · 班级空间`
})

export default router
