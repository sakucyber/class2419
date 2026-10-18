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

/** 无文字的抽象构图：渐变底 + 光斑圆 + 圆环 + 斜向色块 + 点阵 */
function svg({ w, h, seed }) {
  const rand = rng(seed)
  const [c1, c2] = pick(rand, palettes)
  const angle = Math.floor(rand() * 90)
  const id = `g${seed}`
  const parts = []

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
  // 点阵装饰
  const dotR = Math.max(1.5, w / 500)
  let dots = ''
  const dx = Math.floor(rand() * 70 + 10)
  const dy = Math.floor(rand() * 70 + 10)
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 5; c++) {
      dots += `<circle cx="${dx + c * dotR * 6}%" cy="${dy + r * dotR * 6}" r="${dotR}" fill="#ffffff" opacity="0.22"/>`
    }
  }
  // 点阵坐标用绝对值更稳：改为固定步进像素
  dots = ''
  const gx = (w * dx) / 100
  const gy = (h * dy) / 100
  const step = w / 28
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 5; c++) {
      dots += `<circle cx="${(gx + c * step).toFixed(1)}" cy="${(gy + r * step).toFixed(1)}" r="${dotR}" fill="#ffffff" opacity="0.25"/>`
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-hidden="true">
  <defs>
    <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(${angle} .5 .5)">
      <stop offset="0" stop-color="${c1}"/>
      <stop offset="1" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#${id})"/>
  ${parts.join('\n  ')}
  ${dots}
</svg>
`
}

function write(rel, w, h, seed) {
  const file = join(outDir, rel)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, svg({ w, h, seed }), 'utf8')
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
    write(`albums/${key}-${i}.svg`, portrait ? 900 : 1200, portrait ? 1200 : 800, seed++)
  }
})

// 视频封面 16:9
for (let i = 1; i <= 6; i++) write(`videos/cover-${i}.svg`, 1280, 720, 3000 + i * 13)

// 文章封面 1200:630
for (let i = 1; i <= 5; i++) write(`articles/cover-${i}.svg`, 1200, 630, 4000 + i * 17)

// 首页班级名片背景
write('misc/class-card-bg.svg', 1200, 800, 5000)

console.log('All images regenerated (text-free).')
