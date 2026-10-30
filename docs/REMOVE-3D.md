# 移除 3D 效果（含 3D 班徽）

> 触发：用户要求「将 3D 效果移除（包括 3D 徽章）」。
> 结果：three.js 与整套设备分级 / FPS 自动降级 / 特效等级设置一并删除，班徽改为纯 CSS/SVG。

---

## 1. 删掉了什么

| 对象 | 说明 |
| --- | --- |
| `src/components/effects/three/badgeScene.ts` | WebGL 场景：星章、圆牌、方形浮雕牌三种几何体 + 材质 + 渲染循环（打包后 660.8 KB / gzip 169.7 KB） |
| `src/utils/webgl.ts` | 场景创建、渲染器、上下文丢失处理 |
| `src/store/effects.ts` | 特效等级（L0/L1/L2）、3D 开关、GPU/CPU/内存探测、电池信息、FPS 采样与 6 级自动降级 |
| `src/utils/perf.ts` 的 90% | 设备评分、WebGL 探测、`FpsMonitor`、电池修正；只保留 PWA 还在用的 `isMobile()`（473 行 → 24 行） |
| `package.json` 依赖 | `three`、`@types/three`（`node_modules` 与 `package-lock.json` 同步清理） |
| 设置页「特效与性能」整块 | 特效等级 4 个按钮、3D 场景开关、设备检测详情（评分 / 核心 / 内存 / WebGL2 / 显卡）、提示语 |
| `HeroBadge.vue` 的 3D 逻辑 | canvas、动态 import、`phase` 状态机、风格变化重建、指针倾斜（tilt）、`is-3d` / `badge-canvas` 样式 |
| `vite.config.ts` 的 three 特例 | 预缓存跳过规则（`PRECACHE_SKIP`）与 `manualChunks` 里排除 three 的分支 |

## 2. 替换成了什么

班徽现在只有一份**纯 CSS/SVG** 实现：

- 年鉴：方形描边框 + 衬线「叁」；
- Japandi：圆形鼠尾草绿勋章；
- 校园：白底圆章 + 亮黄外圈 + 手账体「叁」；
- 硬边杂志：黑底黄字方块 + 蓝色硬投影；
- 原版：深色星章（渐变描边 + 十二颗小星）。

形态全部由 `--badge-*` 令牌与 `[data-style]` 覆盖决定，**没有 canvas、没有动态 import、没有运行时动画**，
首屏直接可见 —— 也消除了原来「先静态、后 3D 淡入」的 520ms 闪烁。

顺带修掉一个只有 3D 消失后才会暴露的 bug：粗野风亮色主题下 `--accent-ink` 是墨色，
班号「19」压在黑底方块上等于看不见（以前被 3D 浮雕牌盖住了）。现已固定用强调黄。

## 3. 行为影响（如实说明）

- **没有 3D 了**：首页不再有跟随鼠标/自动摆动的徽章，所有设备看到的都是同一张静态班徽。
- **设置页少了「特效与性能」**：外观开关从 3 个变 2 个（页面动效、液态玻璃），功能回归里对应断言已按 2 校验。
- **打卡粒子**改为只受「页面动效」开关控制（原来还受特效等级影响）。
- **老存档**里 `cls2419:effects` 这个键会变成孤儿数据，不被读取也不再写入；留着无害，用户重置设置时不会被清理（因为重置只清 `settings` 与内容）。
- 旧浏览器简化模式（`compat.js`）不受影响，仍通过 `<html class="is-legacy-browser">` 做纯样式降级。

## 4. 验证

| 项 | 结果 |
| --- | --- |
| `vue-tsc -b` / `eslint .` | 0 error / 0 warning |
| 构建 | 成功；产物里已无 `badgeScene` chunk，`grep -l "THREE\|WebGLRenderingContext" dist/assets/*.js` 无命中 |
| 功能回归 | 42 / 42（生产包 + 无 Range 服务器，含 5 风格 × 4 视口溢出） |
| 离线回归 | 10 / 10（117 项预缓存 1.0 MB，未受影响） |
| 视觉矩阵 | 5 风格 × 2 主题 × 12 页 = 120 次加载，0 条控制台错误 |
| 与移除前逐像素对比 | 120 张里 99 张**完全一致**（其余 21 张：10 张首页班徽、8 张视频详情播放帧、3 张设置页——后两类见下） |

关于那 21 张不一致的：

- **首页 10 张**：班徽从 3D 画布换成静态图，属于本次改动的目标结果；
- **视频详情 8 张**：视频首帧解码时机不同（同一份代码重跑两次也会有 ±0.25 的均值差），非样式改动；
- **设置页 3 张**：删掉「特效与性能」整块，页面变短，属于预期；
- 另有 1 张 `campus-light-videos-top` 是截图偶发的黑帧（重拍后与移除前**完全一致**，均值 0.0），已在 `qa-visual.mjs` 里加了「目标被导航/关闭」的自动重试。

## 5. 体积变化

| 指标 | 移除前 | 移除后 | 差值 |
| --- | --- | --- | --- |
| 全站 JS（raw） | ≈ 1.02 MB | 346 KB | **−674 KB** |
| 全站 JS（gzip） | ≈ 309 KB | 135 KB | **−174 KB** |
| 首页首屏（gzip，index + HomeView 的 JS/CSS） | 61.5 KB | **56.5 KB** | −5.0 KB（−8%） |
| 首屏 chunk 数 | 5（含延迟加载的 3D） | 4 | 少一次 660 KB 的潜在请求 |
| SW 预缓存 | 117 项 / 1.0 MB | 117 项 / 1.0 MB | 不变（3D 本来就被排除在预缓存外） |

## 6. 想恢复 3D 的话

代码在 `bac5963` 之前的历史里（`src/components/effects/three/badgeScene.ts`、`src/utils/webgl.ts`、`src/store/effects.ts`），
`git show <commit>:<path>` 可取回。恢复时需要同步：

1. 依赖加回 `three` / `@types/three`；
2. `vite.config.ts` 恢复 three 的 `manualChunks` 排除与预缓存跳过；
3. 设置页恢复「特效与性能」区块（或至少恢复 3D 开关）；
4. `HeroBadge.vue` 恢复 canvas 与分级逻辑。

不建议只恢复一半（例如留着 3D 但删掉降级链）：弱机滚动首页时帧率会明显掉。
