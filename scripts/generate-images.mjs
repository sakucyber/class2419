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

// 轮播图 16:6
;['slide-1', 'slide-2', 'slide-3', 'slide-4'].forEach((name, i) =>
  write(`carousel/${name}.svg`, 1600, 600, 1000 + i * 7),
)

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
