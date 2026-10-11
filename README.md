# 新屋岭中学 2419 班 · 班级空间

> 一个**无后端依赖**的纯前端班级网站，以相册、视频、文章为核心，记录 2419 班的青春故事。
> 可直接部署到 GitHub Pages / Netlify / Vercel。

![tech](https://img.shields.io/badge/Vue-3.5-blue) ![vite](https://img.shields.io/badge/Vite-6-purple) ![ts](https://img.shields.io/badge/TypeScript-5.7-blue)

---

## ✨ 功能一览

| 模块 | 说明 |
| --- | --- |
| 🏠 首页 | 班级名片、轮播图、班级公告、毕业倒计时、最新相册 / 视频 / 文章 |
| 🖼️ 相册 | 网格 / 瀑布流布局、分类标签筛选、搜索排序、灯箱预览（键盘/触屏）、懒加载、下载、点赞、收藏 |
| 🎬 视频 | 分类筛选、HTML5 播放器 / Bilibili·YouTube 外链、**播放进度记忆**、封面与外链标识 |
| 📝 文章 | Markdown 渲染（XSS 消毒）、自动目录、阅读进度条、滚动位置记忆、标签 / 搜索 / 上一篇下一篇 |
| 🏫 关于班级 | 班级介绍、成员墙（可搜索）、荣誉墙、班级时间线 |
| 🔍 全站搜索 | 搜索相册 / 视频 / 文章 / 标签，顶栏浮层 + 独立搜索页 |
| ✏️ 投稿 / 管理 | 本地模拟登录（演示密码 `2419`）、四类内容增删改查、草稿、图片压缩上传、视频存 IndexedDB、JSON 导入导出 |
| ⚙️ 设置 | 亮 / 暗 / 跟随系统主题、三种强调色、字号缩放、动画开关、一键重置数据 |
| 📱 响应式 | 移动优先；桌面顶部导航 + 移动端底部导航 / 抽屉菜单，支持安全区适配 |
| 🎲 PWA | 生产构建自动注册 Service Worker，离线缓存静态资源（可选能力，默认开启） |

## 🛠 技术栈

- **框架**：Vue 3（Composition API + `<script setup>`）+ Vite 6 + TypeScript（strict）
- **路由 / 状态**：Vue Router 4（懒加载 + 配置化菜单）、Pinia
- **Markdown**：marked + DOMPurify（安全渲染，外链自动 `rel="noopener noreferrer"`）
- **持久化**：localStorage（结构化数据）+ IndexedDB（用户上传的视频 Blob）
- **样式**：原生 CSS + CSS 变量主题系统（无 UI 框架依赖，体积可控）
- **工程化**：ESLint 9（flat config）+ Prettier、vue-tsc 类型检查、代码分割与手动 chunk 分包

## 📁 目录结构

```
xinwuling-class-2419/
├── public/
│   ├── images/               # 由脚本生成的 SVG 占位图（可替换为真实照片）
│   ├── favicon.svg
│   ├── manifest.webmanifest  # PWA 清单
│   └── sw.js                 # 极简 Service Worker
├── scripts/
│   └── generate-images.mjs   # 占位图生成脚本
├── src/
│   ├── components/
│   │   ├── admin/            # 投稿表单（相册/视频/文章/公告）
│   │   ├── common/           # 轮播、搜索浮层、懒加载图片、骨架屏、空/错误态…
│   │   ├── layout/           # 顶栏、底部导航、页脚
│   │   └── media/            # 内容卡片、灯箱、点赞收藏栏
│   ├── data/                 # 种子数据（JSON + Markdown 文章）
│   │   └── articles/*.md     # 带 frontmatter 的文章源文件
│   ├── router/index.ts       # 路由 + 主导航/底部导航配置（新增页面在此登记）
│   ├── store/                # Pinia：content / settings / auth / interaction
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
│   ├── views/                # 12 个页面（路由懒加载）
│   ├── App.vue / main.ts
│   └── vite-env.d.ts
├── index.html                # CSP、SEO meta、PWA manifest
├── vite.config.ts            # 别名、分包、GitHub Pages 404 回退
├── eslint.config.js / .prettierrc / tsconfig*.json
└── package.json
```

## 🚀 快速开始

```bash
# 1. 安装依赖（Node.js >= 18）
npm install

# 2. 本地开发
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

> **首次运行即有完整示例内容**：5 个相册（37 张图）、6 个视频、5 篇文章、成员墙、荣誉墙、时间线与公告。

## 🌐 部署

构建产物为纯静态文件，任意静态托管均可。

### GitHub Pages

```bash
# 仓库名非根路径时，指定 base（例如仓库叫 class2419）
VITE_BASE=/class2419/ npm run build
```

构建插件会自动把 `dist/index.html` 复制为 `dist/404.html`，实现 SPA 路由回退。
在仓库 Settings → Pages 选择 `gh-pages` 分支（或用 Actions 上传 `dist/`）即可。

### Netlify / Vercel

- 构建命令：`npm run build`；发布目录：`dist`
- 两者默认支持 SPA 回退，无需额外配置（Netlify 如遇刷新 404 可加 `public/_redirects`：`/* /index.html 200`）

### 其他

```bash
npm run build && npx serve dist
```

## 🔐 安全与隐私说明（必读）

- **无后端**：所有用户投稿、点赞、收藏、观看进度仅保存在**访问者自己的浏览器**（localStorage / IndexedDB），换设备或清除浏览器数据即丢失；重要稿件请使用「导出 JSON 备份」。
- **演示密码**：管理密码 `2419` 为前端明文常量，**仅用于演示界面鉴权流程，不构成真实安全机制**，切勿存放敏感信息。
- **XSS 防护**：所有 Markdown 经 DOMPurify 白名单消毒后才 `v-html`；导入 JSON 经 `validate.ts` 防御性解析（字段裁剪、URL 协议白名单、长度限制）。
- **CSP**：`index.html` 内置 Content-Security-Policy（限制 `script-src`、`object-src 'none'`、iframe 白名单等）。
- **外链**：所有 `target="_blank"` 链接自动附加 `rel="noopener noreferrer"`。
- **图片上传**：自动压缩为 JPEG dataURL（最长边 1440px），避免localStorage 配额爆满；视频使用 IndexedDB 存 Blob。

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
- 或在「投稿/管理」中上传（图片自动压缩；视频存 IndexedDB）
- 种子数据在 `src/data/*.json` 与 `src/data/articles/*.md` 中按同样结构修改

### 更多模块

「荣誉墙」「活动记录」等数据结构已内置（见 `types/index.ts` 与 About 页面），
新增类似模块只需：类型 → 种子 JSON → store 计算属性 → 视图。

## 📦 性能优化清单

- 路由级代码分割（12 个页面独立 chunk）+ vendor 手动分包（vue / router+pinia / markdown）
- 图片 IntersectionObserver 懒加载 + 骨架占位；视频 `poster` + `preload="metadata"`
- 搜索 / 输入防抖、滚动节流（阅读进度）
- CSS 变量主题（无运行时 CSS-in-JS）；动画尊重 `prefers-reduced-motion`
- PWA 离线缓存；构建 CSS/JS 压缩（gzip 约 80KB 主包）

## 📄 License

MIT © 2419班 · 示例数据与占位图仅供演示，可自由替换。
