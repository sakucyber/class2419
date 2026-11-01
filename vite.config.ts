import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig, type Plugin, type ResolvedConfig } from 'vite'

/** 产物目录：下面三个构建期插件都要在 closeBundle 里读写 dist */
function resolveOutDir(config: ResolvedConfig): string {
  return path.resolve(config.root, config.build.outDir)
}

/** 部署基路径，统一补上结尾斜杠 */
function normalizeBase(base = process.env.VITE_BASE || '/'): string {
  return base.endsWith('/') ? base : base + '/'
}

/** 往 </head> 前插一段（保持两格缩进，产出与手写一致） */
function injectBeforeHeadEnd(html: string, lines: string[]): string {
  const block = lines.map((line) => `  ${line}`).join('\n')
  return html.replace('</head>', `${block}\n  </head>`)
}

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
  let outDir = ''
  return {
    name: 'spa-fallback-404',
    apply: 'build',
    configResolved(config) {
      outDir = resolveOutDir(config)
    },
    closeBundle() {
      if (process.env.VITE_SPA_404 !== '1') return
      const index = path.join(outDir, 'index.html')
      if (fs.existsSync(index)) fs.copyFileSync(index, path.join(outDir, '404.html'))
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
    "img-src 'self' data: blob: https:",
    "media-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' ws: wss: https:",
    'frame-src https://player.bilibili.com https://www.youtube.com https://www.youtube-nocookie.com',
  ].join('; ')
  return {
    name: 'inject-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return injectBeforeHeadEnd(html, [
          `<meta http-equiv="Content-Security-Policy" content="${csp}" />`,
        ])
      },
    },
  }
}

/**
 * 注入关键资源的 preload 提示。
 *
 * 为什么需要：浏览器的 preload scanner 只看 HTML 里已知的 URL。首屏真正需要的
 * 三样东西里，有两样没法手写进 index.html：
 * - 主 CSS 与字体子集的文件名带内容哈希（`index-XXXX.css`、`campus-display-XXXX.woff2`），
 *   构建前不知道叫什么；
 * - 字体子集是**由 CSS 触发的**（@font-face），浏览器要等 CSS 下载解析完
 *   才知道要这个字体 —— 这一段串行等待就是字体闪烁的来源。
 *
 * 所以在构建后扫描 dist，把真实文件名写回 HTML：
 * - 主 CSS：<link rel="preload" as="style">
 * - 字体子集：<link rel="preload" as="font" type="font/woff2" crossorigin>
 *   （字体必须 crossorigin，否则会因 CORS 不匹配被丢弃，反而多一次请求）
 * - 首屏 hero 图（LCP 元素）：<link rel="preload" as="image">
 *
 * 只 preload 真正在首屏用到的，别把预缓存变成"下载一切"。
 */
function preloadPlugin(): Plugin {
  let outDir = ''
  return {
    name: 'inject-preload',
    apply: 'build',
    configResolved(config) {
      outDir = resolveOutDir(config)
    },
    closeBundle() {
      const dist = outDir
      const indexPath = path.join(dist, 'index.html')
      if (!fs.existsSync(indexPath)) return

      const b = normalizeBase()
      const assetsDir = path.join(dist, 'assets')
      const assets = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir) : []
      const tags: string[] = []

      // 一次遍历挑出两类首屏资源：主 CSS 与字体子集
      for (const name of assets) {
        if (/^index-.*\.css$/.test(name)) {
          tags.push(`<link rel="preload" as="style" href="${b}assets/${name}" />`)
        }
        if (/^campus-display-.*\.woff2$/.test(name)) {
          // 字体必须 crossorigin，否则会因 CORS 不匹配被丢弃，反而多一次请求
          tags.push(
            `<link rel="preload" as="font" type="font/woff2" href="${b}assets/${name}" crossorigin />`,
          )
        }
      }

      // 首屏 hero 图（首页 LCP 元素）
      const hero = 'images/misc/class-card-bg.svg'
      if (fs.existsSync(path.join(dist, hero))) {
        tags.push(`<link rel="preload" as="image" href="${b}${hero}" />`)
      }

      if (!tags.length) return
      const html = fs.readFileSync(indexPath, 'utf8')
      // 只 preload 真正在首屏用到的，别把预缓存变成「下载一切」
      fs.writeFileSync(indexPath, injectBeforeHeadEnd(html, tags), 'utf8')
      console.warn(`[preload] 注入 ${tags.length} 条 preload 提示`)
    },
  }
}

/**
 * 给 Service Worker 注入预缓存清单 & 构建哈希。
 *
 * 为什么必须在构建期做：SW 要缓存 index.html 和所有带哈希的构建产物，清单只能在
 * 构建完成后才知道；public/sw.js 里留了两个占位（__SW_BUILD_ID__ / PRECACHE = []），
 * 这里在 closeBundle 阶段替换成真实值。
 *
 * 缓存名带构建哈希的原因：每次部署换新 cache，activate 时清旧 cache —— 用户不会
 * 拿到「旧 HTML + 新 JS」的错配（这也是原来那版 SW 注释里踩过的坑）。
 */
function pwaPrecachePlugin(): Plugin {
  let outDir = ''
  return {
    name: 'pwa-precache',
    apply: 'build',
    configResolved(config) {
      outDir = resolveOutDir(config)
    },
    closeBundle() {
      const dist = outDir
      const swPath = path.join(dist, 'sw.js')
      const indexPath = path.join(dist, 'index.html')
      if (!fs.existsSync(swPath) || !fs.existsSync(indexPath)) {
        throw new Error('[pwa-precache] 找不到 dist/sw.js 或 dist/index.html，无法注入预缓存清单')
      }

      const b = normalizeBase()
      const urls = new Set<string>()

      // 1) index.html 里引用的入口资源（Vite 已经把 base 写进去了）
      const indexHtml = fs.readFileSync(indexPath, 'utf8')
      for (const match of indexHtml.matchAll(/(?:src|href)="([^"]+)"/g)) {
        const href = match[1]
        if (href.startsWith('/') && !href.startsWith('//')) urls.add(href)
      }

      // 2) 构建产物与图片（递归目录）
      const walk = (dir: string, relPrefix: string): void => {
        const abs = path.join(dist, dir)
        if (!fs.existsSync(abs)) return
        for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
          if (entry.isDirectory()) walk(path.join(dir, entry.name), relPrefix + entry.name + '/')
          else urls.add(b + relPrefix + entry.name)
        }
      }
      walk('assets', 'assets/')
      walk('images', 'images/')

      // 3) 固定文件
      urls.add(b + 'index.html')
      for (const file of [
        'compat.js',
        'probe-es2020.js',
        'theme-init.js',
        'manifest.webmanifest',
        'favicon.svg',
        'icon-192.png',
        'icon-512.png',
        'robots.txt',
      ]) {
        if (fs.existsSync(path.join(dist, file))) urls.add(b + file)
      }

      // 视频不进预缓存（十几 MB × N，且运行时本来就是 bypass）
      const list = [...urls]
        .filter((url) => !/\.(mp4|m4v|webm|mov)$/i.test(url))
        .filter((url) => !url.endsWith('/sw.js'))
        .sort()

      // buildId 必须反映**文件内容**，不能只哈希 URL 列表。
      // `/assets/*` 的文件名本身带内容哈希，改代码会换名；但 `public/images/**`
      // 这类文件名是固定的 —— 只替换同名图片时 URL 列表一模一样，SW 会认为
      // 自己没有更新，缓存名不轮换，用户最长一周（HTTP 缓存）看到旧图。
      // 对每个文件取内容哈希再汇总，换图就会换缓存名（install 时用 cache:'reload' 重取）。
      const stripBase = (url: string) => url.replace(b, '').replace(/^\/+/, '')
      const digest = createHash('sha1')
      for (const url of list) {
        digest.update(url)
        digest.update('\0')
        const file = path.join(dist, stripBase(url))
        if (fs.existsSync(file)) digest.update(fs.readFileSync(file))
        digest.update('\0')
      }
      const buildId = digest.digest('hex').slice(0, 10)

      // 版本清单：离线状态中心用它判断「本地缓存是否落后于线上」。
      // 它由 buildId 派生，不能参与上面的摘要计算（否则每次构建都会自指、缓存名永远在变）。
      const versionFile = path.join(dist, 'version.json')
      fs.writeFileSync(
        versionFile,
        JSON.stringify(
          { buildId, builtAt: new Date().toISOString(), assets: list.length },
          null,
          2,
        ) + '\n',
        'utf8',
      )
      list.push(b + 'version.json')

      let sw = fs.readFileSync(swPath, 'utf8')
      const before = sw
      sw = sw.replace(
        "const CACHE = CACHE_PREFIX + '__SW_BUILD_ID__'",
        `const CACHE = CACHE_PREFIX + '${buildId}'`,
      )
      sw = sw.replace('const PRECACHE = []', `const PRECACHE = ${JSON.stringify(list, null, 2)}`)
      if (sw === before) throw new Error('[pwa-precache] sw.js 里找不到注入占位符')
      fs.writeFileSync(swPath, sw, 'utf8')
      console.warn(`[pwa-precache] 预缓存 ${list.length} 个资源 · cache 后缀 ${buildId}`)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // 部署到 GitHub Pages 子路径时设置环境变量 VITE_BASE=/仓库名/
  base: process.env.VITE_BASE || '/',
  plugins: [vue(), cspPlugin(), spaFallbackPlugin(), preloadPlugin(), pwaPrecachePlugin()],
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
          if (id.includes('vue-router') || id.includes('pinia')) return 'vue-router-pinia'
          if (id.includes('marked') || id.includes('dompurify')) return 'markdown'
          return 'vue-vendor'
        },
      },
    },
  },
})
