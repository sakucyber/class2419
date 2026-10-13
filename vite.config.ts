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
    target: 'es2020',
    cssTarget: 'chrome87',
    sourcemap: false,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('vue-router') || id.includes('pinia')) return 'vue-router-pinia'
            if (id.includes('marked') || id.includes('dompurify')) return 'markdown'
            return 'vue-vendor'
          }
          return undefined
        },
      },
    },
  },
})
