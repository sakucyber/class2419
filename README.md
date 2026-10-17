# 新屋岭中学 2419 班 · 班级空间

> 一个**无后端依赖**的纯前端班级网站，以相册、视频、文章为核心，记录 2419 班的青春故事。
> 纯静态产物，当前部署在**阿里云 ESA** 与 **Cloudflare Pages**。

![tech](https://img.shields.io/badge/Vue-3.5-blue) ![vite](https://img.shields.io/badge/Vite-6-purple) ![ts](https://img.shields.io/badge/TypeScript-5.7-blue)

---

## ✨ 功能一览

| 模块 | 说明 |
| --- | --- |
| 🏠 首页 | 班级名片、轮播图、班级公告、毕业倒计时、最新相册 / 视频 / 文章 |
| 🖼️ 相册 | 网格 / 瀑布流布局、分类标签筛选、搜索排序、灯箱预览（键盘/触屏）、懒加载、下载、收藏 |
| 🎬 视频 | 分类筛选、HTML5 播放器 / Bilibili·YouTube 外链、**播放进度记忆**、封面与外链标识 |
| 📝 文章 | Markdown 渲染（XSS 消毒）、自动目录、阅读进度条、滚动位置记忆、标签 / 搜索 / 上一篇下一篇 |
| 🏫 关于班级 | 班级介绍、荣誉墙 |
| 🔍 全站搜索 | 搜索相册 / 视频 / 文章 / 标签，顶栏浮层 + 独立搜索页 |
| ⚙️ 设置 | 亮 / 暗 / 跟随系统主题、四种强调色、字号缩放、动效开关、**液态玻璃开关**（低性能设备可关）、一键重置数据 |
| 📱 响应式 | 移动优先；桌面顶部导航 + 移动端底部导航 / 抽屉菜单，支持安全区适配 |
| 🎲 PWA | 生产构建自动注册 Service Worker，离线缓存静态资源（可选能力，默认开启） |

> **已下线的功能**（不要再加回来）：投稿 / 管理后台、成员墙、点赞、班级时间线。
> 与内容的互动只剩**收藏**与分享。
>
> 时间线下线的具体范围：**关于页的「班级时间线」区块**与**首页指向它的跳转入口**均已删除，
> 相关样式也一并清理（`node-body` / `count-link` 等类名在 `src/` 下已无任何引用）。
> 但**数据链路保留**：`src/data/timeline.json`、`utils/seed.ts` 的 `seedTimeline`、
> `store/content.ts` 的 `content.timeline`、以及 `types/index.ts` 的 `TimelineNode` 都还在，
> 将来若要恢复，只需把 section 加回 `AboutView`，无需重建数据层。

## 🛠 技术栈

- **框架**：Vue 3（Composition API + `<script setup>`）+ Vite 6 + TypeScript（strict）
- **路由 / 状态**：Vue Router 4（懒加载 + 配置化菜单）、Pinia
- **Markdown**：marked + DOMPurify（安全渲染，外链自动 `rel="noopener noreferrer"`）
- **持久化**：localStorage（结构化数据）+ IndexedDB（用户上传的视频 Blob）
- **样式**：原生 CSS + CSS 变量主题系统（无 UI 框架依赖，体积可控）
- **工程化**：ESLint 9（flat config）+ Prettier、vue-tsc 类型检查、代码分割与手动 chunk 分包

## 📁 目录结构

```
class2419/
├── public/
│   ├── images/               # 由脚本生成的 SVG 占位图（可替换为真实照片）
│   ├── _redirects            # SPA 回退规则（Cloudflare Pages 等平台用）
│   ├── favicon.svg
│   ├── manifest.webmanifest  # PWA 清单
│   └── sw.js                 # 极简 Service Worker
├── scripts/
│   └── generate-images.mjs   # 占位图生成脚本
├── src/
│   ├── components/
│   │   ├── admin/            # 旧投稿表单（功能已下线，保留代码未接入路由）
│   │   ├── common/           # 轮播、搜索浮层、懒加载图片、骨架屏、空/错误态…
│   │   ├── layout/           # 顶栏、底部导航、页脚
│   │   └── media/            # 内容卡片、灯箱、收藏栏
│   ├── data/                 # 种子数据（JSON + Markdown 文章）
│   │   └── articles/*.md     # 带 frontmatter 的文章源文件
│   ├── router/index.ts       # 路由 + 主导航/底部导航配置（新增页面在此登记）
│   ├── store/                # Pinia：content / settings / interaction
│   ├── styles/               # variables.css（设计令牌）+ base.css（重置与工具类）
│   ├── types/index.ts        # 全站共享类型
│   ├── utils/
│   │   ├── dataSource.ts     # ★ 数据源抽象层（本地实现 / 预留 API 实现）
│   │   ├── storage.ts        # localStorage 安全封装
│   │   ├── idb.ts            # IndexedDB Blob 封装 + `idb:` 媒体引用解析
│   │   ├── markdown.ts       # Markdown 安全渲染 + 目录提取
│   │   ├── validate.ts       # 导入数据防御性校验
│   │   ├── image.ts          # 图片压缩 / 下载工具
│   │   ├── seed.ts           # 种子数据加载（含 frontmatter 解析）
│   │   └── format.ts         # 日期格式化、防抖节流
│   ├── views/                # 页面（路由懒加载）
│   ├── App.vue / main.ts
│   └── vite-env.d.ts
├── index.html                # CSP、SEO meta、PWA manifest
├── vite.config.ts            # 别名、分包、CSP 注入、按需生成 404.html
├── esa.jsonc                 # 阿里云 ESA 构建与路由配置
├── wrangler.jsonc            # Cloudflare Workers 静态资源配置
├── eslint.config.js / .prettierrc / tsconfig*.json
└── package.json
```

## 🚀 快速开始

```bash
# 1. 安装依赖（Node.js >= 18）
npm install

# 2. 本地开发（已监听 0.0.0.0，同一局域网可访问）
npm run dev            # http://localhost:5173

# 3. 类型检查 / 代码检查 / 格式化
npm run type-check
npm run lint
npm run format

# 4. 生产构建（产物在 dist/）
npm run build

# 5. 本地预览构建结果
npm run preview

# 6. 重新生成占位图（可选；替换成真实照片后可删除）
npm run generate:images
```

> **目前的数据状态**：相册（5 个 / 37 张图）、视频（6 个）、文章（5 篇）、轮播、荣誉墙
> 均为**测试占位内容**（测试相册一~五、测试文章一~五、测试轮播一~四、测试荣誉一~六等）；
> **仍是真实内容的只有首页班级名片与站点公告**。替换文案时注意区分。

## 🌐 部署

构建产物为纯静态文件，任意静态托管均可。仓库内已备好三份平台配置，互不干扰：

| 平台 | 配置文件 | SPA 回退靠什么 |
| --- | --- | --- |
| 阿里云 ESA「函数和 Pages」 | `esa.jsonc` | `assets.notFoundStrategy = singlePageApplication` |
| Cloudflare Pages | 无（用平台原生能力） | 产物里**不要有** `404.html`，Pages 会自动回退 |
| Cloudflare Workers | `wrangler.jsonc` | `assets.not_found_handling` |

### 阿里云 ESA

- 控制台：构建命令 `npm run build`、**静态资源目录填 `dist`**
- `esa.jsonc` 的配置优先于控制台，但**两处都要配**：文件未被读到时会回退到控制台的值
  （首次部署时就因控制台留空 + 文件未被读到而连续构建失败）
- 推送到 `main` 自动触发构建

### Cloudflare Pages

- 框架预设选「无」，构建命令 `npm run build`，构建输出目录 `dist`，根目录 `/`
- 环境变量加 `NODE_VERSION = 22`，否则构建环境的 Node 版本可能带不动 Vite 6

### GitHub Pages

```bash
# 仓库名非根路径时指定 base；GitHub Pages 需要 404.html 才有 SPA 回退
VITE_BASE=/class2419/ VITE_SPA_404=1 npm run build
```

### 其他

```bash
npm run build && npx serve dist
```

需自行配置 SPA 回退（可用仓库内 `public/_redirects`：`/* /index.html 200`）。

## 🔐 安全与隐私说明（必读）

- **无后端**：所有数据仅保存在**访问者自己的浏览器**（localStorage / IndexedDB），换设备或清除浏览器数据即丢失。收藏与观看进度都属于此类。
- **XSS 防护**：所有 Markdown 经 DOMPurify 白名单消毒后才 `v-html`；导入 JSON 经 `validate.ts` 防御性解析（字段裁剪、URL 协议白名单、长度限制）。
- **CSP**：生产构建自动注入 Content-Security-Policy（限制 `script-src`、`object-src 'none'`、iframe 白名单等）；开发模式不注入，因为 Vite 的 HMR 需要内联脚本。
- **外链**：所有 `target="_blank"` 链接自动附加 `rel="noopener noreferrer"`。
- **图片上传**：自动压缩为 JPEG dataURL（最长边 1440px），避免 localStorage 配额爆满。

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
- 文案先搜「测试」二字，能一次找出所有占位内容

### 更多模块

「荣誉墙」等数据结构已内置（见 `types/index.ts` 与 About 页面），
新增类似模块只需：类型 → 种子 JSON → store 计算属性 → 视图。

## 📦 性能优化清单

- 路由级代码分割（页面独立 chunk）+ vendor 手动分包（vue / router+pinia / markdown）
- 图片 IntersectionObserver 懒加载 + 骨架占位；视频 `poster` + `preload="metadata"`
- 搜索 / 输入防抖、滚动节流（阅读进度）
- CSS 变量主题（无运行时 CSS-in-JS）；动画尊重 `prefers-reduced-motion`
- **低性能设备降级**：设置中可关闭「液态玻璃」，会移除全部 `backdrop-filter` 并把半透明表面换成不透明底色
- PWA 离线缓存；构建 CSS/JS 压缩（gzip 约 80KB 主包）

## 📄 License

MIT © 2419班 · 示例数据与占位图仅供演示，可自由替换。
