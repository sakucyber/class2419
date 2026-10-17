/**
 * 3D 班级徽章场景（Three.js）。
 *
 * ⚠️ 只有本目录下的文件允许静态 import three。
 * 它只能经 `utils/webgl.ts` 的动态 import 进入，从而保证 three / GLTFLoader / 后处理
 * 落在**独立的异步 chunk** 里，不阻塞首屏 LCP。
 * 如果哪天在普通组件里直接 `import ... from 'three'`，这条隔离就破了。
 */
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

import type { CreateSceneOptions, SceneHandle, SceneQuality } from '@/utils/webgl'

interface BadgeParts {
  root: THREE.Group
  disposables: Array<THREE.BufferGeometry | THREE.Material | THREE.Texture>
}

/** 生成徽章几何体：外环 + 主体圆盘 + 中心星形（占位实现，后续可换成 GLB 模型） */
function buildBadge(quality: SceneQuality): BadgeParts {
  const root = new THREE.Group()
  const disposables: BadgeParts['disposables'] = []

  const gold = new THREE.MeshStandardMaterial({
    color: 0xe8b84b,
    metalness: 1,
    roughness: 0.28,
  })
  const deep = new THREE.MeshStandardMaterial({
    color: 0x2a2440,
    metalness: 0.6,
    roughness: 0.45,
  })
  const accent = new THREE.MeshStandardMaterial({
    color: 0xe879b0,
    metalness: 0.85,
    roughness: 0.3,
    emissive: new THREE.Color(0xe879b0).multiplyScalar(0.18),
  })
  disposables.push(gold, deep, accent)

  // 主体圆盘
  const discGeo = new THREE.CylinderGeometry(1, 1, 0.14, Math.round(96 * quality.detail), 1)
  const disc = new THREE.Mesh(discGeo, deep)
  disc.rotation.x = Math.PI / 2
  root.add(disc)
  disposables.push(discGeo)

  // 外圈
  const ringGeo = new THREE.TorusGeometry(1.06, 0.05, 16, Math.round(120 * quality.detail))
  const ring = new THREE.Mesh(ringGeo, gold)
  root.add(ring)
  disposables.push(ringGeo)

  // 内圈细边
  const innerGeo = new THREE.TorusGeometry(0.78, 0.02, 12, Math.round(96 * quality.detail))
  const inner = new THREE.Mesh(innerGeo, accent)
  inner.position.z = 0.09
  root.add(inner)
  disposables.push(innerGeo)

  // 中心星形（用 Shape 挤出，避免依赖字体文件）
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
 * 说明：本函数当前只搭骨架（几何体徽章 + 环境光 + 可选 Bloom）。
 * GLTFLoader 已就位但仅在传入 modelUrl 时启用；真实模型放入 public/models/ 即可切换。
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
  // 硬约束：像素比上限 1.5（由调用方按降级状态给出）
  renderer.setPixelRatio(quality.dpr)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05

  const scene = new THREE.Scene()

  // 用 RoomEnvironment 生成 IBL，免去外置 HDR 文件（CSP 下也不引入外部资源）
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04)
  scene.environment = envRT.texture
  pmrem.dispose()

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
  camera.position.set(0, 0, 4.2)

  const key = new THREE.DirectionalLight(0xffffff, 2.1)
  key.position.set(2.5, 3, 4)
  scene.add(key)
  const rim = new THREE.DirectionalLight(0x8ab4ff, 1.4)
  rim.position.set(-3, -1.5, 2)
  scene.add(rim)
  scene.add(new THREE.AmbientLight(0xffffff, 0.35))

  const badge = buildBadge(quality)
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

  let composer: EffectComposer | null = null
  let bloom: UnrealBloomPass | null = null
  if (quality.postprocessing) {
    composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.7, 0.85)
    composer.addPass(bloom)
  }

  // 指针视差
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
    composer?.setSize(w, h)
    bloom?.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  applySize()

  let elapsed = 0

  return {
    get hasPostprocessing(): boolean {
      return composer !== null
    },

    render(timeMs: number): void {
      const dt = elapsed === 0 ? 0.016 : Math.min((timeMs - elapsed) / 1000, 0.05)
      elapsed = timeMs

      // 待机自转 + 指针视差（阻尼跟随）
      const target = loadedModel ?? badge.root
      target.rotation.y += dt * 0.35
      smooth.x += (pointer.x - smooth.x) * 0.06
      smooth.y += (pointer.y - smooth.y) * 0.06
      camera.position.x = smooth.x * 0.55
      camera.position.y = smooth.y * 0.35
      camera.lookAt(0, 0, 0)

      if (composer) composer.render()
      else renderer.render(scene, camera)
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
      if (loadedModel) {
        loadedModel.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose()
            const mat = obj.material
            if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
            else mat.dispose()
          }
        })
      }
      envRT.dispose()
      composer?.dispose()
      renderer.dispose()
    },
  }
}
