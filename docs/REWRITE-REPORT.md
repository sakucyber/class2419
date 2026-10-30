# class2419 重写说明

> 分支：`rewrite/design-system-v2`（从 `main` 切出，`main` 未产生任何提交）
> 主体提交：`f1f1143 feat(ui): 重写为四套可切换视觉风格的设计系统`（67 个文件，+7322 / −4261）
> 依据：`风格要求.txt`（三套新风格的完整视觉规范）、`网站设计要求.txt`（背景分层 / SVG / 动效规范）
>
> 后续追加：在本文的设计系统上新增第 5 套风格「青春校园」，见 `docs/STYLE-CAMPUS.md`。
> 文中"四套风格"「首屏 56.9 KB」等数字为当时快照，最新口径以 `docs/STYLE-CAMPUS.md` 为准。

---

## 0. 结果摘要

| 项目 | 结果 |
| --- | --- |
| 技术栈 | **沿用** Vue 3 + TypeScript + Vite + Pinia + Vue Router；运行时依赖零增减 |
| 内置风格 | 4 套（纸质年鉴 [默认] / Japandi / 硬边杂志 / 原版保留），同一份 DOM，纯 CSS 换肤 |
| 覆盖页面 | 12 条路由（含 404），与原站逐条一致 |
| 数据与业务层 | **32 个文件零改动**：全部 `src/data/**`、全部 `src/utils/**`、`content/interaction/ui/effects` 四个 store |
| 功能回归 | 42 / 42 通过（CDP 真实浏览器自动化，生产包 + 无 HTTP Range 环境） |
| 离线回归 | 10 / 10 通过（117 项预缓存，1.0 MB） |
| 视觉回归 | 4 风格 × 2 主题 × 12 页 = 96 次页面加载，0 条控制台错误；另 8 张移动端截图人工复核 |
| 静态检查 | `vue-tsc -b` 无错误、`eslint .` 无告警、`verify:build` 全绿 |

---

## 1. 技术栈：沿用，不更换

### 1.1 现状

站点是**纯前端静态 PWA**：无后端、无数据库、无登录，数据来自构建期 JSON + 本地 IndexedDB/localStorage，
部署目标是静态托管（GitHub Pages / Cloudflare Pages / 阿里云 ESA）。交互密度却不低：

- 全站搜索（浮层 + 结果页 + 分类计数）
- 相册：分类筛选、三种排序、网格/瀑布流切换、灯箱（键盘、滑动、缩放）
- 视频：自研源解析状态机（Range 探测、无 Range 时整段预载为 Blob、外链 iframe / 跳转降级）+ 进度记忆与续播
- 文章：Markdown 渲染 + 自动目录 + 阅读进度条 + 阅读位置恢复
- 外观：4 风格 × 明暗三态 × 5 个强调色选项 × 3 档字号 × 动效/玻璃开关，且要持久化、首屏不闪烁
- 可选 3D 班徽（three.js，按设备能力自动降级）

### 1.2 候选方案与判定

| 方案 | 首屏 JS 收益 | 迁移成本 | 功能等价风险 | 判定 |
| --- | --- | --- | --- | --- |
| **Vue 3 + Vite（沿用）** | — | 0（本次只改表现层） | 最低 | **采用** |
| Astro（islands） | 首屏 JS 可降 60%+ | 高：12 个交互视图全部要拆 islands，播放器/灯箱/筛选都要重新设计交互边界 | 高：PWA 预缓存、兼容降级链、三类数据源都要重做 | 否 |
| SvelteKit / Nuxt | 与现状接近 | 高：全量改写 + 团队/个人熟悉度无增益 | 高 | 否 |
| 原生 Web Components | 理论最小 | 极高：路由、状态、模板全部自研 | 极高 | 否 |

### 1.3 为什么判定"没有明显优势"

判据是「换栈必须在性能、可维护性或开发效率上**确有明显优势**」，逐条核对：

1. **性能**：本次真正的体积问题是 three.js（660.8 KB / gzip 169.7 KB）。它已经是**动态 import**
   且被排除在预缓存之外——不进首页关键路径、不进离线预算，换框架一分钱也省不到。
   剩余首屏 JS（Vue 运行时 + 路由 + 首页逻辑）gzip 约 31 KB，继续压缩的空间在图片与 CSS，而不在框架。
2. **可维护性**：本次重写的核心痛点是「四套风格 × 12 个页面」的组合爆炸。这个问题的解法是
   **设计令牌 + 皮肤分层**（见 3.1），与框架无关；换栈只会把同一件事再做一遍。
3. **开发效率**：站点已积累的工程资产——`compat.js` 兼容降级链、`sw.js` 预缓存注入、
   `verify-build.mjs` 产物自检、`dataSource` 三层数据源——都是围绕当前构建链写的。换栈等于清零重建，
   而收益是"少 30 KB JS"，不成比例。

因此：**框架不动，把重写预算全部投入到设计系统与组件层**。这也是本次能在不碰数据层的前提下
做到功能一致的根本原因（见 4.3）。

### 1.4 依赖与工具链变化

| 类别 | 变化 |
| --- | --- |
| dependencies | **无增减**（vue / vue-router / pinia / marked / dompurify / three 版本均不动） |
| devDependencies | **无增减**（未引入 Playwright / Puppeteer / UI 库 / 图标库 / CSS-in-JS） |
| 新增脚本 | `scripts/qa-visual.mjs`、`qa-interact.mjs`、`qa-offline.mjs`、`qa-server.mjs`（Node 原生 + CDP，零依赖） |
| 新增 npm scripts | `qa:visual` / `qa:interact` / `qa:offline` / `qa:server` |
| 新增构建输入 | `public/theme-init.js`（首屏前置脚本，见 3.8） |

图标仍走 `AppIcon.vue` + `components/common/icons.ts` 的 **SVG 线性图标**，不引入图标库。
说明一处对规范的有意偏离：《风格要求》里年刊风允许"emoji 图标降饱和"，但本项目既有约定是
**禁止 emoji、统一 SVG 线性图标**；同时《网站设计要求》第二节要求图标风格统一、2–4 色、可缩放。
两者取交集的结果是保留 SVG 线性图标（下文 3.2 的图标一致性即由此保证），未使用任何 emoji。

---

## 2. 重写范围

### 2.1 页面（路由逐条对照）

| 路由 | 视图 | 关键内容 |
| --- | --- | --- |
| `/` | `HomeView` | 班级名片（班徽 + 口号 + 数据条 + 三个入口）、中考倒计时 + 三年进度、随机回忆、轮播、班级公告、最新相册/视频/文章 |
| `/albums` | `AlbumsView` | 搜索框、分类 chips、排序下拉、网格/瀑布流切换、空状态 |
| `/albums/:id` | `AlbumDetailView` | 封面、元信息、照片网格、灯箱、收藏/分享 |
| `/videos` | `VideosView` | 搜索、分类筛选、卡片网格、加载更多、空状态 |
| `/videos/:id` | `VideoDetailView` | 播放器（原生 controls + 源解析状态）、简介、更多视频侧栏、收藏/分享 |
| `/articles` | `ArticlesView` | 搜索、分类筛选、热门标签、卡片列表、空状态 |
| `/articles/:id` | `ArticleDetailView` | 封面、目录、Markdown 正文、阅读进度、上下篇、收藏/分享 |
| `/about` | `AboutView` | 班级简介、信息事实表、访问入口、荣誉墙 |
| `/search` | `SearchView` | 关键词、三类结果 tab（带计数）、结果行 |
| `/favorites` | `FavoritesView` | 分组收藏列表、移除、空状态 |
| `/settings` | `SettingsView` | 外观 5 组、特效与性能、安装到桌面、数据管理、关于本站 |
| `/:pathMatch(.*)*` | `NotFoundView` | 404 文案 + 返回入口 |

### 2.2 功能模块清单（全部保留）

- **外观**：4 风格切换（顶栏面板 + 设置页双入口）、明暗三态（跟随系统/亮/暗）、5 个强调色选项
  （跟随风格 + 蓝/绿/橙/粉）、3 档字号（小/中/大）、动效开关、玻璃质感开关；写入 `cls2419:settings`，
  老存档自动迁移（无 `style` 字段 → 年鉴 + `accent: auto`）。
- **今日打卡**：页脚入口，本地累计次数与最近日期（`cls2419:checkin`）。
- **搜索**：顶栏入口 + 浮层 + 独立结果页，跨相册/视频/文章。
- **相册**：分类筛选、最新/最早/标题排序、网格与瀑布流、灯箱（方向键切换、触摸滑动、Esc 关闭、计数器）、收藏、分享（Web Share + 复制链接兜底）。
- **视频**：原生 `<video controls>` + 自研源解析状态机（Range 能力探测、无 Range 时整段预载为 Blob、外链 iframe / 新窗口降级）、三种加载状态角标、进度记忆与续播。
- **文章**：Markdown + 代码高亮样式、自动目录、阅读进度条、阅读位置恢复、上一篇/下一篇。
- **收藏**：跨三类内容统一收集、分组展示、移除。
- **设置**：导出备份（JSON）、导入备份（合并、同 id 覆盖、兼容旧版）、重置本地数据（二次确认）、PWA 安装。
- **PWA**：`sw.js` 预缓存（117 项 / 1.0 MB）、构建哈希轮换缓存名、离线首屏与子路由可用、安装提示与分平台引导。
- **兼容**：`compat.js` + `probe-es2020.js` 降级链（不支持 ES2020 语法的浏览器走简化模式）。
- **无障碍**：跳过导航链接、`aria-*` 标注、`:focus-visible` 焦点环（粗野风加粗到 3px）、`prefers-reduced-motion` 与"关闭动效"开关双通道。

### 2.3 明确未动的部分

- `src/data/**`：相册 5、视频 10、文章 5、公告 2、荣誉 6、轮播 4、班级信息 1；时间线数据 8 条保留（其 UI 早已移除，本次不恢复）。
- `src/utils/**` 全部（含 `dataSource` 三层数据源、`validate` 备份校验、`idb`、`markdown`、`pwa`）。
- `src/store/content.ts`、`interaction.ts`、`ui.ts`、`effects.ts`。
- 部署配置 `public/_headers`、`public/_redirects`、`esa.jsonc`、`vite.config.ts` 的 base/CSP/预缓存策略（仅把 `theme-init.js` 加入固定预缓存清单）。
- 已下线且不恢复的功能：投稿/管理、成员墙、点赞按钮、时间线 UI。

---

## 3. 主要改动点

### 3.1 设计系统分层（本次重写的骨架）

```
src/styles/
  tokens.css     168 行  结构令牌：间距、字号阶、字体栈、动效曲线、层级、圆角/描边尺度
  skins/         657 行  四套皮肤，每套只声明「配色 + 形态」两类变量
    annual.css   166
    japandi.css  166
    brutal.css   171
    legacy.css   154
  accents.css    101 行  用户显式选择的强调色（最后导入，可覆盖任意皮肤）
  base.css       937 行  组件基类，全部读令牌，不写死颜色与圆角
  index.css       77 行  导入顺序 + 全局层（压边、网格纹理、no-glass 覆盖）
```

规则：

1. `tokens.css` 与配色无关，四套风格共用；改一处全站生效。
2. `skins/*.css` 只写 `--bg` `--surface` `--text` `--accent` `--radius-*` `--shadow-*` `--line*` 等变量，
   **不写选择器样式**，因此不可能出现"某套风格漏改某个组件"。
3. `base.css` 只消费变量，任何组件都不写死 `#hex`（少数几何常量除外）。
4. 新增第五套风格 = 新增一个 `skins/*.css` + `config/styles.ts` 一条元数据，不改任何组件。

成果量化：`styles/` 从 1180 行增至 1939 行（+759，四套皮肤的代价），而 `views/` 从 4169 行降到 3741 行
（−428，重复的样式块被令牌吸收）。

### 3.2 四套风格落地要点

| | 纸质年鉴（默认） | Japandi | 硬边杂志 | 原版（保留） |
| --- | --- | --- | --- | --- |
| 底色 / 纸面 | `#faf9f6` / `#fff` | `#f7f5f0` / `#fffefb` | `#f5f0e1` / `#fffdf7` | 玻璃拟态，深色优先 |
| 主色 / 强调 | 墨蓝黑 `#16283d` / 铁锈橙 `#ab5c19` | 墨绿灰 `#3d4a42` / 陶土橘 `#a85f43` | `#111` / 亮黄 `#ffd23f` + 电光蓝 `#3b5bfd` | 粉紫渐变 + 可换强调色 |
| 圆角 / 描边 | 2–3px / 1px 细线 | 18–20px 卡片、999px 胶囊 / 无边框 | 0 / **3px 纯黑** | 大圆角 + 高光边 |
| 阴影 | 悬停时极淡大范围柔和影 | 长而软的投影 | `6px 6px 0 #111` 硬阴影，按压缩回 1px | 彩色光晕 + 模糊 |
| 标题字体 | 衬线（Noto Serif SC 栈） | 衬线、克制字重 | 超重无衬线 | 展示字重 |
| 班徽 | 方形描边框 + 衬线"叁"/EST. 2024（3D 方形浮雕牌） | 圆形鼠尾草绿勋章（3D 圆形） | 黑底黄字方形 + 硬阴影，牌面"19"/CLASS OF 2027（3D 浮雕牌） | 3D 星章（原版几何体） |
| 公告条 | 墨蓝底白字、字距 1px | 浅陶土底 + 陶土橘字 | 黑底黄字、900 字重 | 玻璃条 |
| 进度条 | 6px、无圆角、墨蓝填充 | 6px、全圆角、鼠尾草绿 | 14px、白底黑边、荧光绿 | 圆角渐变 |
| 背景装饰 | 顶部 4px 墨蓝压边 + 稿纸横线 + 极淡衬线大字 | 3–4 个低透明度 SVG（云/环/叶），20–30s 缓慢漂浮 | 40px 网格 + 极淡粗黑大字 | 浮动光斑 + 噪点 |

落地时按规范逐条核对并实机对照，纠正了几处"照做会坏"的地方：

- **年鉴的 4px 压边**用 `body::before` + `position: fixed` 实现，`z-index` 压在顶栏之上、`pointer-events: none`，
  避免遮挡顶栏按钮的点击区域。
- **粗野的网格纹理**放在 `body::after`（`z-index: 0`），内容层在其上，不参与命中测试。
- **Japandi 的漂浮装饰**周期统一 ≥20s，且 `html.no-animations` 下整体停止；移动端隐藏一半（规范要求）。
- 三套风格的标签字体栈都加了 `font-variant-numeric: tabular-nums`，倒计时与日期不跳动。

### 3.3 布局与导航

- `AppHeader.vue` 552 → 359 行：sticky 顶栏 + 品牌区 + 主导航 + 4 个动作按钮（搜索/风格/主题/抽屉）；
  四套风格各自换形（年鉴细线、Japandi 无边框、粗野亮黄整块 + 3px 黑边、原版玻璃）。
- 新增 `StyleSwitcher.vue`：顶栏下拉面板，含色板预览与四风格说明；`Esc`/点外部关闭，`aria-expanded` 同步。
- 新增 `AppDrawer.vue`：右侧抽屉，承载「更多」（收藏、设置）；移动端底栏的第 5 项直接打开它。
- 新增 `AppTicker.vue`：公告走马灯。**修复了原实现的重复问题**——原来只放一份内容 + 一份副本，
  宽屏下两组会同时出现在视口里（看起来像公告重复），现在按容器宽度动态补齐副本数，并随 `ResizeObserver` 重算。
- `MobileNav.vue` 重做：5 项底栏、安全区适配、当前项指示器。

### 3.4 组件层增删

| 新增 | 作用 |
| --- | --- |
| `common/AppBackground.vue` | 背景分层：底色层 → 装饰层（SVG/纹理）→ 悬浮层；替代原 `AmbientBackground.vue`，四套皮肤各取所需 |
| `common/PageHeader.vue` | 内页统一页头（kicker + 标题 + 描述 + 右侧插槽），12 个页面复用 |
| `common/ProgressBar.vue` | 进度条（阅读进度、三年进度共用），四套风格换形 |
| `layout/StyleSwitcher.vue` / `AppDrawer.vue` / `AppTicker.vue` | 见 3.3 |
| `media/VideoPlayer.vue` | 播放器 UI 与交互（见 3.5） |
| `composables/useVideoSource.ts` | 视频源解析（Range/Blob/外链） |
| `composables/useContentQuery.ts` | 列表页的筛选/排序/搜索复用逻辑 |

| 删除 | 原因 |
| --- | --- |
| `common/AmbientBackground.vue` | 由 `AppBackground.vue` 取代（旧实现只有一层浮动光斑，无法承载四套风格的装饰差异） |
| `styles/variables.css` | 令牌并入 `tokens.css` + `skins/*.css` |
| `styles/legacy.css` | 旧版全局样式被 `base.css` + `skins/legacy.css` 消化 |

### 3.5 视频播放器拆分（可维护性最大的一处）

`VideoDetailView.vue` 从 **873 行降到 193 行**：

- 源解析（Range 探测、无 Range 时 `fetch` 整段 → `Blob` URL、外链判断、超时与重试）→ `composables/useVideoSource.ts`（467 行）
- 播放器视图（原生 `<video controls>`、三种加载状态角标、失败态与重试、进度落盘定时器、续播）→ `media/VideoPlayer.vue`
- 页面只剩「数据装配 + 简介 + 侧栏 + 收藏/分享」

行为保持不变，并用回归脚本在**两种服务器环境**下验证：支持 Range（dev server）与不支持 Range（自建 `qa-server.mjs`，
故意忽略 `Range` 头）。后者断言播放器会把整段视频预载为 `blob:` 再播放——这正是原实现的降级路径。

### 3.6 3D 班徽随风格换形态

`components/effects/HeroBadge.vue` + `effects/three/badgeScene.ts`：

- 新增 `variant: 'star' | 'plaque'`：原版仍是星章；年鉴/Japandi/硬边改为**方形浮雕牌**，
  牌面用 canvas 贴图绘制班号与小字；Japandi 走圆形勋章路径。
- 新增 `palette`：金属色、深色、强调色、纸色由当前皮肤注入，`watch` 到风格变化时重建场景。
- 材质按风格分档：年鉴为低金属度哑光铜、粗野为高对比纯色、原版为高金属度。
- 失败降级保持不变：WebGL 不可用 / 上下文丢失 / 用户关闭 3D → 退回静态 SVG 徽章（`badge-static`），
  且 `badgeScene` 仍是动态 import，不进首屏、不进预缓存。

### 3.7 可读性体系：新增 `--accent-ink`

粗野风的强调色是亮黄 `#ffd23f`，直接当文字色在米黄底上是 1.4:1 的对比度——等于看不见。
本次引入 `--accent-ink` 专门表示"强调色用作文字"的取值：

- 年鉴 / Japandi / 原版：`--accent-ink = --accent`（行为不变）
- 粗野亮色主题：`#111111`（墨色）
- 粗野暗色主题：`#ffd23f`（亮黄）

并配合一批"亮黄只做底色"的修正：页头激活项、倒计时数字、风格卡选中态、公告条、`option.active`、
正文链接（改为墨色 + 2px 下划线，用形状而非颜色表达可点击）。深色主题下顶栏是深色，
粗野风的墨字会隐形，故加了一组 `[data-style='brutal'][data-theme='dark']` 的浅色文字覆盖。

### 3.8 首屏防闪烁与 CSP

原实现的主题/风格在 JS 挂载后才写到 `<html>` 上，刷新时会闪一下默认配色。本次新增
`public/theme-init.js`：在 `<head>` 里同步读取 `localStorage` 并写到 `data-style` / `data-theme` /
`data-accent` / `data-font-size` / `no-animations` / `no-glass`，再由 Vue 接管。

约束：CSP 为 `script-src 'self'`，不能内联 —— 所以走**外链同步脚本**而不是内联 `<script>`；
同时把它加入 `sw.js` 的固定预缓存清单（`vite.config.ts`），保证离线首屏也不闪。

### 3.9 顺手修掉的缺陷

| 问题 | 处理 |
| --- | --- |
| 公告条条目在宽屏重复 | 按容器宽度动态补齐副本（3.3） |
| 移动端首页 hero 图片被拉成方块 | 只在 ≥900px 让图片撑满正文高度，移动端交回 16/10 固有比例 |
| 窄屏（≤380px）顶栏拥挤、按钮挤压品牌名 | 收窄图标按钮与品牌字号 |
| 粗野风亮黄文字不可读 | 见 3.7 |
| 粗野暗色顶栏墨字隐形 | 见 3.7 |
| "关闭玻璃"仅去滤镜导致文字压背景 | `html.no-glass` 同时把半透明表面替换为不透明底色 |
| 倒计时单位分隔线误加到首项 | 选择器改为 `.unit + .unit` |
| 文章目录深链在异步渲染前滚动失败 | `scrollBehavior` 轮询等待锚点出现（最多 1.5s） |

---

## 4. 功能一致性：怎么验的

### 4.1 四层验证

**第 1 层 静态检查**

```bash
npx vue-tsc -b        # 0 error
npm run lint          # 0 error 0 warning
npm run build         # 产物 52 个 assets，预缓存 117 项
npm run verify:build  # dist 文件齐全 / 预缓存无缺失 / 51 个图片引用全部存在
```

**第 2 层 视觉矩阵**（`scripts/qa-visual.mjs`，Chrome headless + CDP）

4 风格 × 2 主题 × 12 页面 = **96 次页面加载**，逐张截图并收集控制台错误：

- 结果：**96 次加载 0 条控制台错误**；首页滚动高度在 3777–3984px 之间（四套风格版式差异合理，无塌陷或异常长页）
- 另出 8 张移动端截图（390×844，四风格 × 首页/相册）人工复核
- 人工复核过的重点：徽章形态、公告条、倒计时数字、筛选工具栏、文章头图与目录、设置页四张风格卡、
  404 页、搜索页、空收藏页、暗色对比度

**第 3 层 功能回归**（`scripts/qa-interact.mjs`，42 项断言，跑在生产包 + 无 Range 环境）

| # | 断言 | # | 断言 |
| --- | --- | --- | --- |
| 1 | 首页标题 | 22 | 文章目录渲染 |
| 2 | 首页班名 | 23 | 目录跳转滚动 |
| 3 | 今日打卡生效 | 24 | 阅读进度条出现 |
| 4 | 打卡写入本地（含累计） | 25 | 阅读位置恢复 |
| 5 | 风格面板打开 | 26 | 视频元素渲染 |
| 6 | 切换到 Japandi | 27 | 无 Range 时整段预载为 Blob |
| 7 | 风格写入本地设置 | 28 | 更多视频列出全部（9） |
| 8 | 切换到暗色 | 29 | 视频进度写入本地 |
| 9 | 搜索浮层打开 | 30 | 重新打开续播（12s） |
| 10 | 真实键入有结果（25 条） | 31 | 设置页切换风格 |
| 11 | Esc 关闭搜索 | 32 | 设置页切换暗色 |
| 12 | 相册列表渲染（5） | 33 | 粗野暗色文字色可读 |
| 13 | 分类筛选生效 | 34 | 字号切换 |
| 14 | 最早优先排序 | 35 | 强调色切换 |
| 15 | 瀑布流布局 | 36 | 外观开关存在（3） |
| 16 | 进入相册详情 | 37 | 关闭动效 |
| 17 | 灯箱打开 | 38 | 关闭玻璃 |
| 18 | 灯箱键盘切换 | 39 | 备份导入成功 |
| 19 | Esc 关闭灯箱 | 40 | 导入内容出现在列表 |
| 20 | 收藏写入本地 | 41 | 404 页面 |
| 21 | 收藏页展示 | 42 | 无横向溢出（4 风格 × 4 视口） |

结果：**42 / 42 通过**。

**第 4 层 离线回归**（`scripts/qa-offline.mjs`）

断网后刷新：**10 / 10 通过** —— SW 已激活（cache `cls2419-v2-<buildId>`）、117 项预缓存、
含 `index.html` 与 `theme-init.js`、含 57 张图片（相册/轮播/装饰）、离线首页可渲染（3 张卡片）、
离线子路由可渲染、离线图片可用（5/5 加载）。

### 4.2 为什么这足以支撑"功能完全一致"

1. **数据与业务层零改动**：`git diff main --name-only -- src` 的补集里，有 32 个文件与 `main` 完全一致——
   全部 `src/data/**`、全部 `src/utils/**`（数据源、备份校验、IndexedDB、Markdown、PWA）、
   以及 `content` / `interaction` / `ui` / `effects` 四个 store。**换句话说，本次没有碰任何"功能逻辑"**，
   只重写了"表现"。
2. **持久化契约不变**：`localStorage` 键名与结构（`cls2419:settings/checkin/favorites/videoProgress`）未改，
   旧用户的设置、打卡、收藏、观看进度原样可读；新增的 `style` 字段缺失时走迁移规则。
3. **备份格式不变**：`validate.ts` 未改，旧版导出的 JSON 仍可导入；回归脚本用一份 v2 备份实测通过。
4. **路由表逐条比对**：12 条路由的 path / name / meta.title 与 `main` 一致。

### 4.3 已知限制（未覆盖项，如实记录）

- 真机未测：iOS Safari、Firefox、微信内置浏览器、Android WebView 未做真机矩阵；兼容降级链
  （`compat.js` + 简化模式）沿用原实现，本次未改动其逻辑，但也未在新 UI 上逐台验证。
- 3D 班徽只在 Chrome（有 WebGL）与"强制无 WebGL"两条路径上验证过；Safari 的 WebGL 差异未实测。
- 视频行为在 Chrome + 自建服务器（有/无 Range）上验证；Safari 的 Range 行为差异未实测。
- 性能数据是**构建产物体积**与预缓存条目数，未做 Lighthouse 现场跑分（CI 环境噪声大，数值不可比）。
- 视觉回归以截图 + 人工复核为主，未接入像素级 diff（四套风格 × 明暗下，抗锯齿差异会产生大量假阳性）。

---

## 5. 体积与性能

### 5.1 首屏（首页，桌面，冷缓存，gzip）

| 资源 | `main` | 本分支 | 差值 |
| --- | --- | --- | --- |
| `index.js`（Vue 运行时 + 应用外壳） | 27.7 KB | 30.7 KB | +3.0 |
| `index.css`（令牌 + 4 套皮肤 + 基类） | 8.4 KB | 14.5 KB | +6.1 |
| `HomeView.js` | 6.6 KB | 7.3 KB | +0.7 |
| `HomeView.css` | 3.2 KB | 4.4 KB | +1.2 |
| **合计** | **45.8 KB** | **56.9 KB** | **+11.1 KB（+24%）** |

### 5.2 全站产物

| | `main` | 本分支 |
| --- | --- | --- |
| JS 合计（26 / 29 chunk） | 999.4 KB / gzip 300.8 KB | 1020.1 KB / gzip 309.3 KB |
| CSS 合计（22 / 23 文件） | 87.7 KB / gzip 24.0 KB | 134.3 KB / gzip 32.2 KB |
| three.js chunk | 660 KB / gzip 170 KB（动态 import） | 660.8 KB / gzip 169.7 KB（动态 import，仍不入预缓存） |
| SW 预缓存 | — | 117 项 / 1.0 MB |

### 5.3 取舍说明

- 四套皮肤的 CSS 是一次性成本：所有皮肤都进同一个 `index.css`，**换风格不发新请求、不闪白**。
  代价是首屏 CSS +6.1 KB gzip。
- 如果将来皮肤数量继续增长，改动点是「把非默认皮肤改为按需 `import()` + 预置一份占位变量」；
  当前 4 套的收益（省约 5–6 KB gzip）不值得引入这个失败模式，故**保持静态引入**。
- three.js 保持原有策略：动态 import + 排除预缓存。这样"从不进首页"或"关掉 3D"的访客不会为它付费，
  离线时它加载失败会退回静态徽章。

---

## 6. 使用与回滚

```bash
# 切到重写分支
git switch rewrite/design-system-v2

# 开发 / 构建 / 自检
npm run dev
npm run check          # lint + type-check + build + verify:build

# 自动化回归（三件套）
npm run qa:server      # 起一个不支持 Range 的静态服务器（验证视频降级路径）
npm run qa:interact -- --base http://127.0.0.1:4174 --expect-blob 1 --no-sw 1 --verbose 1
npm run qa:offline -- --base http://127.0.0.1:4174
npm run qa:visual -- --base http://localhost:5173      # 截图进 .qa/（已 gitignore）
```

回滚：`main` 从未被改动，`git switch main` 即回到重写前状态；本分支可整体丢弃，不影响任何已部署产物。

部署：与原来完全一致（`npm run build` 产出 `dist/`，`_headers` / `_redirects` / `esa.jsonc` 不变）。
选 GitHub Pages 子路径部署时仍用 `VITE_BASE=/仓库名/ npm run build`。

---

## 7. 后续可做

1. 皮肤 CSS 按需加载（4.3 第 2 条的阈值到了再做）。
2. 把 `qa-interact` 接进 CI（需要能跑 Chrome 的 runner），把它当"功能契约"守门。
3. 相册图片体积治理：目前是 SVG 占位图，换成真实照片后建议走 AVIF/WebP + 尺寸集，控制在预缓存预算内。
4. 真机矩阵：至少补 iOS Safari 与微信内置浏览器两条。
