<script lang="ts" setup>
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Sky } from 'three/examples/jsm/objects/Sky.js'
import { Loader2 } from 'lucide-vue-next'
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { selectedServer } from './ControlPanel.SaveLoad'
import { loadModel, resolveModelUrl } from '@/utils/GltfCache'

const container = ref<HTMLDivElement | null>(null)
const isLoading = ref<boolean>(false)
const contextLost = ref<boolean>(false)
const objectLoadStatus = ref<{ phase: 'models' | 'building'; loaded: number; total: number } | null>(null)
const hoveredPrefabPath = ref<string | null>(null)
const visibleObjectCount = ref<number>(0)

const TERRAIN_GRID_SIZE = 200
const TERRAIN_TARGET_SIZE = 20
const HEIGHT_EXAGGERATION = 1.5
const OCEAN_SIZE = TERRAIN_TARGET_SIZE * 25
const SKY_SIZE = 2000
const SUN_ELEVATION = 35
const SUN_AZIMUTH = 180
const LOW_COLOR = 0x2f6b3a
const HIGH_COLOR = 0xd8d8d8
const OBJECT_MIN_SCENE_SIZE = 0.08
const OBJECT_COLOR = 0xffaa00
const MODEL_LOAD_CONCURRENCY = 64
// Real props are grouped into a grid of spatial chunks (one InstancedMesh per chunk+model, rather
// than one per whole-map+model) so draw distance can toggle whole chunks — checking a few hundred
// chunk centers per frame — instead of needing per-instance visibility, which InstancedMesh can't
// do cheaply (its instance buffer would need re-uploading every time anything changes).
const CHUNK_GRID_DIVISIONS = 16
const CHUNK_SIZE = TERRAIN_TARGET_SIZE / CHUNK_GRID_DIVISIONS
// Max horizontal (XZ) distance from the camera, in scene units, at which a chunk of real props
// still renders. Tune to taste — this is the main lever for large/dense maps; lower trades visible
// coverage for more headroom.
const OBJECT_DRAW_DISTANCE = 7
// How many chunks get their visibility re-checked per animation frame (see
// stepObjectDrawDistance). Rather than re-evaluating every chunk at once on a timer — which pops
// every newly in/out-of-range chunk visible/invisible in the same instant — a small slice is swept
// each frame, cycling continuously through all chunks, so the draw-distance boundary updates
// gradually as the camera moves instead of in one abrupt batch.
const OBJECT_DRAW_DISTANCE_CHUNKS_PER_FRAME = 1
// WASD pan speed, scaled by current camera-to-target distance per second so it feels proportional
// whether zoomed in close or panned out over a whole (possibly huge) map.
const PAN_SPEED = 0.85
const PAN_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE'])
// Caps how far ahead the orbit pivot (see onOrbitPivotPointerDownHandler) can be placed when the
// camera is looking level or upward, where a literal ground intersection would shoot out to
// infinity (or behind the camera).
const MAX_ORBIT_PIVOT_DISTANCE = TERRAIN_TARGET_SIZE * 3

// Which prefab categories to render, toggleable on-screen (see the panel in the template).
// Prefabs only carry a coarse `category` field from WorldData (Monument/Dungeon/Decor/...) plus a
// resolved asset path — there's no explicit "this is a tree" flag, so trees/rocks are inferred by
// pattern-matching the path against Rust's own folder naming (e.g.
// assets/bundled/prefabs/autospawn/resource/v3_temp_forest/...). Adjust the patterns below if
// something ends up in the wrong bucket. Toggling these also skips loading their models entirely
// (not just hiding them after load), so turning off a category is a real perf lever too.
const showTrees = ref<boolean>(false)
const showRocks = ref<boolean>(false)
const showMonuments = ref<boolean>(false)
const showDungeons = ref<boolean>(false)
const showClutter = ref<boolean>(false) // catch-all: bushes, grass, debris, roadside props, anything unmatched above
const TREE_PATH_PATTERN = /forest|tree|pine|sapling/i
const ROCK_PATH_PATTERN = /rock|cliff|boulder|iceberg/i

function isPrefabCategoryVisible(prefab: any): boolean {
  const path: string = prefab.path ?? ''
  const category: string = prefab.category ?? ''

  if (path.includes('spawner') || path.includes('trigger') || path.includes('sound') || path.includes('prevent') || path.includes('wire') || path.includes('zipline')) {
    return false
  }
  if (path.includes('monument')) {
    return showMonuments.value
  }
  if (category === 'Dungeon') {
    return showDungeons.value
  }
  if (TREE_PATH_PATTERN.test(path)) {
    return showTrees.value
  }
  if (ROCK_PATH_PATTERN.test(path)) {
    return showRocks.value
  }
  return showClutter.value
}

let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let controls: OrbitControls | null = null
let cube: THREE.Mesh | null = null
let terrain: THREE.Mesh | null = null
let ocean: THREE.Mesh | null = null
let lowland: THREE.Mesh | null = null
let sky: Sky | null = null
let fallbackCubeMeshes: THREE.InstancedMesh[] = []
let fallbackCubeGeometry: THREE.BufferGeometry | null = null
let fallbackCubeMaterial: THREE.Material | null = null
let modelInstances: THREE.Group | null = null
let objectChunks: { meshes: THREE.InstancedMesh[]; centerX: number; centerZ: number }[] = []
let resizeObserver: ResizeObserver | null = null
let animationFrameId: number | null = null
let stopWatch: (() => void) | null = null
let stopMapObjectsWatch: (() => void) | null = null
let stopMapInfoWatch: (() => void) | null = null
let stopConnectionWatch: (() => void) | null = null
let stopCategoryFilterWatch: (() => void) | null = null
let mapBuildGeneration = 0
let onContextLost: ((event: Event) => void) | null = null
let onContextRestored: (() => void) | null = null
let lastFrameTimestamp: number | null = null
let objectDrawDistanceCursor = 0
const pressedPanKeys = new Set<string>()
let onKeyDown: ((event: KeyboardEvent) => void) | null = null
let onKeyUp: ((event: KeyboardEvent) => void) | null = null
let onWindowBlur: (() => void) | null = null
let onPointerMove: ((event: PointerEvent) => void) | null = null
let onPointerLeave: (() => void) | null = null
let onOrbitPivotPointerDown: ((event: PointerEvent) => void) | null = null
let onOrbitPivotPointerMove: ((event: PointerEvent) => void) | null = null
let onOrbitPivotPointerUp: ((event: PointerEvent) => void) | null = null
const hoverRaycaster = new THREE.Raycaster()
const pointerNDC = new THREE.Vector2()

// Runs `worker` over `items` with at most `limit` in flight at once — GLTF/Draco loads are
// expensive enough (network + decode + GPU upload) that firing hundreds at once can exhaust
// GPU memory and take down the WebGL context.
async function runWithConcurrencyLimit<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let index = 0
  async function runNext(): Promise<void> {
    const current = index++
    if (current >= items.length) {
      return
    }
    await worker(items[current])
    await runNext()
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runNext))
}

function heightScaleFor(worldSize: number) {
  return (TERRAIN_TARGET_SIZE / worldSize) * HEIGHT_EXAGGERATION
}

const ROTATION_AXIS_X = new THREE.Vector3(1, 0, 0)
const ROTATION_AXIS_Y = new THREE.Vector3(0, 1, 0)
const ROTATION_AXIS_Z = new THREE.Vector3(0, 0, 1)
const scratchQuatX = new THREE.Quaternion()
const scratchQuatY = new THREE.Quaternion()
const scratchQuatZ = new THREE.Quaternion()

// Converts a Unity Euler rotation (degrees, PrefabData.rotation) into a Three.js quaternion
// consistent with our mirrored-X position mapping (see objectScenePosition / buildTerrain).
// Two things matter here:
// 1) Unity's Quaternion.Euler(x,y,z) composes as qy*qx*qz — Z applied first, then X, then Y.
//    This is Unity's own documented/decompiled composition order, not a generic Euler default.
// 2) objectScenePosition negates X only — a confirmed mirror across the YZ-plane (not a generic
//    handedness flip). Mirroring a rotation across one axis negates the quaternion's OTHER TWO
//    imaginary components while keeping that axis's own component and w unchanged (verified by
//    expanding the rotation-matrix conjugation M*R*M for M=diag(-1,1,1) term by term). For an
//    X-mirror that's: (x,y,z,w) -> (x,-y,-z,w).
function unityEulerToThreeQuaternion(rotation: { x: number; y: number; z: number }, out: THREE.Quaternion): THREE.Quaternion {
  scratchQuatX.setFromAxisAngle(ROTATION_AXIS_X, THREE.MathUtils.degToRad(rotation.x))
  scratchQuatY.setFromAxisAngle(ROTATION_AXIS_Y, THREE.MathUtils.degToRad(rotation.y))
  scratchQuatZ.setFromAxisAngle(ROTATION_AXIS_Z, THREE.MathUtils.degToRad(rotation.z))
  out.copy(scratchQuatY).multiply(scratchQuatX).multiply(scratchQuatZ)
  out.set(out.x, -out.y, -out.z, out.w)
  return out
}

function onResize() {
  if (!container.value || !camera || !renderer) {
    return
  }

  const width = container.value.clientWidth
  const height = container.value.clientHeight
  if (width == 0 || height == 0) {
    return
  }

  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

function removeCube() {
  if (!cube) {
    return
  }
  scene?.remove(cube)
  cube.geometry.dispose()
  ;(cube.material as THREE.Material).dispose()
  cube = null
}

function removeTerrain() {
  if (!terrain) {
    return
  }
  scene?.remove(terrain)
  terrain.geometry.dispose()
  const material = terrain.material as THREE.MeshStandardMaterial
  material.map?.dispose()
  material.dispose()
  terrain = null
}

const mapTextureLoader = new THREE.TextureLoader()

// Experimental: overlay the existing 2D map PNG as the terrain's texture instead of the
// height-based color gradient, to see how it looks without investing in real biome/topology data.
function applyMapTexture(imageUrl: string) {
  if (!terrain) {
    return
  }
  const targetTerrain = terrain
  mapTextureLoader.load(
    imageUrl,
    (texture) => {
      if (terrain !== targetTerrain) {
        // Terrain was rebuilt/removed while this texture was loading — drop it.
        texture.dispose()
        return
      }
      texture.colorSpace = THREE.SRGBColorSpace
      const material = terrain.material as THREE.MeshStandardMaterial
      material.map = texture
      material.vertexColors = false
      material.needsUpdate = true
    },
    undefined,
    (err) => {
      console.warn('Map3D: failed to load map image as terrain texture', err)
    }
  )
}

function removeOcean() {
  if (!ocean) {
    return
  }
  scene?.remove(ocean)
  ocean.geometry.dispose()
  ;(ocean.material as THREE.Material).dispose()
  ocean = null
}

function removeLowland() {
  if (!lowland) {
    return
  }
  scene?.remove(lowland)
  lowland.geometry.dispose()
  ;(lowland.material as THREE.Material).dispose()
  lowland = null
}

function buildLowland() {
  if (!scene) {
    return
  }
  removeLowland()

  const geometry = new THREE.PlaneGeometry(OCEAN_SIZE, OCEAN_SIZE)
  geometry.rotateX(-Math.PI / 2)

  const material = new THREE.MeshStandardMaterial({ color: LOW_COLOR, roughness: 0.95, metalness: 0 })
  lowland = new THREE.Mesh(geometry, material)
  lowland.position.y = 0
  scene.add(lowland)
}

function buildOcean(positionY: number, heightScale: number) {
  if (!scene) {
    return
  }
  removeOcean()

  const geometry = new THREE.PlaneGeometry(OCEAN_SIZE, OCEAN_SIZE)
  geometry.rotateX(-Math.PI / 2)

  const material = new THREE.MeshStandardMaterial({
    color: 0x1c7ed6,
    transparent: true,
    opacity: 0.75,
    roughness: 0.15,
    metalness: 0.1,
    side: THREE.DoubleSide
  })

  ocean = new THREE.Mesh(geometry, material)
  ocean.position.y = -positionY * heightScale
  scene.add(ocean)
}

function objectScenePosition(p: { x: number; y: number; z: number }, worldSize: number, positionY: number, planarScale: number, heightScale: number) {
  const originX = -worldSize / 2
  const originZ = -worldSize / 2
  return new THREE.Vector3(
    // X is mirrored to match the terrain's texel sampling in buildTerrain (see the matching
    // comment there) — the map otherwise renders flipped left-right versus the real game.
    TERRAIN_TARGET_SIZE / 2 - (p.x - originX) * planarScale,
    (p.y - positionY) * heightScale,
    (p.z - originZ) * planarScale - TERRAIN_TARGET_SIZE / 2
  )
}

// Real model geometry already carries its true real-world proportions, so scale it uniformly by
// planarScale alone — using heightScale here (which includes the terrain's vertical exaggeration)
// would stretch every prop taller than its actual width/depth.
function objectSceneScale(s: { x: number; y: number; z: number }, planarScale: number) {
  return new THREE.Vector3(s.x * planarScale, s.y * planarScale, s.z * planarScale)
}

// Cubes have no natural size of their own, so unlike real models they get a minimum visible
// floor — without it, a normally-scaled prop on a large map (small planarScale) would render
// as a near-invisible speck.
function fallbackCubeScale(s: { x: number; y: number; z: number }, planarScale: number) {
  return new THREE.Vector3(
    Math.max(s.x * planarScale, OBJECT_MIN_SCENE_SIZE),
    Math.max(s.y * planarScale, OBJECT_MIN_SCENE_SIZE),
    Math.max(s.z * planarScale, OBJECT_MIN_SCENE_SIZE)
  )
}

function removeMapObjects() {
  for (const mesh of fallbackCubeMeshes) {
    scene?.remove(mesh)
  }
  fallbackCubeMeshes = []
  fallbackCubeGeometry?.dispose()
  fallbackCubeGeometry = null
  fallbackCubeMaterial?.dispose()
  fallbackCubeMaterial = null
}

function removeModelInstances() {
  if (!modelInstances) {
    return
  }
  // The InstancedMeshes here reuse geometry/material buffers straight from the cached source
  // model — only detach from the scene, never dispose, or every future instance of that model
  // (and the cache entry itself) breaks.
  scene?.remove(modelInstances)
  modelInstances = null
  objectChunks = []
  objectDrawDistanceCursor = 0
  visibleObjectCount.value = 0
  // Whatever instance the cursor was over may no longer exist (or mean something different) once
  // rebuilt — clear the stale tooltip rather than leave a wrong answer showing.
  hoveredPrefabPath.value = null
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
}

const panForward = new THREE.Vector3()
const panRight = new THREE.Vector3()
const panDelta = new THREE.Vector3()

// Moves the camera (and its orbit target, so mouse-drag orbiting still feels natural afterward).
// W/A/S/D pan along the camera's current horizontal facing direction — ignoring pitch (projected
// onto XZ) so pressing W always pans "forward across the map" rather than into the ground/sky.
// Q/E move straight down/up along world Y, independent of camera facing, to add vertical control.
function updateKeyboardPan(deltaSeconds: number) {
  if (!camera || !controls || pressedPanKeys.size === 0 || deltaSeconds <= 0) {
    return
  }

  panDelta.set(0, 0, 0)

  const needsHorizontal =
    pressedPanKeys.has('KeyW') || pressedPanKeys.has('KeyS') || pressedPanKeys.has('KeyA') || pressedPanKeys.has('KeyD')
  if (needsHorizontal) {
    camera.getWorldDirection(panForward)
    panForward.y = 0
    if (panForward.lengthSq() > 1e-6) {
      panForward.normalize()
      panRight.crossVectors(panForward, camera.up).normalize()
      if (pressedPanKeys.has('KeyW')) panDelta.add(panForward)
      if (pressedPanKeys.has('KeyS')) panDelta.sub(panForward)
      if (pressedPanKeys.has('KeyD')) panDelta.add(panRight)
      if (pressedPanKeys.has('KeyA')) panDelta.sub(panRight)
    }
  }

  if (pressedPanKeys.has('KeyE')) panDelta.y += 1
  if (pressedPanKeys.has('KeyQ')) panDelta.y -= 1

  if (panDelta.lengthSq() === 0) {
    return
  }

  const distanceToTarget = camera.position.distanceTo(controls.target)
  panDelta.normalize().multiplyScalar(PAN_SPEED * distanceToTarget * deltaSeconds)

  camera.position.add(panDelta)
  controls.target.add(panDelta)
}

// Run on pointer move rather than every frame — only does work when the mouse actually moves,
// and Three.js's raycaster already skips any mesh with .visible === false, so chunks hidden by
// draw distance are automatically excluded for free.
function updateHoveredPrefab() {
  if (!camera) {
    return
  }

  const targets: THREE.InstancedMesh[] = [...fallbackCubeMeshes]
  if (modelInstances) {
    for (const child of modelInstances.children) {
      if (child instanceof THREE.InstancedMesh) {
        targets.push(child)
      }
    }
  }

  hoverRaycaster.setFromCamera(pointerNDC, camera)
  const hits = hoverRaycaster.intersectObjects(targets, false)
  const hit = hits[0]

  if (hit && hit.instanceId != null) {
    const prefabs = hit.object.userData.prefabs as any[] | undefined
    const prefab = prefabs?.[hit.instanceId]
    hoveredPrefabPath.value = prefab?.path || prefab?.category || null
  } else {
    hoveredPrefabPath.value = null
  }
}

const orbitPivotForward = new THREE.Vector3()
const orbitPivotNDC = new THREE.Vector2(0, 0)

// Point on the terrain/ocean/lowland surface that the camera is currently looking toward, used as
// the orbit pivot so dragging swings the view around roughly where you're already looking rather
// than a distant/stale target. Raycasts along the center of the screen (the camera's exact forward
// direction), not the cursor position — this is about where the camera itself is looking, not where
// the mouse happens to be. Falls back to a capped-distance point along the forward ray (at the
// camera's own height) when the ray doesn't hit any surface at all, e.g. looking up at the sky.
function computeOrbitPivot(): THREE.Vector3 | null {
  if (!camera) {
    return null
  }

  const surfaces: THREE.Mesh[] = []
  if (terrain) surfaces.push(terrain)
  if (ocean) surfaces.push(ocean)
  if (lowland) surfaces.push(lowland)

  if (surfaces.length > 0) {
    hoverRaycaster.setFromCamera(orbitPivotNDC, camera)
    const hit = hoverRaycaster.intersectObjects(surfaces, false)[0]
    if (hit) {
      return hit.point.clone()
    }
  }

  camera.getWorldDirection(orbitPivotForward)
  return new THREE.Vector3(
    camera.position.x + orbitPivotForward.x * MAX_ORBIT_PIVOT_DISTANCE,
    camera.position.y + orbitPivotForward.y * MAX_ORBIT_PIVOT_DISTANCE,
    camera.position.z + orbitPivotForward.z * MAX_ORBIT_PIVOT_DISTANCE
  )
}

// The pivot swap is deferred from pointerdown to the first pointermove of the drag (rather than
// applied immediately) because OrbitControls.update() unconditionally calls
// `camera.lookAt(target)` every frame — retargeting on a plain pointerdown snaps the view to face
// the new target before the user has moved the mouse at all, which reads as an instant "teleport".
// Applying it on the first pointermove instead means the reorientation happens as part of the same
// input that starts the rotation.
let pendingOrbitPivot: THREE.Vector3 | null = null

function clearPendingOrbitPivot() {
  pendingOrbitPivot = null
  if (onOrbitPivotPointerMove) {
    document.removeEventListener('pointermove', onOrbitPivotPointerMove, { capture: true })
    onOrbitPivotPointerMove = null
  }
  if (onOrbitPivotPointerUp) {
    document.removeEventListener('pointerup', onOrbitPivotPointerUp, { capture: true })
    document.removeEventListener('pointercancel', onOrbitPivotPointerUp, { capture: true })
    onOrbitPivotPointerUp = null
  }
}

// Registered with `capture: true` so this runs and computes the pending pivot BEFORE
// OrbitControls' own (bubble-phase) pointerdown handler reads it to begin the drag.
function onOrbitPivotPointerDownHandler(event: PointerEvent) {
  if (event.button !== 0 || !controls) {
    return
  }

  const pivot = computeOrbitPivot()
  if (!pivot) {
    return
  }

  clearPendingOrbitPivot()
  pendingOrbitPivot = pivot

  onOrbitPivotPointerMove = () => {
    if (pendingOrbitPivot && controls) {
      controls.target.copy(pendingOrbitPivot)
    }
    clearPendingOrbitPivot()
  }
  onOrbitPivotPointerUp = () => {
    clearPendingOrbitPivot()
  }

  // Bound to the document (not just the canvas) with `capture: true`, matching how OrbitControls
  // itself tracks the drag past the canvas edge, and so this fires before OrbitControls' own
  // bubble-phase pointermove handler processes the same event's rotation delta.
  document.addEventListener('pointermove', onOrbitPivotPointerMove, { capture: true })
  document.addEventListener('pointerup', onOrbitPivotPointerUp, { capture: true })
  document.addEventListener('pointercancel', onOrbitPivotPointerUp, { capture: true })
}

// Full synchronous pass over every chunk — used once right after (re)building map objects so
// visibility/counts start correct immediately, before the incremental sweep below has had any
// chance to run. InstancedMesh doesn't support toggling individual instances without re-uploading
// its whole instance buffer, so chunk-level visibility is the affordable way to get draw distance.
function updateObjectDrawDistanceFull() {
  objectDrawDistanceCursor = 0

  if (!camera || objectChunks.length === 0) {
    visibleObjectCount.value = 0
    return
  }
  const drawDistanceSq = OBJECT_DRAW_DISTANCE * OBJECT_DRAW_DISTANCE
  let visibleCount = 0
  for (const chunk of objectChunks) {
    const dx = chunk.centerX - camera.position.x
    const dz = chunk.centerZ - camera.position.z
    const visible = dx * dx + dz * dz <= drawDistanceSq
    for (const mesh of chunk.meshes) {
      mesh.visible = visible
      if (visible) {
        visibleCount += mesh.count
      }
    }
  }
  visibleObjectCount.value = visibleCount
}

// Runs every animation frame, re-checking only OBJECT_DRAW_DISTANCE_CHUNKS_PER_FRAME chunks (a
// small slice of the total) before moving on — cycling continuously through the whole list. Only
// touches a mesh (and visibleObjectCount) when its visibility actually flips, so a steady camera
// costs nothing beyond the distance checks themselves.
function stepObjectDrawDistance() {
  if (!camera || objectChunks.length === 0) {
    return
  }

  if (objectDrawDistanceCursor >= objectChunks.length) {
    objectDrawDistanceCursor = 0
  }

  const drawDistanceSq = OBJECT_DRAW_DISTANCE * OBJECT_DRAW_DISTANCE
  const batchSize = Math.min(OBJECT_DRAW_DISTANCE_CHUNKS_PER_FRAME, objectChunks.length)
  let visibleDelta = 0

  for (let i = 0; i < batchSize; i++) {
    const chunk = objectChunks[objectDrawDistanceCursor]
    const dx = chunk.centerX - camera.position.x
    const dz = chunk.centerZ - camera.position.z
    const visible = dx * dx + dz * dz <= drawDistanceSq

    for (const mesh of chunk.meshes) {
      if (mesh.visible !== visible) {
        visibleDelta += visible ? mesh.count : -mesh.count
        mesh.visible = visible
      }
    }

    objectDrawDistanceCursor = (objectDrawDistanceCursor + 1) % objectChunks.length
  }

  if (visibleDelta !== 0) {
    visibleObjectCount.value += visibleDelta
  }
}

interface ModelPart {
  geometry: THREE.BufferGeometry
  material: THREE.Material
  // Transform of this mesh relative to the model's own root, independent of where any
  // particular placed instance ends up in the world.
  localMatrix: THREE.Matrix4
}

// Flattens a loaded model's mesh hierarchy into (geometry, material, local transform) parts so
// every placed instance of this model can be rendered as one entry in a shared InstancedMesh per
// part, instead of a full separate Object3D clone (and its own draw call) per instance.
function extractModelParts(root: THREE.Object3D): ModelPart[] {
  root.updateMatrixWorld(true)
  const parts: ModelPart[] = []
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.geometry || !child.material) {
      return
    }
    // Geometry groups (multi-material meshes) aren't representable by a single InstancedMesh's
    // one material — only the first is used, an acceptable simplification for a placeholder viewer.
    const material = Array.isArray(child.material) ? child.material[0] : child.material
    parts.push({
      geometry: child.geometry,
      material,
      localMatrix: child.matrixWorld.clone()
    })
  })
  return parts
}

// Prefabs whose model failed to load (missing path, 404, decode error) fall back to plain cubes so
// map coverage stays visible either way. Chunked exactly like real models (rather than one single
// whole-map InstancedMesh) so they're covered by the same per-chunk draw-distance check instead of
// always rendering regardless of camera distance.
function buildFallbackCubes(
  prefabs: any[],
  worldSize: number,
  positionY: number,
  planarScale: number,
  heightScale: number,
  chunksByCoord: Map<string, { meshes: THREE.InstancedMesh[]; centerX: number; centerZ: number }>
) {
  if (!scene || prefabs.length === 0) {
    return
  }

  const cellsByChunk = new Map<string, { chunkX: number; chunkZ: number; prefabs: any[] }>()
  for (const prefab of prefabs) {
    const position = objectScenePosition(prefab.position, worldSize, positionY, planarScale, heightScale)
    const chunkX = Math.floor(position.x / CHUNK_SIZE)
    const chunkZ = Math.floor(position.z / CHUNK_SIZE)
    const key = `${chunkX}_${chunkZ}`

    let cell = cellsByChunk.get(key)
    if (!cell) {
      cell = { chunkX, chunkZ, prefabs: [] }
      cellsByChunk.set(key, cell)
    }
    cell.prefabs.push(prefab)
  }

  fallbackCubeGeometry = new THREE.BoxGeometry(1, 1, 1)
  fallbackCubeMaterial = new THREE.MeshStandardMaterial({ color: OBJECT_COLOR, roughness: 0.6, metalness: 0.1 })

  const matrix = new THREE.Matrix4()
  const rotation = new THREE.Quaternion()

  for (const [chunkKey, cell] of cellsByChunk) {
    const instancedMesh = new THREE.InstancedMesh(fallbackCubeGeometry, fallbackCubeMaterial, cell.prefabs.length)
    for (let i = 0; i < cell.prefabs.length; i++) {
      const prefab = cell.prefabs[i]
      const position = objectScenePosition(prefab.position, worldSize, positionY, planarScale, heightScale)
      const scale = fallbackCubeScale(prefab.scale, planarScale)
      matrix.compose(position, unityEulerToThreeQuaternion(prefab.rotation, rotation), scale)
      instancedMesh.setMatrixAt(i, matrix)
    }
    instancedMesh.instanceMatrix.needsUpdate = true
    // Instance index -> source prefab, so hover raycasting can resolve which prefab was hit.
    instancedMesh.userData.prefabs = cell.prefabs
    scene.add(instancedMesh)
    fallbackCubeMeshes.push(instancedMesh)

    let chunk = chunksByCoord.get(chunkKey)
    if (!chunk) {
      chunk = {
        meshes: [],
        centerX: (cell.chunkX + 0.5) * CHUNK_SIZE,
        centerZ: (cell.chunkZ + 0.5) * CHUNK_SIZE
      }
      chunksByCoord.set(chunkKey, chunk)
    }
    chunk.meshes.push(instancedMesh)
  }
}

async function buildMapObjects(allPrefabs: any[], terrainInfo: any) {
  if (!scene || allPrefabs.length === 0) {
    return
  }
  const generation = ++mapBuildGeneration
  removeMapObjects()
  removeModelInstances()

  try {
    const prefabs = allPrefabs.filter(isPrefabCategoryVisible)
    if (prefabs.length === 0) {
      return
    }

    const { worldSize, positionY } = terrainInfo
    const planarScale = TERRAIN_TARGET_SIZE / worldSize
    const heightScale = heightScaleFor(worldSize)

    const uniquePaths = [...new Set(prefabs.map((p) => p.path).filter(Boolean))]
    const modelsByPath = new Map<string, THREE.Object3D | null>()
    let loadedModelCount = 0
    objectLoadStatus.value = { phase: 'models', loaded: 0, total: uniquePaths.length }
    await runWithConcurrencyLimit(uniquePaths, MODEL_LOAD_CONCURRENCY, async (path) => {
      modelsByPath.set(path, await loadModel(resolveModelUrl(path)))
      loadedModelCount++
      if (generation === mapBuildGeneration) {
        objectLoadStatus.value = { phase: 'models', loaded: loadedModelCount, total: uniquePaths.length }
      }
    })

    if (generation !== mapBuildGeneration) {
      // Superseded by a newer buildMapObjects call (e.g. rapid server switching) — drop this result.
      return
    }

    // Group by (chunk, model path) — each combination gets its own InstancedMesh per mesh part,
    // so draw distance can toggle a whole chunk's meshes instead of individual instances.
    const cellsByKey = new Map<string, { path: string; chunkX: number; chunkZ: number; entries: { prefab: any; position: THREE.Vector3 }[] }>()
    const fallback: any[] = []

    for (const prefab of prefabs) {
      const model = prefab.path ? modelsByPath.get(prefab.path) : null
      if (!model) {
        fallback.push(prefab)
        continue
      }

      const position = objectScenePosition(prefab.position, worldSize, positionY, planarScale, heightScale)
      const chunkX = Math.floor(position.x / CHUNK_SIZE)
      const chunkZ = Math.floor(position.z / CHUNK_SIZE)
      const key = `${prefab.path}|${chunkX}|${chunkZ}`

      let cell = cellsByKey.get(key)
      if (!cell) {
        cell = { path: prefab.path, chunkX, chunkZ, entries: [] }
        cellsByKey.set(key, cell)
      }
      cell.entries.push({ prefab, position })
    }

    if (!scene) {
      // Unmounted while loading — drop the result without touching cache-owned buffers.
      objectLoadStatus.value = null
      return
    }

    // The chunk-building loop below is fully synchronous and can take a noticeable moment on a
    // dense map — yield one frame first so this status actually paints before that freeze starts.
    // This doesn't spread the build itself across frames (that caused issues previously), it just
    // gives the UI a chance to show something's happening right before it does.
    objectLoadStatus.value = { phase: 'building', loaded: 0, total: prefabs.length }
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    if (generation !== mapBuildGeneration || !scene) {
      objectLoadStatus.value = null
      return
    }

    const group = new THREE.Group()
    const placementMatrix = new THREE.Matrix4()
    const rotation = new THREE.Quaternion()
    const chunksByCoord = new Map<string, { meshes: THREE.InstancedMesh[]; centerX: number; centerZ: number }>()

    for (const cell of cellsByKey.values()) {
      const model = modelsByPath.get(cell.path)
      if (!model) {
        continue
      }

      const chunkCoordKey = `${cell.chunkX}_${cell.chunkZ}`
      let chunk = chunksByCoord.get(chunkCoordKey)
      if (!chunk) {
        chunk = {
          meshes: [],
          centerX: (cell.chunkX + 0.5) * CHUNK_SIZE,
          centerZ: (cell.chunkZ + 0.5) * CHUNK_SIZE
        }
        chunksByCoord.set(chunkCoordKey, chunk)
      }

      for (const part of extractModelParts(model)) {
        const instancedMesh = new THREE.InstancedMesh(part.geometry, part.material, cell.entries.length)
        for (let i = 0; i < cell.entries.length; i++) {
          const { prefab, position } = cell.entries[i]
          const scale = objectSceneScale(prefab.scale, planarScale)
          placementMatrix.compose(position, unityEulerToThreeQuaternion(prefab.rotation, rotation), scale)
          instancedMesh.setMatrixAt(i, placementMatrix.clone().multiply(part.localMatrix))
        }
        instancedMesh.instanceMatrix.needsUpdate = true
        // Instance index -> source prefab, so hover raycasting can resolve which prefab was hit.
        instancedMesh.userData.prefabs = cell.entries.map((entry) => entry.prefab)
        group.add(instancedMesh)
        chunk.meshes.push(instancedMesh)
      }
    }

    modelInstances = group
    scene.add(group)

    if (fallback.length > 0) {
      buildFallbackCubes(fallback, worldSize, positionY, planarScale, heightScale, chunksByCoord)
    }

    objectChunks = [...chunksByCoord.values()]
    updateObjectDrawDistanceFull()
    objectLoadStatus.value = null
  } catch (ex) {
    console.error('buildMapObjects: failed to build map objects', ex)
    objectLoadStatus.value = null
  }
}

function requestMapObjects() {
  const server = selectedServer.value
  if (!server) {
    return
  }

  if (server.MapObjects && server.TerrainInfo) {
    buildMapObjects(server.MapObjects, server.TerrainInfo)
    return
  }

  // sendCall() calls Socket.send() directly — calling that before the socket finishes
  // connecting (e.g. right after a page reload) throws and silently aborts the caller.
  if (!server.IsConnected) {
    return
  }

  server.sendCall('LoadMap')
}

async function buildTerrain(info: any) {
  if (!scene) {
    return
  }
  removeCube()
  removeTerrain()
  removeMapObjects()
  removeModelInstances()

  // Yield one frame so the loading indicator actually paints before the synchronous heightmap
  // processing below (tens of thousands of vertices) freezes the main thread — same approach as
  // the object-building status, and for the same reason: setting isLoading.value = true right
  // before a long synchronous block never gives the browser a chance to render it first.
  isLoading.value = true
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  if (!scene) {
    isLoading.value = false
    return
  }

  try {
    const { res, worldSize, positionY, sizeY, heights } = info
    const gridSize = Math.min(TERRAIN_GRID_SIZE, res)

    const geometry = new THREE.PlaneGeometry(TERRAIN_TARGET_SIZE, TERRAIN_TARGET_SIZE, gridSize - 1, gridSize - 1)
    geometry.rotateX(-Math.PI / 2)

    const heightScale = heightScaleFor(worldSize)
    const position = geometry.attributes.position as THREE.BufferAttribute
    const colors = new Float32Array(position.count * 3)
    const uvs = new Float32Array(position.count * 2)
    const low = new THREE.Color(LOW_COLOR)
    const high = new THREE.Color(HIGH_COLOR)
    let invalidSamples = 0

    for (let row = 0; row < gridSize; row++) {
      const z = Math.round((row * (res - 1)) / (gridSize - 1))
      for (let col = 0; col < gridSize; col++) {
        // Sample X in reverse — mesh column 0 is the plane's -X edge, but that edge needs to show
        // the heightmap's MAX x texel (and vice versa) or the whole map renders mirrored
        // left-right versus the real game. Z isn't affected, only X. objectScenePosition mirrors
        // prefab X positions to match this same convention.
        const x = Math.round(((gridSize - 1 - col) * (res - 1)) / (gridSize - 1))
        const vertexIndex = row * gridSize + col
        const rawHeight = heights[z * res + x]
        // A single NaN vertex corrupts the whole mesh's bounding sphere and gets silently
        // frustum-culled (no error, the mesh just never renders) — always fall back to 0.
        if (!Number.isFinite(rawHeight)) {
          invalidSamples++
        }
        const height01 = Number.isFinite(rawHeight) ? Math.max(0, rawHeight / 32766) : 0

        position.setY(vertexIndex, height01 * sizeY * heightScale)

        const color = low.clone().lerp(high, height01)
        colors[vertexIndex * 3] = color.r
        colors[vertexIndex * 3 + 1] = color.g
        colors[vertexIndex * 3 + 2] = color.b

        // Same mirrored-X convention as the height sampling above, so an overlaid map image
        // lines up with the terrain instead of running backwards across it.
        uvs[vertexIndex * 2] = (gridSize - 1 - col) / (gridSize - 1)
        uvs[vertexIndex * 2 + 1] = row / (gridSize - 1)
      }
    }

    if (invalidSamples > 0) {
      console.error(`buildTerrain: ${invalidSamples} height sample(s) were out of range/NaN and fell back to 0 — the heightmap data is likely truncated or mismatched with the reported resolution.`)
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    geometry.computeVertexNormals()

    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.05 })
    terrain = new THREE.Mesh(geometry, material)
    scene.add(terrain)

    buildLowland()
    buildOcean(positionY, heightScale)

    if (selectedServer.value?.MapInfo?.imageUrl) {
      applyMapTexture(selectedServer.value.MapInfo.imageUrl)
    }

    if (selectedServer.value?.MapObjects) {
      buildMapObjects(selectedServer.value.MapObjects, info)
    }
  } catch (ex) {
    console.error('buildTerrain: failed to build terrain from TerrainInfo', ex)
  } finally {
    isLoading.value = false
  }
}

function requestTerrain() {
  const server = selectedServer.value
  if (!server) {
    return
  }

  if (server.TerrainInfo) {
    buildTerrain(server.TerrainInfo)
    return
  }

  // sendCall() calls Socket.send() directly — calling that before the socket finishes
  // connecting (e.g. right after a page reload) throws and silently aborts the caller.
  if (!server.IsConnected) {
    return
  }

  isLoading.value = true
  server.sendCall('LoadTerrain')
}

function requestMapInfo() {
  const server = selectedServer.value
  if (!server) {
    return
  }

  if (server.MapInfo?.imageUrl) {
    applyMapTexture(server.MapInfo.imageUrl)
    return
  }

  // sendCall() calls Socket.send() directly — calling that before the socket finishes
  // connecting (e.g. right after a page reload) throws and silently aborts the caller.
  if (!server.IsConnected) {
    return
  }

  server.sendCall('LoadMapInfo')
}

function animate(timestamp?: number) {
  animationFrameId = requestAnimationFrame(animate)

  let deltaSeconds = 0
  if (timestamp != null) {
    if (lastFrameTimestamp != null) {
      // Clamp in case the tab was backgrounded/throttled — avoids one huge pan jump on return.
      deltaSeconds = Math.min((timestamp - lastFrameTimestamp) / 1000, 0.1)
    }
    lastFrameTimestamp = timestamp
  }

  if (cube) {
    cube.rotation.x += 0.005
    cube.rotation.y += 0.01
  }

  updateKeyboardPan(deltaSeconds)
  controls?.update()

  stepObjectDrawDistance()

  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

onMounted(() => {
  if (!container.value) {
    return
  }

  const width = container.value.clientWidth
  const height = container.value.clientHeight

  scene = new THREE.Scene()
  scene.fog = new THREE.Fog(0xbfd9e8, 60, 320)

  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 5000)
  camera.position.set(14, 12, 18)
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(width, height)
  container.value.appendChild(renderer.domElement)

  onContextLost = (event) => {
    event.preventDefault()
    contextLost.value = true
    console.error('Map3D: WebGL context lost — likely too many unique models loaded at once for the GPU to handle.')
  }
  onContextRestored = () => {
    contextLost.value = false
    console.warn('Map3D: WebGL context restored. The scene may need a reload to look correct again.')
  }
  renderer.domElement.addEventListener('webglcontextlost', onContextLost)
  renderer.domElement.addEventListener('webglcontextrestored', onContextRestored)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = false
  controls.target.set(0, 0, 0)

  const sunDirection = new THREE.Vector3().setFromSphericalCoords(
    1,
    THREE.MathUtils.degToRad(90 - SUN_ELEVATION),
    THREE.MathUtils.degToRad(SUN_AZIMUTH)
  )

  sky = new Sky()
  sky.scale.setScalar(SKY_SIZE)
  sky.material.uniforms.turbidity.value = 4
  sky.material.uniforms.rayleigh.value = 1.8
  sky.material.uniforms.mieCoefficient.value = 0.005
  sky.material.uniforms.mieDirectionalG.value = 0.8
  sky.material.uniforms.sunPosition.value.copy(sunDirection)
  scene.add(sky)

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xfff3e0, 2)
  directionalLight.position.copy(sunDirection).multiplyScalar(50)
  scene.add(directionalLight)

  const geometry = new THREE.BoxGeometry(1.25, 1.25, 1.25)
  const material = new THREE.MeshStandardMaterial({ color: 0xfc583b, roughness: 0.4, metalness: 0.2 })
  cube = new THREE.Mesh(geometry, material)
  scene.add(cube)

  onKeyDown = (event) => {
    if (!PAN_KEYS.has(event.code) || isTypingTarget(event.target)) {
      return
    }
    pressedPanKeys.add(event.code)
  }
  onKeyUp = (event) => {
    pressedPanKeys.delete(event.code)
  }
  onWindowBlur = () => {
    pressedPanKeys.clear()
  }
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onWindowBlur)

  onPointerMove = (event) => {
    if (!container.value) {
      return
    }
    const rect = container.value.getBoundingClientRect()
    pointerNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointerNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    updateHoveredPrefab()
  }
  onPointerLeave = () => {
    hoveredPrefabPath.value = null
  }
  renderer.domElement.addEventListener('pointermove', onPointerMove)
  renderer.domElement.addEventListener('pointerleave', onPointerLeave)

  onOrbitPivotPointerDown = onOrbitPivotPointerDownHandler
  renderer.domElement.addEventListener('pointerdown', onOrbitPivotPointerDown, { capture: true })

  animate()

  resizeObserver = new ResizeObserver(onResize)
  resizeObserver.observe(container.value)

  stopWatch = watch(
    () => selectedServer.value?.TerrainInfo,
    (info) => {
      if (info) {
        buildTerrain(info)
      }
    }
  )

  stopMapObjectsWatch = watch(
    () => selectedServer.value?.MapObjects,
    (objects) => {
      if (objects && selectedServer.value?.TerrainInfo) {
        buildMapObjects(objects, selectedServer.value.TerrainInfo)
      }
    }
  )

  stopMapInfoWatch = watch(
    () => selectedServer.value?.MapInfo?.imageUrl,
    (imageUrl) => {
      if (imageUrl) {
        applyMapTexture(imageUrl)
      }
    }
  )

  // Re-filters and rebuilds real props/fallback cubes from the already-fetched prefab list
  // whenever a category toggle changes — no need to re-request data from the server, since this
  // is purely a client-side filter.
  stopCategoryFilterWatch = watch(
    [showTrees, showRocks, showMonuments, showDungeons, showClutter],
    () => {
      if (selectedServer.value?.MapObjects && selectedServer.value?.TerrainInfo) {
        buildMapObjects(selectedServer.value.MapObjects, selectedServer.value.TerrainInfo)
      }
    }
  )

  // Retries the requests once the socket actually finishes connecting, in case this tab
  // mounted (e.g. remembered as the last-active tab across a reload) before that happened.
  stopConnectionWatch = watch(
    () => selectedServer.value?.IsConnected,
    (connected) => {
      if (connected) {
        requestTerrain()
        requestMapObjects()
        requestMapInfo()
      }
    }
  )

  requestTerrain()
  requestMapObjects()
  requestMapInfo()
})

onUnmounted(() => {
  if (animationFrameId != null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }

  if (onKeyDown) {
    window.removeEventListener('keydown', onKeyDown)
  }
  if (onKeyUp) {
    window.removeEventListener('keyup', onKeyUp)
  }
  if (onWindowBlur) {
    window.removeEventListener('blur', onWindowBlur)
  }
  if (renderer && onPointerMove) {
    renderer.domElement.removeEventListener('pointermove', onPointerMove)
  }
  if (renderer && onPointerLeave) {
    renderer.domElement.removeEventListener('pointerleave', onPointerLeave)
  }
  if (renderer && onOrbitPivotPointerDown) {
    renderer.domElement.removeEventListener('pointerdown', onOrbitPivotPointerDown, { capture: true })
  }
  clearPendingOrbitPivot()
  onKeyDown = null
  onKeyUp = null
  onWindowBlur = null
  onPointerMove = null
  onPointerLeave = null
  onOrbitPivotPointerDown = null
  pressedPanKeys.clear()
  lastFrameTimestamp = null
  objectDrawDistanceCursor = 0
  objectLoadStatus.value = null
  hoveredPrefabPath.value = null
  visibleObjectCount.value = 0

  stopWatch?.()
  stopWatch = null

  stopMapObjectsWatch?.()
  stopMapObjectsWatch = null

  stopMapInfoWatch?.()
  stopMapInfoWatch = null

  stopConnectionWatch?.()
  stopConnectionWatch = null

  stopCategoryFilterWatch?.()
  stopCategoryFilterWatch = null

  resizeObserver?.disconnect()
  resizeObserver = null

  controls?.dispose()
  controls = null

  removeCube()
  removeTerrain()
  removeOcean()
  removeLowland()
  removeMapObjects()
  removeModelInstances()

  if (sky) {
    scene?.remove(sky)
    sky.geometry.dispose()
    sky.material.dispose()
    sky = null
  }

  if (renderer && onContextLost) {
    renderer.domElement.removeEventListener('webglcontextlost', onContextLost)
  }
  if (renderer && onContextRestored) {
    renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored)
  }
  onContextLost = null
  onContextRestored = null

  renderer?.dispose()
  if (renderer?.domElement.parentElement) {
    renderer.domElement.parentElement.removeChild(renderer.domElement)
  }

  scene = null
  camera = null
  renderer = null
})
</script>

<template>
  <div class="relative w-full h-[1200px]">
    <div ref="container" class="w-full h-full"></div>
    <div v-if="hoveredPrefabPath" class="absolute left-3 top-3 max-w-[70%] truncate rounded-lg border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white/80 backdrop-blur select-none pointer-events-none">
      {{ hoveredPrefabPath }}
    </div>
    <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center pointer-events-none">
      <Loader2 class="animate-spin text-white/40" :size="50" />
    </div>
    <div v-if="contextLost" class="absolute inset-0 flex items-center justify-center bg-black/70 text-center text-sm text-white/80 p-4">
      WebGL context lost — likely too many unique models loaded at once. Try reloading the page.
    </div>
    <div v-if="objectLoadStatus" class="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none bg-black/30">
      <Loader2 class="animate-spin text-white/60" :size="40" />
      <span class="text-xs text-white/80 select-none">
        <template v-if="objectLoadStatus.phase === 'models'">
          Loading models… {{ objectLoadStatus.loaded }} / {{ objectLoadStatus.total }}
          ({{ objectLoadStatus.total > 0 ? Math.round((objectLoadStatus.loaded / objectLoadStatus.total) * 100) : 0 }}%)
        </template>
        <template v-else>
          Building {{ objectLoadStatus.total.toLocaleString() }} objects…
        </template>
      </span>
    </div>
    <div v-if="selectedServer?.TerrainInfo" class="absolute left-3 bottom-3 text-xs text-white/50 select-none">
      Resolution {{ selectedServer.TerrainInfo.res }} · World size {{ selectedServer.TerrainInfo.worldSize }} · Height range {{ Math.round(selectedServer.TerrainInfo.sizeY) }}
      <template v-if="selectedServer?.MapObjects">
        · Objects {{ selectedServer.MapObjects.length.toLocaleString() }} · Visible {{ visibleObjectCount.toLocaleString() }}
      </template>
    </div>
    <div class="absolute right-3 top-3 flex flex-col gap-1.5 rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white/80 backdrop-blur select-none">
      <label class="flex cursor-pointer items-center gap-2">
        <input type="checkbox" v-model="showTrees" />
        Trees
      </label>
      <label class="flex cursor-pointer items-center gap-2">
        <input type="checkbox" v-model="showRocks" />
        Rocks
      </label>
      <label class="flex cursor-pointer items-center gap-2">
        <input type="checkbox" v-model="showMonuments" />
        Monuments
      </label>
      <label class="flex cursor-pointer items-center gap-2">
        <input type="checkbox" v-model="showDungeons" />
        Dungeons
      </label>
      <label class="flex cursor-pointer items-center gap-2">
        <input type="checkbox" v-model="showClutter" />
        Clutter
      </label>
    </div>
  </div>
</template>

<style scoped>
</style>
