/**
 * 3D 班级徽章场景（Three.js）。
 *
 * ⚠️ 只有本目录下的文件允许静态 import three。
 * 它只能经 `utils/webgl.ts` 的动态 import 进入，从而保证 three 落在独立的异步 chunk 里。
 *
 * 两种几何体：
 *   star   —— 原版风格的圆形星章（保留给 legacy）
 *   plaque —— 方形浮雕牌，正面是运行时用 canvas 画出的班号（年鉴/日式/粗野）
 *
 * 两个刻意的取舍（都是实测后定的，别轻易改回去）：
 * 1) 不用 EffectComposer / UnrealBloomPass：画布必须透明，而 Composer 的输出会丢掉
 *    alpha，叠在卡片上就是一块黑方块。改用 emissive 材质 + IBL 反射做金属质感。
 * 2) 自转改为小幅摆动：连续旋转必然经过侧对镜头的角度，观感很差。
 */
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import type { CreateSceneOptions, SceneHandle, SceneQuality } from '@/utils/webgl'

interface BadgeParts {
  root: THREE.Group
  disposables: Array<THREE.BufferGeometry | THREE.Material | THREE.Texture>
}

type Palette = NonNullable<CreateSceneOptions['palette']>

/** 生成圆形星章：主体圆盘 + 外环 + 内环 + 挤出星形 + 一圈铆钉 */
function buildStar(quality: SceneQuality, palette: Palette): BadgeParts {
  const root = new THREE.Group()
  const disposables: BadgeParts['disposables'] = []

  const metal = new THREE.MeshStandardMaterial({
    color: palette.line,
    metalness: 1,
    roughness: 0.26,
    emissive: new THREE.Color(palette.line).multiplyScalar(0.16),
  })
  const deep = new THREE.MeshStandardMaterial({
    color: palette.side,
    metalness: 0.55,
    roughness: 0.42,
  })
  const accent = new THREE.MeshStandardMaterial({
    color: palette.accent,
    metalness: 0.7,
    roughness: 0.3,
    emissive: new THREE.Color(palette.accent).multiplyScalar(0.42),
  })
  disposables.push(metal, deep, accent)

  const discGeo = new THREE.CylinderGeometry(1, 1, 0.14, Math.round(96 * quality.detail), 1)
  const disc = new THREE.Mesh(discGeo, deep)
  disc.rotation.x = Math.PI / 2
  root.add(disc)
  disposables.push(discGeo)

  const ringGeo = new THREE.TorusGeometry(1.06, 0.05, 16, Math.round(128 * quality.detail))
  const ring = new THREE.Mesh(ringGeo, metal)
  root.add(ring)
  disposables.push(ringGeo)

  const innerGeo = new THREE.TorusGeometry(0.78, 0.02, 12, Math.round(96 * quality.detail))
  const inner = new THREE.Mesh(innerGeo, accent)
  inner.position.z = 0.09
  root.add(inner)
  disposables.push(innerGeo)

  const star = new THREE.Shape()
  const outer = 0.42
  const innerR = 0.18
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? outer : innerR
    const a = (Math.PI / 5) * i - Math.PI / 2
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    if (i === 0) star.moveTo(x, y)
    else star.lineTo(x, y)
  }
  star.closePath()
  const starGeo = new THREE.ExtrudeGeometry(star, {
    depth: 0.1,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: quality.detail >= 1 ? 3 : 1,
    curveSegments: Math.round(12 * quality.detail),
  })
  const starMesh = new THREE.Mesh(starGeo, metal)
  starMesh.position.z = 0.1
  root.add(starMesh)
  disposables.push(starGeo)

  const studCount = Math.round(12 * quality.detail)
  const studGeo = new THREE.SphereGeometry(0.035, 10, 10)
  disposables.push(studGeo)
  for (let i = 0; i < studCount; i += 1) {
    const a = (Math.PI * 2 * i) / studCount
    const stud = new THREE.Mesh(studGeo, accent)
    stud.position.set(Math.cos(a) * 0.92, Math.sin(a) * 0.92, 0.1)
    root.add(stud)
  }

  return { root, disposables }
}

function toCssHex(value: number): string {
  return `#${value.toString(16).padStart(6, '0')}`
}

/** 把班号画到 canvas 上，作为牌面贴图。circle 用于 Japandi 的圆形牌 */
function makeFaceTexture(
  palette: Palette,
  glyph: string,
  sub: string,
  shape: 'square' | 'circle',
): THREE.CanvasTexture {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.CanvasTexture(canvas)

  const paper = toCssHex(palette.paper)
  const ink = toCssHex(palette.ink)
  const accent = toCssHex(palette.accent)
  const line = toCssHex(palette.line)

  if (shape === 'circle') {
    // 圆柱顶面的 UV 是一个内切圆；直接画满整个画布即可被裁成圆形
    ctx.fillStyle = paper
    ctx.fillRect(0, 0, size, size)
    ctx.strokeStyle = line
    ctx.lineWidth = 10
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, 242, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = accent
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, 222, 0, Math.PI * 2)
    ctx.stroke()
  } else {
    ctx.fillStyle = paper
    ctx.fillRect(0, 0, size, size)
    ctx.strokeStyle = ink
    ctx.lineWidth = 8
    ctx.strokeRect(22, 22, size - 44, size - 44)
    ctx.strokeStyle = line
    ctx.lineWidth = 2
    ctx.strokeRect(42, 42, size - 84, size - 84)
  }

  ctx.fillStyle = ink
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `600 ${glyph.length > 1 ? 190 : 230}px "Noto Serif SC", "Songti SC", SimSun, serif`
  ctx.fillText(glyph, size / 2, size / 2 - 12)

  ctx.font = '600 22px "Noto Sans SC", "Microsoft YaHei", sans-serif'
  ctx.fillStyle = accent
  ;(ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '6px'
  ctx.fillText(sub, size / 2, size - 74)
  return new THREE.CanvasTexture(canvas)
}

/** 生成方形浮雕牌：金属底板 + canvas 贴图正面 + 四角铆钉 */
function buildPlaque(
  quality: SceneQuality,
  palette: Palette,
  glyph: string,
  sub: string,
): BadgeParts {
  const root = new THREE.Group()
  const disposables: BadgeParts['disposables'] = []

  const bodyMat = new THREE.MeshStandardMaterial({
    color: palette.side,
    metalness: 0.85,
    roughness: 0.34,
  })
  const faceTexture = makeFaceTexture(palette, glyph, sub, 'square')
  faceTexture.colorSpace = THREE.SRGBColorSpace
  // 牌面是「印刷品」：用 Basic 材质，避免强光把纸面和文字洗白
  const faceMat = new THREE.MeshBasicMaterial({ map: faceTexture, toneMapped: false })
  const metalMat = new THREE.MeshStandardMaterial({
    color: palette.line,
    metalness: 0.95,
    roughness: 0.28,
    emissive: new THREE.Color(palette.line).multiplyScalar(0.08),
  })
  disposables.push(bodyMat, faceMat, metalMat, faceTexture)

  const bodyGeo = new THREE.BoxGeometry(1.94, 1.94, 0.16)
  const body = new THREE.Mesh(bodyGeo, bodyMat)
  root.add(body)
  disposables.push(bodyGeo)

  const faceGeo = new THREE.PlaneGeometry(1.8, 1.8)
  const face = new THREE.Mesh(faceGeo, faceMat)
  face.position.z = 0.081
  root.add(face)
  disposables.push(faceGeo)

  const studGeo = new THREE.SphereGeometry(0.038, 12, 12)
  disposables.push(studGeo)
  const offsets: Array<[number, number]> = [
    [-0.86, -0.86],
    [0.86, -0.86],
    [-0.86, 0.86],
    [0.86, 0.86],
  ]
  const cornerCount = quality.detail >= 0.8 ? offsets.length : 0
  for (let i = 0; i < cornerCount; i += 1) {
    const [x, y] = offsets[i]
    const stud = new THREE.Mesh(studGeo, metalMat)
    stud.position.set(x, y, 0.1)
    root.add(stud)
  }

  return { root, disposables }
}

/** 生成圆形牌（Japandi）：圆柱 + 圆形贴图 + 一圈细边 */
function buildDisc(
  quality: SceneQuality,
  palette: Palette,
  glyph: string,
  sub: string,
): BadgeParts {
  const root = new THREE.Group()
  const disposables: BadgeParts['disposables'] = []

  const sideMat = new THREE.MeshStandardMaterial({
    color: palette.side,
    metalness: 0.4,
    roughness: 0.5,
  })
  const bottomMat = new THREE.MeshStandardMaterial({
    color: palette.side,
    metalness: 0.4,
    roughness: 0.55,
  })
  const faceTexture = makeFaceTexture(palette, glyph, sub, 'circle')
  faceTexture.colorSpace = THREE.SRGBColorSpace
  // 圆柱顶盖的 UV 相对画面旋转了 90°，不转回来「叁」会躺倒
  faceTexture.center.set(0.5, 0.5)
  faceTexture.rotation = Math.PI / 2
  const faceMat = new THREE.MeshBasicMaterial({ map: faceTexture, toneMapped: false })
  const ringMat = new THREE.MeshStandardMaterial({
    color: palette.line,
    metalness: 0.8,
    roughness: 0.35,
  })
  disposables.push(sideMat, bottomMat, faceMat, ringMat, faceTexture)

  const discGeo = new THREE.CylinderGeometry(1, 1, 0.14, Math.round(96 * quality.detail), 1)
  // 圆柱材质组顺序：0 侧面 / 1 顶面 / 2 底面
  const disc = new THREE.Mesh(discGeo, [sideMat, faceMat, bottomMat])
  disc.rotation.x = Math.PI / 2
  root.add(disc)
  disposables.push(discGeo)

  const ringGeo = new THREE.TorusGeometry(1.01, 0.028, 12, Math.round(128 * quality.detail))
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.position.z = 0.075
  root.add(ring)
  disposables.push(ringGeo)

  return { root, disposables }
}

export async function createBadgeScene(options: CreateSceneOptions): Promise<SceneHandle> {
  const { canvas, quality, onContextLost } = options
  const parent = canvas.parentElement ?? canvas
  const palette: Palette = options.palette ?? {
    paper: 0x151223,
    ink: 0xe8b84b,
    line: 0xe8b84b,
    accent: 0xe879b0,
    side: 0x241f38,
  }

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: quality.dpr <= 1,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(quality.dpr)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1

  const scene = new THREE.Scene()

  // RoomEnvironment 生成 IBL，免去外置 HDR（CSP 下不引入外部资源）
  const room = new RoomEnvironment()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envRT = pmrem.fromScene(room, 0.04)
  scene.environment = envRT.texture
  pmrem.dispose()

  function disposeObjectTree(root: THREE.Object3D): void {
    root.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return
      obj.geometry.dispose()
      const material = obj.material
      if (Array.isArray(material)) material.forEach((item) => item.dispose())
      else material.dispose()
    })
  }

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
  camera.position.set(0, 0, 4.4)

  const key = new THREE.DirectionalLight(0xffffff, 2.2)
  key.position.set(2.5, 3, 4)
  scene.add(key)
  const rim = new THREE.DirectionalLight(0x8ab4ff, 1.3)
  rim.position.set(-3, -1.5, 2)
  scene.add(rim)
  scene.add(new THREE.AmbientLight(0xffffff, 0.36))

  const variant = options.variant ?? 'star'
  const glyph = options.glyph || '19'
  const sub = options.sub || 'CLASS OF 2027'
  const badge =
    variant === 'plaque'
      ? buildPlaque(quality, palette, glyph, sub)
      : variant === 'disc'
        ? buildDisc(quality, palette, glyph, sub)
        : buildStar(quality, palette)

  badge.root.rotation.x = -0.12
  scene.add(badge.root)

  // 可选 GLB 模型：存在则替换内置几何体
  let loadedModel: THREE.Object3D | null = null
  if (options.modelUrl) {
    try {
      const loader = new GLTFLoader()
      const gltf = await loader.loadAsync(options.modelUrl)
      loadedModel = gltf.scene
      badge.root.visible = false
      scene.add(loadedModel)
    } catch {
      /* 加载失败静默回退到内置几何体 */
    }
  }

  const target = loadedModel ?? badge.root
  const pointer = { x: 0, y: 0 }
  const smooth = { x: 0, y: 0 }

  const handleContextLost = (event: Event): void => {
    event.preventDefault()
    onContextLost?.()
  }
  canvas.addEventListener('webglcontextlost', handleContextLost)

  function applySize(): void {
    const w = Math.max(1, parent.clientWidth)
    const h = Math.max(1, parent.clientHeight)
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  applySize()

  let startAt = 0

  return {
    get hasPostprocessing(): boolean {
      return false
    },

    render(timeMs: number): void {
      if (startAt === 0) startAt = timeMs
      const t = (timeMs - startAt) / 1000

      // 摆动幅度：星章可以大一些，牌面要能读清数字
      const swing = variant === 'star' ? 0.56 : 0.32
      target.rotation.y = Math.sin(t * 0.45) * swing
      target.position.y = Math.sin(t * 0.8) * 0.035

      smooth.x += (pointer.x - smooth.x) * 0.06
      smooth.y += (pointer.y - smooth.y) * 0.06
      camera.position.x = smooth.x * 0.5
      camera.position.y = smooth.y * 0.32
      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)
    },

    resize(): void {
      applySize()
    },

    setPointer(x: number, y: number): void {
      pointer.x = x
      pointer.y = y
    },

    setQuality(next: SceneQuality): void {
      renderer.setPixelRatio(next.dpr)
      applySize()
    },

    dispose(): void {
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      for (const item of badge.disposables) item.dispose()
      if (loadedModel) disposeObjectTree(loadedModel)
      disposeObjectTree(room)
      envRT.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}
