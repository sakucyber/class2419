# 青春校园风格（Campus）接入说明

> 风格来源：`C:/Users/saku_cyber/Downloads/示例网页.html`（星辰中队·七年级 3 班示例页）
> 落地位置：`src/styles/skins/campus.css` + 各组件内的 `[data-style='campus']` 块
> 上一份总说明：`docs/REWRITE-REPORT.md`（本次是在那套设计系统上追加第 5 套风格）

---

## 0. 一句话结论

示例网页的「校园手账 / 黑板报」视觉被拆成**第 5 套风格 `campus`**，复用现有令牌体系落地，并设为默认风格。
class2419 的**内容、路由、数据结构、本地存储键、部署配置全部未动**；
其余 4 套风格的渲染结果**逐像素不变**（唯一例外是设置页——它必然多出一张风格卡）。

---

## 1. 应用范围与目标位置

示例页是单页静态稿，本站是 12 条路由的 SPA。所以只**借用视觉语言**，把它翻译成设计系统里的令牌与组件级覆盖：

| 示例网页里的元素 | 在本站的落点 | 实现方式 |
| --- | --- | --- |
| `body` 天蓝→米白渐变 + 26px 圆点纸纹 | `src/styles/index.css` | `[data-style='campus'] body` 两层 background，暗色换淡星光 |
| `.sky` 云朵 / 星星 / 纸飞机 | `components/common/AppBackground.vue` | 新增 campus 分支：3 云 + 4 星 + 1 飞机，纯 CSS 动画，`pointer-events:none` |
| `.nav` 悬浮胶囊导航 | `components/layout/AppHeader.vue` | 顶栏透明，胶囊画在 `.header-inner` 上（94% 宽、1.5px 蓝边、模糊底） |
| `.ticker` 黄底虚线公告条 | `components/layout/AppTicker.vue` | 亮黄底 + 上下 2px 白虚线 + 棕色文字 |
| `.sec-chip` 歪着的纸条标签 | `src/styles/base.css` `.kicker` | 白底胶囊、`rotate(-1.5deg)`、3px 实色投影 |
| `.uline` 手绘波浪下划线 | `src/styles/base.css` | `.section-header .title::after` 与 `.page-head .page-title::after` 共用一条 data-URI 波浪线 + 一次性 `scaleX` 动画 |
| `.board` 黑板班级名片 | `views/HomeView.vue` `.hero` | 11px 木框 + 深绿板面 + 内阴影，文字全部换成粉笔色 |
| `.note` 便签 | `views/HomeView.vue` `.count` | 浅黄便签 + 顶端胶带 + 极淡横线（便签被拉高时不像空黄块） |
| `.cork` 软木板 | `views/HomeView.vue` `.notice-list` | 木框 + 软木底色 + 圆点纹理 + 每条公告一枚图钉（`::before`） |
| `.polaroid` 拍立得 | `components/media/AlbumCard.vue` | 白相纸边 + 胶带 + 奇偶交错 ±1.2° 旋转，悬停回正 |
| `.stat` 数据卡 | `views/HomeView.vue` `.stats` | 黑板内一行粉笔数字，用虚线分隔 |
| 深绿板报页脚 | `components/layout/AppFooter.vue` | 顶部 10px 木框 + 深绿底 + 浅色字，打卡按钮改粉笔描边 |
| 黄色厚底边按钮 | `src/styles/skins/campus.css` | `--btn-shadow: 0 5px 0 #e8a23d`、按下 `translateY(3px)` |
| 圆章式班徽 | `components/effects/HeroBadge.vue` | 白底圆章 + 亮黄外圈 + 手账体「叁」（纯 CSS/SVG，3D 已移除） |
| 手写体标题 / 批注 | `src/styles/skins/campus.css` | `--font-display` 圆体栈、`--font-hand` 楷体栈（不外链，见第 4 节） |

**没有搬过来的东西**：示例里的「星辰中队 / 52 位同学 / 王老师 / 心愿墙表单 / 图书角 / 值日表」等全部内容，
以及它自己的 SVG 图标库、内联脚本（`IntersectionObserver` 浮现、数字滚动、口号轮换）。
本站的浮现动画仍走已有的 `v-reveal` 指令，图标仍走 `AppIcon` + 线性 SVG。

---

## 2. 改动清单

| 文件 | 改了什么 |
| --- | --- |
| `src/styles/skins/campus.css` | **新增**。整套配色 / 形态 / 字体令牌 + 暗色令牌（约 300 行） |
| `src/styles/index.css` | 引入 skin；新增 body 渐变与圆点纸纹（明暗两套） |
| `src/styles/base.css` | `.kicker` 纸条化、`.action-btn` 胶囊化、标题波浪下划线（SectionHeader 与 PageHeader 共用） |
| `src/types/index.ts` | `StyleKey` 增加 `'campus'` |
| `src/config/styles.ts` | 风格元数据增加一条（名称、英文名、说明、四色预览板） |
| `src/store/settings.ts` | 增加 `campus` 的主题色；默认风格改为 `campus`；补一条「无法识别的 style 归位」防御 |
| `public/theme-init.js` | 默认风格改为 `campus`；风格白名单与主题色同步 |
| `index.html` | `<html data-style>` 与 `theme-color` 的静态兜底改为 campus |
| `AppHeader / AppTicker / AppFooter / MobileNav / SectionHeader / CountdownTimer / CheckInButton / AlbumCard / VideoCard / ArticleCard / HeroBadge / AppBackground / HomeView` | 各加一段 `[data-style='campus']` 覆盖（形状、配色、字体、装饰） |
| `SettingsView` | 「四种风格共用…」改为按 `STYLE_OPTIONS.length` 渲染，避免以后再加风格时文案过期 |
| `StyleSwitcher` | 面板加 `max-height: min(70vh, 460px)`，5 项在矮屏上不顶出视口 |
| `scripts/qa-visual.mjs` / `qa-interact.mjs` | 风格清单加入 `campus`，回归覆盖 5 套 |

篇幅上：`skins/` 从 657 行增至约 960 行；组件内的 campus 覆盖约 420 行。

---

## 3. 明确没有改的部分（可逐项核对）

- `src/data/**`：相册 5、视频 10、文章 5、公告 2、荣誉 6、轮播 4、班级信息、时间线数据 —— 一个字节没动。
- `src/utils/**`、`store/content.ts`、`store/interaction.ts`、`store/ui.ts`：数据源、备份校验、IndexedDB、Markdown、PWA 逻辑未改。
- 路由表 12 条、`meta.title`、`mainNav`/`bottomNav` 结构未改。
- 本地存储键与结构未改（`cls2419:settings / checkin / favorites / videoProgress`）。
- 部署配置（`_headers`、`_redirects`、`esa.jsonc`、`vite.config.ts` 的 base/CSP/预缓存策略）未改。
- 另外 4 套风格（纸质年鉴 / Japandi / 硬边杂志 / 原版）的令牌与覆盖规则均未改。

---

## 4. 字体为什么不是原样外链

示例页用 Google Fonts 的 `ZCOOL KuaiLe`（标题）与 `Ma Shan Zheng`（手写）。
本站**不能**照抄，原因是三条硬约束：

1. CSP 是 `font-src 'self' data:`，外链字体会被浏览器拦掉；
2. 站点是离线优先 PWA，预缓存里放中文字体是几 MB 级别，会挤爆 1 MB 的预算；
3. 首屏多一次跨域请求，正好卡在最关键的路径上。

所以 `campus` 的两条字体栈都写成「本机有就用，没有就退到气质接近的系统字」：

```css
--font-display: 'ZCOOL KuaiLe', 'Yuanti SC', 'YouYuan', '幼圆', 'PingFang SC', 'Microsoft YaHei', sans-serif;
--font-hand: 'Ma Shan Zheng', 'Kaiti SC', 'KaiTi', 'STKaiti', '楷体', 'Xingkai SC', cursive;
```

- Windows 中文环境一般命中「幼圆 / 楷体」，macOS 命中「Yuanti SC / Kaiti SC」，都能表达手账感；
- 都没命中时退到黑体，版式（圆角、便签、黑板、软木板）仍然成立。

如果以后确实要统一字形，推荐做法是**子集化**：只打包首页与标题用到的 300~500 个字，约 60~120 KB woff2，
自托管到 `public/fonts/`（CSP 已允许 `self`），再把它加入预缓存清单。

---

## 5. 默认风格与回退

示例风格被设为默认（新访客第一眼就是它）。改动只有三处，且互相一致：

| 位置 | 值 |
| --- | --- |
| `src/store/settings.ts` `DEFAULTS.style` | `'campus'` |
| `public/theme-init.js` `DEFAULT_STYLE` | `'campus'` |
| `index.html` `<html data-style>` + `theme-color` | `campus` / `#dff0fb` |

行为规则（保持向后兼容）：

- 本地**已有** `style` 字段的用户：沿用自己选的风格，不会被强制切换；
- 本地**没有** `style` 字段的更老存档：升级为 `campus`（同时把旧的默认蓝强调色归为 `auto`）；
- 无法识别的脏值：归位到默认风格，不会出现"无皮肤"裸样式。

想切回纸质年鉴：把上面三处的 `'campus'` 换成 `'annual'`（`theme-color` 换成 `#faf9f6`）即可，一条命令都不用改逻辑。

---

## 6. 验证

### 6.1 静态检查

```bash
npx vue-tsc -b        # 0 error
npm run lint          # 0 error
npm run build         # 预缓存 117 项 / 1.0 MB
npm run verify:build  # dist 齐全、图片引用 51 个全部存在
```

### 6.2 视觉：5 风格 × 2 主题 × 12 页 = 120 次页面加载

- **0 条控制台错误**；另出 10 张移动端截图（5 风格 × 首页/相册）人工复核。
- 人工复核并修掉的问题：移动端班名被省略号截断、页脚打卡按钮在深绿底上几乎看不见、
  倒计时便签被拉高后下半截是空黄块、纸飞机挡住页头标签、内页标题缺下划线。

### 6.3 与改动前的逐像素对比

把本次截图与改动前的基线（`.qa/final`，同样 1440×1000、同脚本）做逐像素差：

| 分组 | 张数 | 平均差 | 结论 |
| --- | --- | --- | --- |
| 其他 4 风格的 11 个内容页（明暗各一套） | 88 | **0.000** | 完全一致 |
| 其他 4 风格的首页 | 8 | 0.10 – 0.52（0.03%–0.15% 像素） | 仅 3D 班徽的旋转相位不同，非样式改动 |
| 其他 4 风格的设置页 | 8 | 4.4 – 5.3（8%–10% 像素） | **预期变化**：多出第 5 张风格卡 |

这张表就是"其余风格未被这次改动影响"的证据。

### 6.4 功能回归：42 / 42

生产包 + 故意忽略 `Range` 的服务器（复现视频整段预载为 Blob 的降级路径），
覆盖打卡、搜索、筛选排序、灯箱、收藏、文章目录与阅读位置、视频续播、备份导入、404，
以及 **5 套风格 × 4 个视口（360/390/768/1440）的横向溢出检查** —— 全部通过。

### 6.5 离线回归：10 / 10

`cls2419-v2-<buildId>` 缓存 117 项 / 1.0 MB；断网刷新首页与子路由均可渲染，
离线首页的 `data-style` 为 `campus`（新默认已生效）。

### 6.6 体积代价

| 资源 | 接入前 | 接入后 | 差值 |
| --- | --- | --- | --- |
| `index.css`（含全部皮肤） gzip | 14.5 KB | 17.4 KB | +2.9 KB |
| `HomeView.css` gzip | 4.4 KB | 5.4 KB | +1.1 KB |
| `index.js` gzip | 30.7 KB | 31.3 KB | +0.6 KB |
| **首页首屏合计** gzip | **56.9 KB** | **61.5 KB** | **+4.6 KB（+8%）** |

和上一轮一样，皮肤全部静态引入：换风格不发新请求、不闪白。5 套皮肤仍在预算内（全站 CSS gzip 36.8 KB）。

---

## 7. 已知限制

- **字体依赖本机**：没装幼圆/楷体的设备会退到黑体，手账感会弱一些（原因与替代方案见第 4 节）。
- **暗色模式下装饰减弱**：云朵压到 16% 不透明度、纸飞机只留描边，避免夜里发白。
- **手绘下划线不做滚动描边**：示例用 `IntersectionObserver` 在进入视口时描边；这里改成进场一次性动画，
  不引入额外观察器（关闭动效时直接显示为完整线条）。
- **移动端底部导航是悬浮胶囊**：比通栏多占 8px，页脚已补 16px 内边距，但页面最底部滚动时内容仍会从胶囊两侧经过（与示例的悬浮导航一致）。
- **班徽是静态的**：3D 版本已整体移除，五套风格都只渲染 CSS/SVG 班徽（详见 `docs/REMOVE-3D.md`）。
