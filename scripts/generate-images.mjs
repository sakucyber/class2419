/**
 * 生成站点所需的全部 SVG 占位图（无文字的抽象渐变构图），保证离线可用。
 * 用法：npm run generate:images
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'images')

/** mulberry32 伪随机，保证每次生成结果一致 */
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const palettes = [
  ['#2563eb', '#10b981'],
  ['#0ea5e9', '#6366f1'],
  ['#f97316', '#fbbf24'],
  ['#14b8a6', '#3b82f6'],
  ['#8b5cf6', '#ec4899'],
  ['#22c55e', '#84cc16'],
  ['#ef4444', '#f97316'],
  ['#06b6d4', '#2563eb'],
  ['#e11d48', '#8b5cf6'],
  ['#0891b2', '#16a34a'],
]

function pick(rand, arr) {
  return arr[Math.floor(rand() * arr.length) % arr.length]
}

/**
 * 无文字的抽象构图。三种母题轮换（motif），避免满屏卡片都是同一套装饰：
 *   0 = 柔光球 + 圆环（原方案）
 *   1 = 斜向半透明条带
 *   2 = 同心弧 + 一团柔光
 * `scrim` 会在底部压一层暗角，卡片封面的底部徽标与整体层次都更稳。
 */
function svg({ w, h, seed, motif = 0, scrim = false }) {
  const rand = rng(seed)
  const [c1, c2] = pick(rand, palettes)
  const angle = Math.floor(rand() * 90)
  const id = `g${seed}`
  const parts = []
  const minSide = Math.min(w, h)

  if (motif === 0) {
    // 三个柔光圆
    for (let i = 0; i < 3; i++) {
      const cx = Math.floor(rand() * 100)
      const cy = Math.floor(rand() * 100)
      const r = Math.floor(rand() * 28) + 14
      const op = (0.1 + rand() * 0.1).toFixed(2)
      parts.push(`<circle cx="${cx}%" cy="${cy}%" r="${r}" fill="#ffffff" opacity="${op}"/>`)
    }
    // 一个描边圆环
    parts.push(
      `<circle cx="${Math.floor(rand() * 90 + 5)}%" cy="${Math.floor(rand() * 90 + 5)}%" r="${Math.floor(rand() * 16 + 10)}" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="${Math.max(2, Math.round(w / 300))}"/>`,
    )
    // 一块旋转圆角矩形
    const rw = Math.floor(rand() * 30 + 20)
    const rh = Math.floor(rand() * 22 + 12)
    parts.push(
      `<rect x="${Math.floor(rand() * 70)}%" y="${Math.floor(rand() * 70)}%" width="${rw}" height="${rh}" rx="${Math.min(rw, rh) / 2}" fill="#ffffff" opacity="0.1" transform="rotate(${Math.floor(rand() * 60 - 30)} ${Math.floor(rand() * 100)}% ${Math.floor(rand() * 100)}%)"/>`,
    )
  } else if (motif === 1) {
    // 斜向条带：整体统一旋转，形成斜纹织物感
    const count = 4 + Math.floor(rand() * 3)
    for (let i = 0; i < count; i++) {
      const bw = w * (0.04 + rand() * 0.09)
      const x = rand() * w * 1.15 - w * 0.1
      const op = (0.035 + rand() * 0.05).toFixed(3)
      parts.push(
        `<rect x="${x.toFixed(0)}" y="${-h * 0.35}" width="${bw.toFixed(0)}" height="${h * 1.7}" fill="#ffffff" opacity="${op}" transform="rotate(19 ${(w / 2).toFixed(0)} ${(h / 2).toFixed(0)})"/>`,
      )
    }
    // 一条更实的高光条，给画面一个焦点
    parts.push(
      `<rect x="${(w * 0.62).toFixed(0)}" y="${-h * 0.35}" width="${(w * 0.05).toFixed(0)}" height="${h * 1.7}" fill="#ffffff" opacity="0.12" transform="rotate(19 ${(w / 2).toFixed(0)} ${(h / 2).toFixed(0)})"/>`,
    )
  } else {
    // 同心弧（圆心在画布内偏一侧），叠加一团柔光
    const cx = w * (0.18 + rand() * 0.3)
    const cy = h * (0.28 + rand() * 0.4)
    for (let i = 0; i < 3; i++) {
      parts.push(
        `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${(minSide * (0.34 + i * 0.24)).toFixed(0)}" fill="none" stroke="#ffffff" stroke-opacity="${(0.15 - i * 0.035).toFixed(3)}" stroke-width="${Math.max(1.5, w / 420).toFixed(1)}"/>`,
      )
    }
    parts.push(
      `<circle cx="${(w * 0.72).toFixed(0)}" cy="${(h * 0.28).toFixed(0)}" r="${(minSide * 0.42).toFixed(0)}" fill="#ffffff" opacity="0.08"/>`,
    )
  }

  // 点阵装饰（位置随母题变，避免总是同一角落）
  const dotR = Math.max(1.5, w / 500)
  const step = w / 28
  const anchor = motif === 2 ? { x: 0.12, y: 0.68 } : { x: 0.4, y: 0.16 }
  let dots = ''
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 5; c++) {
      dots += `<circle cx="${(w * anchor.x + c * step).toFixed(1)}" cy="${(h * anchor.y + r * step).toFixed(1)}" r="${dotR}" fill="#ffffff" opacity="0.25"/>`
    }
  }

  const scrimDef = scrim
    ? `<linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.45" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.4"/>
    </linearGradient>`
    : ''
  const scrimRect = scrim ? `<rect width="${w}" height="${h}" fill="url(#${id}s)"/>` : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-hidden="true">
  <defs>
    <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(${angle} .5 .5)">
      <stop offset="0" stop-color="${c1}"/>
      <stop offset="1" stop-color="${c2}"/>
    </linearGradient>
    ${scrimDef}
  </defs>
  <rect width="${w}" height="${h}" fill="url(#${id})"/>
  ${parts.join('\n  ')}
  ${dots}
  ${scrimRect}
</svg>
`
}

/**
 * 首页 hero 背景：**固定配色**（蓝 → 翠绿）。
 * 它不参与随机调色板 —— 否则每次跑生成器，首页主视觉都可能换色。
 */
function heroBg(w, h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-hidden="true">
  <defs>
    <linearGradient id="hero" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(42 .5 .5)">
      <stop offset="0" stop-color="#2563eb"/>
      <stop offset="1" stop-color="#10b981"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#hero)"/>
  <circle cx="90%" cy="27%" r="15" fill="#ffffff" opacity="0.14"/>
  <circle cx="71%" cy="71%" r="24" fill="#ffffff" opacity="0.12"/>
  <circle cx="56%" cy="7%" r="26" fill="#ffffff" opacity="0.10"/>
</svg>
`
}

function write(rel, w, h, seed, opts = {}) {
  const file = join(outDir, rel)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, svg({ w, h, seed, ...opts }), 'utf8')
}

/**
 * 轮播长幅（16:6）。
 *
 * 与相册封面不同，这里有两处专门处理：
 * 1. 渐变方向是「左下暗 → 右上亮」：Carousel 的标题压在**左下角**，
 *    亮色放在右上才不会把白色标题冲掉。
 * 2. 额外叠一层底部压暗渐变兜底，避免换配色后标题再次不可读。
 */
function banner({ w, h, dark, mid, bright, seed }) {
  const rand = rng(seed)
  const id = `b${seed}`

  // 右上角点阵
  const gap = 28
  let dots = ''
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 10; c++) {
      dots += `<circle cx="${w - 80 - (9 - c) * gap}" cy="${58 + r * gap}" r="2.2" fill="#ffffff" opacity="0.22"/>`
    }
  }

  // 两圈大弧线（部分出界），给长条一点结构感
  const arcs = `
  <circle cx="${(w * 0.78).toFixed(0)}" cy="${(h * 0.5).toFixed(0)}" r="${(h * 0.62).toFixed(0)}" fill="none" stroke="#ffffff" stroke-opacity="0.1" stroke-width="2"/>
  <circle cx="${(w * 0.78).toFixed(0)}" cy="${(h * 0.5).toFixed(0)}" r="${(h * 0.92).toFixed(0)}" fill="none" stroke="#ffffff" stroke-opacity="0.06" stroke-width="2"/>`

  const glows = [0.16, 0.1]
    .map((op, i) => {
      const cx = Math.floor(58 + rand() * 30)
      const cy = Math.floor(12 + rand() * 30)
      const r = Math.floor(20 + rand() * 14)
      return `<circle cx="${cx}%" cy="${cy}%" r="${r}%" fill="${i === 0 ? bright : '#ffffff'}" opacity="${op}"/>`
    })
    .join('\n  ')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-hidden="true">
  <defs>
    <linearGradient id="${id}" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="${dark}"/>
      <stop offset="0.52" stop-color="${mid}"/>
      <stop offset="1" stop-color="${bright}"/>
    </linearGradient>
    <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.3" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.5"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#${id})"/>
  ${arcs}
  ${glows}
  ${dots}
  <rect width="${w}" height="${h}" fill="url(#${id}s)"/>
</svg>
`
}

/** 现有数据引用的是 carousel/test-N.svg（不是 slide-N.svg），生成器要与实际引用对齐 */
const banners = [
  { dark: '#0a1220', mid: '#1e3a8a', bright: '#22d3ee' },
  { dark: '#170f26', mid: '#6d28d9', bright: '#e879b0' },
  { dark: '#071c17', mid: '#0d9488', bright: '#34d399' },
  { dark: '#1b1020', mid: '#b45309', bright: '#f59e0b' },
]

// 轮播图 16:6（写 test-N.svg，与 src/data/carousel.json 的引用一致）
banners.forEach((b, i) => {
  const file = join(outDir, `carousel/test-${i + 1}.svg`)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, banner({ w: 1600, h: 600, ...b, seed: 3000 + i * 13 }), 'utf8')
})

// 相册（混合竖版/横版，营造瀑布流效果）
const albums = [
  ['jxsg', 8],
  ['ydydh', 8],
  ['ydwh', 8],
  ['cryx', 7],
  ['jcr', 6],
]
let seed = 2000
albums.forEach(([key, count]) => {
  for (let i = 1; i <= count; i++) {
    const portrait = i % 3 === 1
    const s = seed++
    write(`albums/${key}-${i}.svg`, portrait ? 900 : 1200, portrait ? 1200 : 800, s, {
      // 母题按 **全局 seed** 取模，不是按相册内序号 ——
      // 每本相册的封面都是第 1 张，若用 i % 3 会全部落到同一个母题上。
      motif: s % 3,
      scrim: true,
    })
  }
})

// 视频封面 16:9
for (let i = 1; i <= 6; i++) {
  const vs = 3000 + i * 13
  write(`videos/cover-${i}.svg`, 1280, 720, vs, { motif: vs % 3, scrim: true })
}

// 文章封面 1200:630
for (let i = 1; i <= 5; i++) {
  const as = 4000 + i * 17
  write(`articles/cover-${i}.svg`, 1200, 630, as, { motif: as % 3, scrim: true })
}

// 首页班级名片背景：固定配色，不走随机调色板
writeFileSync(join(outDir, 'misc/class-card-bg.svg'), heroBg(1200, 800), 'utf8')

console.log('All images regenerated (text-free).')
