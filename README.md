# 新屋岭中学 2419 班 · 班级空间

> 一个**无后端依赖**的纯前端班级网站，以相册、视频、文章为核心，记录 2419 班的青春故事。
> 纯静态产物，当前部署在**阿里云 ESA** 与 **Cloudflare Pages**。

![tech](https://img.shields.io/badge/Vue-3.5-blue) ![vite](https://img.shields.io/badge/Vite-6-purple) ![ts](https://img.shields.io/badge/TypeScript-5.7-blue)

---

## ✨ 功能一览

| 模块 | 说明 |
| --- | --- |
| 🏠 首页 | 班级名片（含**分级 3D 徽章**：L2 用 WebGL、L1 用 CSS 2.5D、L0 用静态 SVG）、轮播图、班级公告、毕业倒计时、最新相册 / 视频 / 文章 |
| 🖼️ 相册 | 网格 / 瀑布流布局、分类标签筛选、搜索排序、灯箱预览（键盘/触屏）、懒加载、下载、收藏 |
| 🎬 视频 | 分类筛选、HTML5 播放器 / Bilibili·YouTube 外链、**播放进度记忆**、封面与外链标识；不支持 Range 的托管自动整段预载后换 Blob 源（见下文） |
| 📝 文章 | Markdown 渲染（XSS 消毒）、自动目录、锚点深链、阅读进度条、滚动位置记忆、标签 / 搜索 / 上一篇下一篇 |
| ⭐ 我的收藏 | 详情页收藏后可在抽屉「我的收藏」集中查看、取消收藏（本地持久化） |
| 🏫 关于班级 | 班级介绍、荣誉墙 |
| 🔍 全站搜索 | 搜索相册 / 视频 / 文章 / 标签，顶栏浮层 + 独立搜索页 |
| ⚙️ 设置 | 亮 / 暗 / 跟随系统主题、四种强调色、字号缩放、动效开关、**液态玻璃开关**、**备份导出 / 导入**、一键重置数据 |
| 📱 响应式 | 移动优先；桌面顶部导航 + 移动端底部导航 / 抽屉菜单，支持安全区适配 |
| 🎲 PWA | 生产构建自动注册 Service Worker，**预缓存 app 壳 + 全部构建产物 + 相册图片**，离线可浏览页面与相册（视频体积大，不缓存） |

> **已下线的功能**（不要再加回来）：投稿 / 管理后台、成员墙、点赞、班级时间线。
> 与内容的互动只剩**收藏**与分享；旧后台的表单与本地模拟登录代码已整体删除（需要时从 git 历史取回）。
>
> 时间线下线的具体范围：**关于页的「班级时间线」区块**与**首页指向它的跳转入口**均已删除，
> 相关样式也一并清理。数据链路（`src/data/timeline.json`、`store/content.ts` 的 `content.timeline`、
> `types/index.ts` 的 `TimelineNode`）保留，将来若要恢复，只需把 section 加回 `AboutView`。

## 🛠 技术栈

- **框架**：Vue 3（Composition API + `<script setup>`）+ Vite 6 + TypeScript（strict）
- **路由 / 状态**：Vue Router 4（懒加载 + 配置化菜单）、Pinia
- **Markdown**：marked + DOMPurify（安全渲染，外链自动 `rel="noopener noreferrer"`）
- **持久化**：localStorage（结构化数据 / 收藏 / 进度 / 设置）+ IndexedDB（兼容历史上传的 `idb:` 视频 Blob）
- **样式**：原生 CSS + CSS 变量主题系统（无 UI 框架依赖，体积可控）
- **工程化**：ESLint 9（flat config）+ Prettier、vue-tsc 类型检查、生产构建自检、GitHub Actions CI

## 📁 目录结构

```
class2419/
├── public/
│   ├── images/               # 由脚本生成的 SVG 占位图（可替换为真实照片）
│   ├── _headers              # 安全响应头 + 静态资源缓存策略（Pages/Netlify 系）
│   ├── _redirects            # SPA 回退规则（非 Pages 的静态托管用）
│   ├── manifest.webmanifest  # PWA 清单（start_url/scope 用相对路径，子路径部署也对）
│   ├── robots.txt
│   └── sw.js                 # Service Worker：预缓存清单由构建注入
├── scripts/
│   ├── generate-images.mjs   # 占位图生成脚本
│   └── verify-build.mjs      # 构建产物自检（预缓存/manifest/headers）
├── .github/workflows/ci.yml  # CI：lint + type-check + build + verify:build
├── src/
│   ├── components/
│   │   ├── common/           # 轮播、搜索浮层、懒加载图片、骨架屏、空/错误态、安装引导…
│   │   ├── layout/           # 顶栏、底部导航、页脚
│   │   └── media/            # 内容卡片、灯箱、收藏/分享操作
│   ├── data/                 # 种子数据（JSON + Markdown 文章）
│   │   └── articles/*.md     # 带 frontmatter 的文章源文件
│   ├── router/index.ts       # 路由 + 导航配置（新增页面在此登记，含锚点深链处理）
│   ├── store/                # Pinia：content / settings / interaction / effects / ui
│   ├── styles/               # variables.css（设计令牌）+ base.css + legacy.css
│   ├── types/index.ts        # 全站共享类型
│   ├── utils/
│   │   ├── dataSource.ts     # ★ 数据源抽象层（本地实现 / 预留 API 实现）
│   │   ├── base.ts           # 部署 base 路径工具（子路径部署用）
│   │   ├── overlay.ts        # 弹层焦点圈定 + 引用计数滚动锁
│   │   ├── storage.ts        # localStorage 安全封装
│   │   ├── idb.ts            # IndexedDB Blob 封装 + `idb:` 媒体引用解析
│   │   ├── markdown.ts       # Markdown 安全渲染 + 目录
│   │   ├── validate.ts       # 导入数据防御性校验
│   │   ├── image.ts          # 媒体下载
│   │   ├── seed.ts           # 种子数据加载（含 frontmatter 解析 / base 前缀）
│   │   └── format.ts         # 日期格式化、防抖节流
│   ├── views/                # 页面（路由懒加载）
│   ├── App.vue / main.ts
│   └── vite-env.d.ts
├── index.html                # CSP、SEO/社交卡片 meta、PWA manifest
├── vite.config.ts            # 别名、分包、CSP 注入、404.html、SW 预缓存注入
├── esa.jsonc                 # 阿里云 ESA 构建与路由配置
├── wrangler.jsonc            # Cloudflare Workers 静态资源配置
├── eslint.config.js / .prettierrc / tsconfig*.json
└── package.json
```

## 🚀 快速开始

```bash
# 1. 安装依赖（建议 Node.js 22；GitHub Actions 与 Pages 构建环境都用 22）
npm ci

# 2. 本地开发（已监听 0.0.0.0，同一局域网可访问）
npm run dev            # http://localhost:5173

# 3. 类型检查 / 代码检查 / 格式化
npm run type-check
npm run lint
npm run format

# 4. 生产构建（产物在 dist/）+ 产物自检（预缓存清单、manifest、headers…）
npm run build
npm run verify:build
# 或一步到位：npm run check

# 5. 本地预览构建结果
npm run preview

# 6. 重新生成占位图（可选；替换成真实照片后可删除）
npm run generate:images
```

> **目前的数据状态**：相册（5 个 / 37 张图）、视频（10 个）、文章（5 篇）、轮播、荣誉墙
> 均为**测试占位内容**（测试相册一~五、测试文章一~五、测试轮播一~四、测试荣誉一~六等）；
> **仍是真实内容的只有首页班级名片与站点公告**。替换文案时注意区分。

## 🌐 部署

构建产物为纯静态文件，任意静态托管均可。仓库内已备好三份平台配置，互不干扰：

| 平台 | 配置文件 | SPA 回退靠什么 |
| --- | --- | --- |
| 阿里云 ESA「函数和 Pages」 | `esa.jsonc` | `assets.notFoundStrategy = singlePageApplication` |
| Cloudflare Pages | `_headers` / `_redirects` | 产物里**不要有** `404.html`，Pages 会自动回退 |
| Cloudflare Workers | `wrangler.jsonc` | `assets.not_found_handling` |
| GitHub Pages | `VITE_BASE` + `VITE_SPA_404` | 生成 `404.html`（index.html 的副本） |

### 阿里云 ESA

- 控制台：构建命令 `npm run build`、**静态资源目录填 `dist`**
- `esa.jsonc` 的配置优先于控制台，但**两处都要配**：文件未被读到时会回退到控制台的值
- 推送到 `main` 自动触发构建
- `_headers` 是 Cloudflare Pages/Netlify 系的约定，ESA 不读取；安全头需要的话在 ESA 控制台另配

### Cloudflare Pages

- 框架预设选「无」，构建命令 `npm run build`，构建输出目录 `dist`，根目录 `/`
- 环境变量加 `NODE_VERSION = 22`，否则构建环境的 Node 版本可能带不动 Vite 6
- 纯静态部署，**没有 Worker / Function**；`_headers` 提供安全响应头与缓存策略，`_redirects` 提供 SPA 回退
- 当前构建产物里不带 `functions/`，控制台直接拖 dist 上传也能得到同样行为

#### 视频进度条：客户端 Blob 兜底（Pages 不支持 Range）

根因在平台侧：**Cloudflare Pages 的静态资源不处理 `Range` 请求**，一律返回 `200` + 整个文件，
也不带 `Accept-Ranges`。官方 known issues 的原话是
"Pages currently returns 200 responses for HTTP range requests"。

浏览器加载 `<video>` 时先发 `Range: bytes=0-`，拿不到 `206 + Content-Range` 之后
`<video>.seekable` 就是空的：进度条只能在线性缓冲范围内拖，拖到未缓冲处会被弹回。

线上验证：

```bash
curl -s -o /dev/null -D - -r 100-199 https://<project>.pages.dev/videos/<file>.mp4
# → 200 + 完整文件（不是 206、没有 Content-Range）
```

当前做法（纯静态，不请求 Worker / Function）：

- `src/views/VideoDetailView.vue` 先探测一次 `Range`，拿不到 `206` 就在后台把整段下载成 Blob
  再换源——Blob 定位不依赖服务器，换源后进度条可以随便拖
- 播放器右上角显示「准备可拖动进度条 xx%」，可点「取消」保持边下边看
- 代价：首次要完整下载 12–20 MB 才能拖动；`_headers` 给 `/videos/*` 配了一周缓存，
  同一浏览器第二次播放可以直接命中缓存
- `public/sw.js` 不拦截媒体与带 `Range` 的请求（Cache API 只能存整份 200，
  经手一遍反而会让浏览器认为「不可分段」）

想做到真正的「边下边拖」而不是整段预载，必须换支持 Range 的视频源（R2 / Stream / 对象存储等）；
在 Pages 上补 206 只能靠 Worker / Function，本项目选择不引入。

### GitHub Pages

子路径部署已经可用（数据里的媒体地址、PWA manifest、Service Worker 的预缓存清单都会按 base 前缀处理）：

```bash
# 仓库名非根路径时指定 base；GitHub Pages 需要 404.html 才有 SPA 回退
VITE_BASE=/class2419/ VITE_SPA_404=1 npm run build
```

部署后访问 `https://<user>.github.io/class2419/`。注意：GitHub Pages 是海外 CDN，国内访问可能偏慢。

### 其他

```bash
npm run build && npx serve dist
```

需自行配置 SPA 回退（可用仓库内 `public/_redirects`：`/* /index.html 200`）。

## 🔐 安全与隐私说明（必读）

- **无后端**：所有数据仅保存在**访问者自己的浏览器**（localStorage / IndexedDB），换设备或清除浏览器数据即丢失。
  设置页提供**导出备份 / 导入备份**（一个 JSON，含本地内容、收藏、视频进度、阅读位置、打卡）。
- **XSS 防护**：所有 Markdown 经 DOMPurify 白名单消毒后才 `v-html`；导入 JSON 经 `validate.ts` 防御性解析（字段裁剪、URL 协议白名单、长度限制）。
- **CSP**：生产构建自动注入 Content-Security-Policy（限制 `script-src`、`object-src 'none'`、iframe 白名单等）；
  `public/_headers` 额外补 `frame-ancestors 'none'`（meta 里的 CSP 不支持该指令）、HSTS、`X-Frame-Options`、`Permissions-Policy`。
- **外链**：所有 `target="_blank"` 链接自动附加 `rel="noopener noreferrer"`。
- **离线**：Service Worker 只缓存同源静态资源；视频与跨域请求不缓存。

## 🧪 质量保障

- `npm run lint` / `npm run type-check`
- `npm run build && npm run verify:build`：自检 `sw.js` 预缓存清单、缓存构建哈希、`index.html` 是否入缓存、
  是否误缓存视频、manifest 是否相对路径、`_headers` / `robots.txt` 是否存在
- `.github/workflows/ci.yml`：push / PR 自动跑上述检查
- 这套自检是针对「平台行为回归」加的：SW 离线、子路径部署、视频 Range 这类问题曾经都是构建通过但线上坏掉

## 🧩 扩展指南

### 新增一个页面（如「留言墙」）

1. 创建 `src/views/GuestbookView.vue`
2. 在 `src/router/index.ts` 的 `routes` 中登记（懒加载 + `meta.title`）
3. 在同文件 `mainNav / bottomNav / moreNav` 中按需加入菜单项
4. 数据写入参照 `store/content.ts`，通过 `dataSource` 保存即可获得导入导出能力

### 接入真实后端 API

`src/utils/dataSource.ts` 已抽象 `DataSource` 接口，文件内附有 `ApiDataSource` 示例骨架：

```ts
export const dataSource: DataSource = new ApiDataSource('/api') // 替换导出实例即可
```

前端其余代码（store / views）零改动。

### 替换为真实照片 / 视频

- 直接把 `public/images/` 下的 SVG 换成同名 JPG/WebP（推荐 WebP + 响应式尺寸）
- 种子数据在 `src/data/*.json` 与 `src/data/articles/*.md` 中按同样结构修改
- **替换同名视频/图片时记得换文件名**：`_headers` 给 `/videos/*`、`/images/*` 配了较长缓存，
  同名覆盖可能一周后才生效
- 文案先搜「测试」二字，能一次找出所有占位内容

### 更多模块

「荣誉墙」等数据结构已内置（见 `types/index.ts` 与 About 页面），
新增类似模块只需：类型 → 种子 JSON → store 计算属性 → 视图。

## 📦 性能优化清单

- 路由级代码分割（页面独立 chunk）+ vendor 手动分包（vue / router+pinia / markdown）
- 图片 IntersectionObserver 懒加载 + 骨架占位；视频 `poster` + `preload="metadata"`
- 视频在不支持 Range 的托管（Pages）上整段预载成 Blob 换源（见「视频进度条」），其余托管走原生 206
- 搜索 / 输入防抖、滚动节流（阅读进度、首屏视差用 rAF 合并）
- CSS 变量主题（无运行时 CSS-in-JS）；动画尊重 `prefers-reduced-motion`
- **低性能设备降级**：设置中可关闭「液态玻璃」，会移除全部 `backdrop-filter` 并把半透明表面换成不透明底色；
  3D 徽章按设备评分分级，运行时按帧率自动降级
- PWA 离线：首次打开后预缓存约 110 个静态文件（构建产物 + 图片，约 2 MB），之后页面/相册可离线浏览
- 构建 CSS/JS 压缩（gzip 约 80KB 主包）

## 📄 License

MIT © 2419 班 · 示例数据与占位图仅供演示，可自由替换。完整许可见 [LICENSE](./LICENSE)。
