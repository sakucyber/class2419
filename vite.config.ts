import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig, type Plugin } from 'vite'

/**
 * 按需生成 dist/404.html（index.html 的副本）。
 *
 * 注意这是**平台相关**的：
 * - GitHub Pages / 部分平台：没有 404.html 就没有 SPA 回退，直接访问 /about 会 404
 * - Cloudflare Pages：**恰好相反**。产物里存在 404.html 会关掉它自带的 SPA 模式
 *   （未命中路径改回真正的 HTTP 404）；把它删掉，Pages 会自动对所有未命中路径
 *   返回 200 + index.html
 *
 * 因此默认**不生成**（适配 Cloudflare Pages），需要时用 VITE_SPA_404=1 打开。
 * 阿里云 ESA 不依赖此文件，它读 esa.jsonc 的 assets.notFoundStrategy。
 */
function spaFallbackPlugin(): Plugin {
  return {
    name: 'spa-fallback-404',
    apply: 'build',
    closeBundle() {
      if (process.env.VITE_SPA_404 !== '1') return
      const dist = fileURLToPath(new URL('./dist', import.meta.url))
      const index = path.join(dist, 'index.html')
      if (fs.existsSync(index)) fs.copyFileSync(index, path.join(dist, '404.html'))
    },
  }
}

/** 仅生产构建注入 CSP（开发模式 Vite/HMR 需要内联脚本，不加限制） */
function cspPlugin(): Plugin {
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    'img-src \'self\' data: blob: https:',
    'media-src \'self\' data: blob: https:',
    'font-src \'self\' data:',
    'connect-src \'self\' ws: wss: https:',
    'frame-src https://player.bilibili.com https://www.youtube.com https://www.youtube-nocookie.com',
  ].join('; ')
  return {
    name: 'inject-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return html.replace(
          '</head>',
          `  <meta http-equiv="Content-Security-Policy" content="${csp}" />\n  </head>`,
        )
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // 部署到 GitHub Pages 子路径时设置环境变量 VITE_BASE=/仓库名/
  base: process.env.VITE_BASE || '/',
  plugins: [vue(), cspPlugin(), spaFallbackPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // 监听 0.0.0.0，局域网内其它设备（手机 / 平板）可直接访问
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 4173,
    strictPort: true,
  },
  build: {
    /*
     * target 定为 es2015 而不是 es2020 —— 这是浏览器兼容方案的一部分。
     *
     * 原因：产物里原本含 57 处可选链、14 处空值合并（es2020 语法），Chrome 79 及以下
     * 会在**解析阶段**直接失败，整包不执行 → 白屏。而这类"有 Proxy 但语法太旧"的浏览器
     * 恰好落在简化模式要覆盖的区间（Chrome 49~79 / Safari 10~13）。
     * 不接受 @vitejs/plugin-legacy 的原因：它**无法 polyfill Proxy**（Vue 3 硬依赖），
     * 对更老的浏览器依然无解，却要付出双份产物 + polyfill 的体积。
     * 实测降到 es2015 的代价只有约 +1.3 KB gzip（首屏 69.1 → 70.4），可以忽略。
     */
    target: 'es2015',
    /* CSS 目标与简化模式的门槛（Chrome 84）对齐：
       否则 esbuild 会保留 inset: 这类 Chrome 87+ 才支持的简写，
       而 84~86 的设备正好在简化模式区间里，会拿不到位移定位。 */
    cssTarget: 'chrome84',
    sourcemap: false,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined

          // ⚠️ three 及其周边必须排除在手动分包之外，交给 Rollup 按动态 import 自动切分。
          // 否则会被下面的 catch-all 归进 vue-vendor，而 vue-vendor 是首屏同步加载的 chunk，
          // 3D 代码就会阻塞 LCP。用路径片段匹配（[\\/]three[\\/]）而不是裸的 'three'，
          // 避免误伤名字里含 three 的无关包。
          if (/[\\/]node_modules[\\/]three[\\/]/.test(id)) return undefined

          if (id.includes('vue-router') || id.includes('pinia')) return 'vue-router-pinia'
          if (id.includes('marked') || id.includes('dompurify')) return 'markdown'
          return 'vue-vendor'
        },
      },
    },
  },
})
