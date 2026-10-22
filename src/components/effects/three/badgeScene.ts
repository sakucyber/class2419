/**
 * 3D 班级徽章场景（Three.js）。
 *
 * ⚠️ 只有本目录下的文件允许静态 import three。
 * 它只能经 `utils/webgl.ts` 的动态 import 进入，从而保证 three / GLTFLoader
 * 落在**独立的异步 chunk** 里，不阻塞首屏 LCP。
 * 如果哪天在普通组件里直接 `import ... from 'three'`，这条隔离就破了。
 *
 * 两个刻意的取舍（都是实测后改的，别轻易改回去）：
 *
 * 1) **不用 EffectComposer / UnrealBloomPass。**
 *    徽章叠在毛玻璃卡片上，画布必须是透明的；而 EffectComposer 的最终输出会丢掉 alpha，
 *    实测表现为画布变成一块不透明的黑方块 —— 比没有辉光难看得多。
 *    改用 emissive 材质自发光，配合 IBL 反射做出金属质感，代价低得多
 *    （Bloom 本来就是这条链路上最贵的一遍）。
 *    注意：不要给 canvas 加 CSS filter 做辉光 —— 画布每帧都在重绘，CSS 滤镜会跟着逐帧重算。
 *
 * 2) **自转改为小幅摆动**，不是连续旋转。
 *    连续转必然经过"侧对镜头"的角度，那时徽章只剩一条细椭圆，观感很差。
 *    改成 sin 摆动（约 ±32°）并叠加固定俯仰角，任何时刻都能看清正面的星形。
 */
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import type { CreateSceneOptions, SceneHandle, SceneQuality } from '@/utils/webgl'

interface BadgeParts {
  root: THREE.Group
  disposables: Array<THREE.BufferGeometry | THREE.Material | THREE.Texture>
}

/** 生成徽章几何体：主体圆盘 + 外环 + 内环 + 挤出星形 + 一圈铆钉 */
function buildBadge(quality: SceneQuality): BadgeParts {
  const root = new THREE.Group()
  const disposables: BadgeParts['disposables'] = []

  const gold = new THREE.MeshStandardMaterial({
    color: 0xe8b84b,
    metalness: 1,
    roughness: 0.26,
    emissive: new THREE.Color(0xe8b84b).multiplyScalar(0.16),
  })
  const deep = new THREE.MeshStandardMaterial({
    color: 0x241f38,
    metalness: 0.55,
    roughness: 0.42,
  })
  const accent = new THREE.MeshStandardMaterial({
    color: 0xe879b0,
    metalness: 0.7,
    roughness: 0.3,
    emissive: new THREE.Color(0xe879b0).multiplyScalar(0.42),
  })
  disposables.push(gold, deep, accent)

  // 主体圆盘
  const discGeo = new THREE.CylinderGeometry(1, 1, 0.14, Math.round(96 * quality.detail), 1)
  const disc = new THREE.Mesh(discGeo, deep)
  disc.rotation.x = Math.PI / 2
  root.add(disc)
  disposables.push(discGeo)

  // 外圈
  const ringGeo = new THREE.TorusGeometry(1.06, 0.05, 16, Math.round(128 * quality.detail))
  const ring = new THREE.Mesh(ringGeo, gold)
  root.add(ring)
  disposables.push(ringGeo)

  // 内圈细边（发光）
  const innerGeo = new THREE.TorusGeometry(0.78, 0.02, 12, Math.round(96 * quality.detail))
  const inner = new THREE.Mesh(innerGeo, accent)
  inner.position.z = 0.09
  root.add(inner)
  disposables.push(innerGeo)

  // 中心星形：用 Shape 挤出，避免依赖字体文件
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
  const starMesh = new THREE.Mesh(starGeo, gold)
  starMesh.position.z = 0.1
  root.add(starMesh)
  disposables.push(starGeo)

  // 一圈小铆钉
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

/**
 * 创建场景。
 *
 * GLTFLoader 已就位但仅在传入 modelUrl 时启用；真实模型放进 public/models/ 即可切换。
 */
export async function createBadgeScene(options: CreateSceneOptions): Promise<SceneHandle> {
  const { canvas, quality, onContextLost } = options
  const parent = canvas.parentElement ?? canvas

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: quality.dpr <= 1,
    alpha: true,
    powerPreference: 'high-performance',
  })
  // 透明画布的关键：清屏色 alpha 必须为 0，否则叠在毛玻璃卡片上就是一块黑方块
  renderer.setClearColor(0x000000, 0)
  // 硬约束：像素比上限 1.5（由调用方按降级状态给出）
  renderer.setPixelRatio(quality.dpr)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1

  const scene = new THREE.Scene()

  // 用 RoomEnvironment 生成 IBL，免去外置 HDR 文件（CSP 下也不引入外部资源）
  const room = new RoomEnvironment()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envRT = pmrem.fromScene(room, 0.04)
  scene.environment = envRT.texture
  pmrem.dispose()

  /** 递归释放一个对象树里的几何体与材质（RoomEnvironment 内部也有自己的资源） */
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
  camera.position.set(0, 0, 4.3)

  const key = new THREE.DirectionalLight(0xffffff, 2.2)
  key.position.set(2.5, 3, 4)
  scene.add(key)
  const rim = new THREE.DirectionalLight(0x8ab4ff, 1.5)
  rim.position.set(-3, -1.5, 2)
  scene.add(rim)
  scene.add(new THREE.AmbientLight(0xffffff, 0.32))

  const badge = buildBadge(quality)
  // 固定俯仰角，让徽章始终有立体感，而不是正对镜头的一块圆饼
  badge.root.rotation.x = -0.16
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
      /* 加载失败静默回退到内置几何体徽章 */
    }
  }

  const target = loadedModel ?? badge.root

  // 指针视差（记录目标值，渲染时阻尼跟随）
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
    /** 透明画布与后处理不可兼得，这里恒为 false（理由见文件头） */
    get hasPostprocessing(): boolean {
      return false
    },

    render(timeMs: number): void {
      if (startAt === 0) startAt = timeMs
      const t = (timeMs - startAt) / 1000

      // 小幅摆动（约 ±32°），永不侧对镜头
      target.rotation.y = Math.sin(t * 0.45) * 0.56
      // 轻微上下浮动，减弱"贴纸感"
      target.position.y = Math.sin(t * 0.8) * 0.035

      // 相机视差：阻尼跟随指针
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
      // RoomEnvironment 内部也建了几何体/材质，不释放的话反复开关 3D 会积累 GPU 资源
      disposeObjectTree(room)
      envRT.dispose()
      renderer.dispose()
      // 主动归还 WebGL 上下文（浏览器对同时存在的上下文数量有上限）
      renderer.forceContextLoss()
    },
  }
}
