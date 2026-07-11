<script lang="ts" setup>
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Sky } from 'three/examples/jsm/objects/Sky.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Loader2 } from 'lucide-vue-next'
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { selectedServer } from './ControlPanel.SaveLoad'
import { loadModel, resolveModelUrl, cloneModel } from '@/utils/GltfCache'

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
const OBJECT_MIN_SCENE_SIZE = 0.01
const OBJECT_COLOR = 0xffaa00
// Fallback cube color for live entities (see syncLiveEntities) whose prefab id couldn't be
// resolved to a real model — distinct from OBJECT_COLOR so dynamic entities read as different
// from static placed-prefab fallbacks at a glance.
const LIVE_ENTITY_FALLBACK_COLOR = 0xff3355
const MODEL_LOAD_CONCURRENCY = 246
// Real props are grouped into a grid of spatial chunks (one InstancedMesh per chunk+model, rather
// than one per whole-map+model) so draw distance can toggle whole chunks — checking a few hundred
// chunk centers per frame — instead of needing per-instance visibility, which InstancedMesh can't
// do cheaply (its instance buffer would need re-uploading every time anything changes).
const CHUNK_GRID_DIVISIONS = 16
const CHUNK_SIZE = TERRAIN_TARGET_SIZE / CHUNK_GRID_DIVISIONS
// Max horizontal (XZ) distance from the camera, in scene units, at which a chunk of real props
// still renders. Tune to taste — this is the main lever for large/dense maps; lower trades visible
// coverage for more headroom.
const OBJECT_DRAW_DISTANCE = 4
// A full draw-distance sweep over all chunks (see stepObjectDrawDistance) completes in about this
// many animation frames (~1.5s at 60fps) regardless of how many chunks the map produced. Rather
// than re-evaluating every chunk at once on a timer — which pops every newly in/out-of-range chunk
// visible/invisible in the same instant — a slice is swept each frame, cycling continuously
// through all chunks, so the draw-distance boundary updates gradually as the camera moves. (A
// fixed chunks-per-frame count instead of this frame target made dense maps take several seconds
// to notice the camera had moved away, leaving out-of-range chunks rendering the whole time.)
const DRAW_DISTANCE_SWEEP_FRAMES = 90
// Rendering above 2x device pixel ratio (4K/retina laptops often report 2-3x) multiplies fragment
// work for detail nobody can see at this viewer's scale — the single biggest fill-rate lever.
const MAX_PIXEL_RATIO = 2
// WASD pan speed, scaled by current camera-to-target distance per second so it feels proportional
// whether zoomed in close or panned out over a whole (possibly huge) map.
const PAN_SPEED = 0.85
const PAN_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE'])
// Caps how far ahead the orbit pivot (see onOrbitPivotPointerDownHandler) can be placed when the
// camera is looking level or upward, where a literal ground intersection would shoot out to
// infinity (or behind the camera).
const MAX_ORBIT_PIVOT_DISTANCE = TERRAIN_TARGET_SIZE * 3
// Animated shoreline wave (see installShoreWaveShader) — a single faded ring that traces the
// coastline out at sea and steadily closes in toward the shore, fading out as it arrives, then
// restarting further out. Depth (sea level minus terrain height at that point) stands in for
// "distance from shore" here, so these are all in the same scene-unit space as terrain height —
// tune alongside HEIGHT_EXAGGERATION if the terrain's vertical scale changes a lot.
const WAVE_MAX_DEPTH = 0.4
const WAVE_BAND_WIDTH = 0.01
const WAVE_PERIOD_SECONDS = 10
const WAVE_COLOR = 0xf3fbff

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
let oceanDeep: THREE.Mesh | null = null
let oceanShallow: THREE.Mesh | null = null
let oceanShoreline: THREE.Mesh | null = null
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
let oceanHeightMap: THREE.DataTexture | null = null
let waveShaderUniforms: { uTime: { value: number } } | null = null
let waveElapsedTime = 0
// Live entities (see syncLiveEntities) get one plain Object3D each — a fallback cube immediately,
// swapped for a real cloned model once/if one loads — rather than the InstancedMesh-per-chunk
// batching used for static MapObjects, since the expected count here is far smaller and they need
// independent per-frame position updates.
let liveEntityGroup: THREE.Group | null = null
const liveEntityObjects = new Map<bigint, THREE.Object3D>()
// Cached snapshot of liveEntityObjects' values for stepLiveEntityDrawDistance — invalidated (set
// to null) whenever membership changes, instead of Array.from()-ing the map every animation frame.
let liveEntityList: THREE.Object3D[] | null = null
let liveEntityFallbackGeometry: THREE.BufferGeometry | null = null
let liveEntityFallbackMaterial: THREE.Material | null = null
let liveEntityPlacement: { worldSize: number; positionY: number; planarScale: number; heightScale: number } | null = null
let liveEntityDrawDistanceCursor = 0
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
// Set by onPointerMove, consumed by animate() — coalesces however many pointermove events arrive
// between frames into a single hover raycast per rendered frame.
let hoverUpdatePending = false

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

// Static scenery never moves after placement — freeze the transforms so the renderer's per-frame
// updateMatrixWorld pass stops recomposing local matrices and re-multiplying world matrices for
// thousands of objects that are guaranteed not to have changed. Anything that DOES move later
// (the placeholder cube, live entities, the camera) must keep matrixAutoUpdate on.
function freezeStaticTransforms(root: THREE.Object3D) {
  root.updateMatrixWorld(true)
  root.traverse((object) => {
    object.matrixAutoUpdate = false
  })
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
  oceanHeightMap?.dispose()
  oceanHeightMap = null

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
  waveShaderUniforms = null

  if (!oceanDeep || !oceanShallow || !oceanShoreline) {
    return
  }
  scene?.remove(oceanDeep)
  scene?.remove(oceanShallow)
  scene?.remove(oceanShoreline)
  oceanDeep.geometry.dispose()
  oceanShallow.geometry.dispose()
  oceanShoreline.geometry.dispose()

  ;(oceanDeep.material as THREE.Material).dispose()
  ;(oceanShallow.material as THREE.Material).dispose()
  ;(oceanShoreline.material as THREE.Material).dispose()

  oceanDeep = null
  oceanShallow = null
  oceanShoreline = null
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
  freezeStaticTransforms(lowland)
}

// Patches a couple of insertion points in MeshStandardMaterial's own shader (rather than a full
// custom ShaderMaterial) so oceanShallow keeps its existing PBR lighting/transparency and only
// gains a single animated wave ring. Reads terrain height back from oceanHeightMap — built
// alongside the terrain mesh from the exact same heightmap samples — so the ring traces the real,
// irregular coastline as it closes in, rather than a fixed-radius circle.
function installShoreWaveShader(material: THREE.MeshStandardMaterial, heightMap: THREE.DataTexture, seaLevelY: number, heightWorldScale: number) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: waveElapsedTime }
    shader.uniforms.uHeightMap = { value: heightMap }
    shader.uniforms.uSeaLevel = { value: seaLevelY }
    shader.uniforms.uHeightWorldScale = { value: heightWorldScale }
    shader.uniforms.uTerrainSize = { value: TERRAIN_TARGET_SIZE }
    shader.uniforms.uWaveMaxDepth = { value: WAVE_MAX_DEPTH }
    shader.uniforms.uWaveBandWidth = { value: WAVE_BAND_WIDTH }
    shader.uniforms.uWavePeriod = { value: WAVE_PERIOD_SECONDS }
    shader.uniforms.uWaveColor = { value: new THREE.Color(WAVE_COLOR) }

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vShoreWorldPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvShoreWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;')

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vShoreWorldPos;
        uniform sampler2D uHeightMap;
        uniform float uTime;
        uniform float uSeaLevel;
        uniform float uHeightWorldScale;
        uniform float uTerrainSize;
        uniform float uWaveMaxDepth;
        uniform float uWaveBandWidth;
        uniform float uWavePeriod;
        uniform vec3 uWaveColor;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          // Inverse of objectScenePosition/buildTerrain's vertex UV assignment — maps this
          // fragment's world XZ back to the terrain's own [0,1] UV space so both sample the exact
          // same heightmap texel layout.
          vec2 shoreUv = vec2(0.5 - vShoreWorldPos.x / uTerrainSize, 0.5 + vShoreWorldPos.z / uTerrainSize);
          float inBounds = step(0.0, shoreUv.x) * step(shoreUv.x, 1.0) * step(0.0, shoreUv.y) * step(shoreUv.y, 1.0);
          float terrainHeight = texture2D(uHeightMap, shoreUv).r * uHeightWorldScale;
          float depth = uSeaLevel - terrainHeight;

          // The ring's target depth counts down from uWaveMaxDepth (out at sea) to 0 (right at the
          // coast) once per uWavePeriod, then wraps — closing in on the island every cycle. The
          // sine envelope fades it in as it starts, and back out as it reaches shore, instead of
          // an abrupt cut, so it visibly "disappears" rather than snapping off.
          float phase = fract(uTime / uWavePeriod);
          float waveDepth = mix(uWaveMaxDepth, 0.0, phase);
          float band = 1.0 - smoothstep(0.0, uWaveBandWidth, abs(depth - waveDepth));
          float envelope = sin(3.14159265 * phase);
          float intensity = inBounds * step(0.0, depth) * band * envelope;

          diffuseColor.rgb = mix(diffuseColor.rgb, uWaveColor, clamp(intensity, 0.0, 1.0));
        }`)

    waveShaderUniforms = shader.uniforms as unknown as { uTime: { value: number } }
  }
}

function buildOcean(positionY: number, heightScale: number, sizeY: number) {
  if (!scene) {
    return
  }
  removeOcean()

  const oceanDeepGeometry = new THREE.PlaneGeometry(OCEAN_SIZE, OCEAN_SIZE)
  const oceanShallowGeometry = new THREE.PlaneGeometry(OCEAN_SIZE, OCEAN_SIZE)
  const oceanShorelineGeometry = new THREE.PlaneGeometry(OCEAN_SIZE, OCEAN_SIZE)
  oceanDeepGeometry.rotateX(-Math.PI / 2)
  oceanShallowGeometry.rotateX(-Math.PI / 2)
  oceanShorelineGeometry.rotateX(-Math.PI / 2)

  oceanDeep = new THREE.Mesh(oceanDeepGeometry, new THREE.MeshStandardMaterial({
    color: new THREE.Color(0, 0, 0),
    transparent: false,
    opacity: 1,
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide
  }))
  oceanDeep.position.y = -(positionY + 40) * heightScale

  const shallowMaterial = new THREE.MeshStandardMaterial({
    color: 0x1c7ed6,
    transparent: true,
    opacity: 0.3,
    roughness: 1,
    metalness: 1,
    side: THREE.DoubleSide
  })
  const seaLevelY = -positionY * heightScale
  if (oceanHeightMap) {
    installShoreWaveShader(shallowMaterial, oceanHeightMap, seaLevelY, sizeY * heightScale)
  }
  oceanShallow = new THREE.Mesh(oceanShallowGeometry, new THREE.MeshStandardMaterial({
    color: 0x1c7ed6,
    transparent: true,
    opacity: 0.5,
    roughness: .5,
    metalness: 0,
    side: THREE.DoubleSide
  }))
  oceanShallow.position.y = seaLevelY
  oceanShoreline = new THREE.Mesh(oceanShorelineGeometry, shallowMaterial)
  oceanShoreline.position.y = seaLevelY
  scene.add(oceanDeep)
  scene.add(oceanShallow)
  scene.add(oceanShoreline)
  freezeStaticTransforms(oceanDeep)
  freezeStaticTransforms(oceanShallow)
  freezeStaticTransforms(oceanShoreline)
}

// Pass `out` from per-frame/hot-loop callers to avoid allocating a fresh Vector3 per call — with
// tens of thousands of prefabs (and live entities re-placed every frame) that garbage adds up.
function objectScenePosition(p: { x: number; y: number; z: number }, worldSize: number, positionY: number, planarScale: number, heightScale: number, out: THREE.Vector3 = new THREE.Vector3()) {
  const originX = -worldSize / 2
  const originZ = -worldSize / 2
  return out.set(
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
function objectSceneScale(s: { x: number; y: number; z: number }, planarScale: number, out: THREE.Vector3 = new THREE.Vector3()) {
  return out.set(s.x * planarScale, s.y * planarScale, s.z * planarScale)
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
  // The InstancedMeshes here reuse geometry/material buffers owned by the cached source model
  // (or by mergedModelPartsCache) — only detach from the scene, never dispose, or every future
  // instance of that model (and the cache entry itself) breaks.
  scene?.remove(modelInstances)
  modelInstances = null
  objectChunks = []
  objectDrawDistanceCursor = 0
  visibleObjectCount.value = 0
  // Whatever instance the cursor was over may no longer exist (or mean something different) once
  // rebuilt — clear the stale tooltip rather than leave a wrong answer showing.
  hoveredPrefabPath.value = null
}

// Every live entity's Object3D is either a fallback cube sharing liveEntityFallbackGeometry/Material
// (disposed once, below) or a cloned real model sharing GltfCache-owned buffers (same rule as
// removeModelInstances above — never dispose those, or every future instance of that model breaks)
// — so removing the whole group and disposing the shared fallback buffers is all that's needed.
function removeLiveEntities() {
  liveEntityObjects.clear()
  liveEntityList = null
  liveEntityDrawDistanceCursor = 0

  if (liveEntityGroup) {
    scene?.remove(liveEntityGroup)
    liveEntityGroup = null
  }

  liveEntityFallbackGeometry?.dispose()
  liveEntityFallbackGeometry = null
  liveEntityFallbackMaterial?.dispose()
  liveEntityFallbackMaterial = null
  liveEntityPlacement = null
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

// Runs at most once per animation frame (see the hoverUpdatePending handoff in onPointerMove /
// animate) rather than on every pointermove event, which can fire several times per frame.
// Raycasting an InstancedMesh tests every instance's triangles and the raycaster does NOT skip
// invisible meshes on its own, so only chunks currently visible (within draw distance and not
// hidden) are pushed as targets — that pruning is what keeps this affordable on dense maps.
function updateHoveredPrefab() {
  if (!camera) {
    return
  }

  const targets: THREE.InstancedMesh[] = []
  for (const mesh of fallbackCubeMeshes) {
    if (mesh.visible) {
      targets.push(mesh)
    }
  }
  if (modelInstances) {
    for (const child of modelInstances.children) {
      if (child.visible && child instanceof THREE.InstancedMesh) {
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
  if (oceanDeep) surfaces.push(oceanDeep)
  if (oceanShallow) surfaces.push(oceanShallow)
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

// Runs every animation frame, re-checking only a DRAW_DISTANCE_SWEEP_FRAMES-th of the chunks (a
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
  const batchSize = Math.max(1, Math.ceil(objectChunks.length / DRAW_DISTANCE_SWEEP_FRAMES))
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

const liveEntityScratchPosition = new THREE.Vector3()

function createLiveEntityFallbackCube(): THREE.Mesh {
  if (!liveEntityFallbackGeometry) {
    liveEntityFallbackGeometry = new THREE.BoxGeometry(1, 1, 1)
  }
  if (!liveEntityFallbackMaterial) {
    liveEntityFallbackMaterial = new THREE.MeshStandardMaterial({ color: LIVE_ENTITY_FALLBACK_COLOR, roughness: 0.5, metalness: 0.1 })
  }
  return new THREE.Mesh(liveEntityFallbackGeometry, liveEntityFallbackMaterial)
}

// Runs every animation frame — cheap since live entities (players, deployables, dropped items,
// etc. tracked via Server.LiveEntities) are expected to be far fewer than the tens of thousands of
// static placed prefabs, so a plain per-entity Object3D updated directly is simpler than the
// InstancedMesh/chunk machinery those use. A fallback cube shows immediately on spawn; if the
// entity's prefab id resolved to a known path, it's swapped for a real cloned model once loaded.
// Entities removed from Server.LiveEntities (Entity Destroyed, see OnFakePlayerRPC in
// SaveLoad.ts) are pruned below the same way — this only ever sees the current snapshot, so a
// destroyed-then-never-reported entity has no way to linger here.
function syncLiveEntities() {
  if (!scene) {
    return
  }

  const data = selectedServer.value?.LiveEntities
  if (!data || !liveEntityPlacement) {
    if (liveEntityObjects.size > 0) {
      removeLiveEntities()
    }
    return
  }

  if (!liveEntityGroup) {
    liveEntityGroup = new THREE.Group()
    scene.add(liveEntityGroup)
  }
  const group = liveEntityGroup

  for (const [id, object] of liveEntityObjects) {
    if (!data.has(id)) {
      group.remove(object)
      liveEntityObjects.delete(id)
      liveEntityList = null
    }
  }

  const { worldSize, positionY, planarScale, heightScale } = liveEntityPlacement
  const drawDistanceSq = OBJECT_DRAW_DISTANCE * OBJECT_DRAW_DISTANCE

  for (const [id, entity] of data) {
    const position = objectScenePosition(entity.position, worldSize, positionY, planarScale, heightScale, liveEntityScratchPosition)
    let object = liveEntityObjects.get(id)
    if (!object) {
      object = createLiveEntityFallbackCube()
      object.scale.copy(fallbackCubeScale({ x: 1, y: 1, z: 1 }, planarScale))
      // Gives it a correct visibility right away instead of defaulting to visible until
      // stepLiveEntityDrawDistance's rolling sweep happens to reach it, which — with many
      // entities — could otherwise take a while.
      if (camera) {
        const dx = position.x - camera.position.x
        const dz = position.z - camera.position.z
        object.visible = dx * dx + dz * dz <= drawDistanceSq
      }
      group.add(object)
      liveEntityObjects.set(id, object)
      liveEntityList = null

      if (entity.path) {
        const pendingObject = object
        const pendingPlacement = liveEntityPlacement
        loadModel(resolveModelUrl(entity.path)).then((model) => {
          // Bail if the entity despawned, the map was rebuilt, or this placeholder was already
          // replaced by the time the model finished loading.
          if (!scene || !model || liveEntityPlacement !== pendingPlacement || liveEntityObjects.get(id) !== pendingObject) {
            return
          }
          const realObject = cloneModel(model)
          realObject.scale.copy(objectSceneScale({ x: 1, y: 1, z: 1 }, planarScale))
          realObject.position.copy(pendingObject.position)
          realObject.quaternion.copy(pendingObject.quaternion)
          realObject.visible = pendingObject.visible
          group.remove(pendingObject)
          group.add(realObject)
          liveEntityObjects.set(id, realObject)
          liveEntityList = null
        })
      }
    }

    object.position.copy(position)
    unityEulerToThreeQuaternion(entity.rotation, object.quaternion)
  }
}

// Mirrors stepObjectDrawDistance's approach for static prefab chunks: only re-checks a small slice
// per frame (cycling through) rather than every live entity at once, so the draw-distance boundary
// updates the same gradual way as everything else on the map instead of popping all at once.
function stepLiveEntityDrawDistance() {
  if (!camera || liveEntityObjects.size === 0) {
    return
  }

  if (!liveEntityList) {
    liveEntityList = Array.from(liveEntityObjects.values())
  }
  const entries = liveEntityList
  if (liveEntityDrawDistanceCursor >= entries.length) {
    liveEntityDrawDistanceCursor = 0
  }

  const drawDistanceSq = OBJECT_DRAW_DISTANCE * OBJECT_DRAW_DISTANCE
  const batchSize = Math.max(1, Math.ceil(entries.length / DRAW_DISTANCE_SWEEP_FRAMES))

  for (let i = 0; i < batchSize; i++) {
    const object = entries[liveEntityDrawDistanceCursor]
    const dx = object.position.x - camera.position.x
    const dz = object.position.z - camera.position.z
    object.visible = dx * dx + dz * dz <= drawDistanceSq
    liveEntityDrawDistanceCursor = (liveEntityDrawDistanceCursor + 1) % entries.length
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

const IDENTITY_MATRIX = new THREE.Matrix4()

// Merged-parts cache, keyed by model path. Entries reference geometry either shared with the
// GltfCache model itself (parts that had nothing to merge with) or owned here (merged copies) —
// in both cases they live for the whole page session, exactly like GltfCache's own entries, and
// must never be disposed by the per-map rebuild path.
const mergedModelPartsCache = new Map<string, ModelPart[]>()

function getMergedModelParts(path: string, model: THREE.Object3D): ModelPart[] {
  let parts = mergedModelPartsCache.get(path)
  if (!parts) {
    parts = mergeModelParts(extractModelParts(model))
    mergedModelPartsCache.set(path, parts)
  }
  return parts
}

// Collapses a model's parts down to one part per MATERIAL by baking each part's local transform
// into a merged copy of its geometry. Draw calls, scene-graph objects per chunk, and duplicated
// instance-matrix buffers all scale with part count — a many-mesh prop sharing a couple of
// materials collapses from dozens of InstancedMeshes per chunk down to a couple. Merged parts get
// an identity localMatrix, which also lets every part of a model share one placement buffer
// outright (see buildMapObjects).
function mergeModelParts(rawParts: ModelPart[]): ModelPart[] {
  const byMaterial = new Map<THREE.Material, ModelPart[]>()
  for (const part of rawParts) {
    let group = byMaterial.get(part.material)
    if (!group) {
      group = []
      byMaterial.set(part.material, group)
    }
    group.push(part)
  }

  const parts: ModelPart[] = []
  for (const [material, group] of byMaterial) {
    if (group.length === 1) {
      // Nothing to merge — keep sharing the cache-owned geometry rather than copying it.
      parts.push(group[0])
      continue
    }
    const merged = tryMergePartGeometries(group)
    if (merged) {
      parts.push({ geometry: merged, material, localMatrix: IDENTITY_MATRIX.clone() })
    } else {
      parts.push(...group)
    }
  }
  return parts
}

// mergeGeometries requires every input to carry the exact same attribute layout — normalize the
// copies down to the attributes the whole group shares, and bail out (null → the caller keeps the
// parts separate, which always renders correctly) on anything exotic rather than risk producing
// corrupted buffers.
function tryMergePartGeometries(group: ModelPart[]): THREE.BufferGeometry | null {
  for (const part of group) {
    for (const attribute of Object.values(part.geometry.attributes)) {
      if ((attribute as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute) {
        return null
      }
    }
  }

  const first = group[0].geometry
  const commonNames = Object.keys(first.attributes).filter((name) =>
    group.every((part) => {
      const attribute = part.geometry.attributes[name]
      return attribute && attribute.itemSize === first.attributes[name].itemSize && attribute.normalized === first.attributes[name].normalized
    })
  )
  if (!commonNames.includes('position')) {
    return null
  }

  let clones = group.map((part) => {
    const clone = part.geometry.clone()
    clone.applyMatrix4(part.localMatrix)
    for (const name of Object.keys(clone.attributes)) {
      if (!commonNames.includes(name)) {
        clone.deleteAttribute(name)
      }
    }
    // These placeholders never animate morph targets, and mismatched morph sets break merging.
    clone.morphAttributes = {}
    return clone
  })

  if (clones.some((clone) => clone.index !== null) && !clones.every((clone) => clone.index !== null)) {
    clones = clones.map((clone) => (clone.index !== null ? clone.toNonIndexed() : clone))
  }

  try {
    return mergeGeometries(clones, false)
  } catch {
    return null
  }
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
    freezeStaticTransforms(instancedMesh)
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
    const partMatrix = new THREE.Matrix4()
    const rotation = new THREE.Quaternion()
    const scale = new THREE.Vector3()
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

      // The placement transform (position/rotation/scale) is identical for every part of a model,
      // so it's composed once per instance here — and merged parts (identity localMatrix, the
      // common case) share this one buffer outright instead of each composing and storing its own
      // copy of the same matrices.
      const instanceCount = cell.entries.length
      const placementArray = new Float32Array(instanceCount * 16)
      for (let i = 0; i < instanceCount; i++) {
        const { prefab, position } = cell.entries[i]
        placementMatrix.compose(position, unityEulerToThreeQuaternion(prefab.rotation, rotation), objectSceneScale(prefab.scale, planarScale, scale))
        placementMatrix.toArray(placementArray, i * 16)
      }
      const sharedPlacementAttribute = new THREE.InstancedBufferAttribute(placementArray, 16)
      // Instance index -> source prefab, so hover raycasting can resolve which prefab was hit.
      const cellPrefabs = cell.entries.map((entry) => entry.prefab)

      for (const part of getMergedModelParts(cell.path, model)) {
        const instancedMesh = new THREE.InstancedMesh(part.geometry, part.material, instanceCount)
        if (part.localMatrix.equals(IDENTITY_MATRIX)) {
          instancedMesh.instanceMatrix = sharedPlacementAttribute
        } else {
          for (let i = 0; i < instanceCount; i++) {
            partMatrix.fromArray(placementArray, i * 16).multiply(part.localMatrix)
            instancedMesh.setMatrixAt(i, partMatrix)
          }
          instancedMesh.instanceMatrix.needsUpdate = true
        }
        instancedMesh.userData.prefabs = cellPrefabs
        group.add(instancedMesh)
        chunk.meshes.push(instancedMesh)
      }
    }

    modelInstances = group
    scene.add(group)
    freezeStaticTransforms(group)

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
  removeLiveEntities()

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
    // Low-res copy of the same height samples below, as a texture the ocean's shore-wave shader
    // can sample to find the coastline (see installShoreWaveShader) — an 8-bit channel is plenty
    // of precision for that, and avoids depending on float-texture support.
    const shoreHeightData = new Uint8Array(gridSize * gridSize)

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
        shoreHeightData[vertexIndex] = Math.round(height01 * 255)

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
    freezeStaticTransforms(terrain)

    oceanHeightMap?.dispose()
    oceanHeightMap = new THREE.DataTexture(shoreHeightData, gridSize, gridSize, THREE.RedFormat, THREE.UnsignedByteType)
    // Matches the mirrored-X/row-major convention used for the terrain's own `uv` attribute above
    // (and, in turn, the map-image texture in applyMapTexture) — without this the wave shader would
    // sample flipped/mirrored terrain heights and trace the coastline on the wrong side.
    oceanHeightMap.flipY = true
    oceanHeightMap.wrapS = THREE.ClampToEdgeWrapping
    oceanHeightMap.wrapT = THREE.ClampToEdgeWrapping
    oceanHeightMap.minFilter = THREE.LinearFilter
    oceanHeightMap.magFilter = THREE.LinearFilter
    oceanHeightMap.generateMipmaps = false
    oceanHeightMap.needsUpdate = true

    buildLowland()
    buildOcean(positionY, heightScale, sizeY)

    liveEntityPlacement = { worldSize, positionY, planarScale: TERRAIN_TARGET_SIZE / worldSize, heightScale }

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

  waveElapsedTime += deltaSeconds
  if (waveShaderUniforms) {
    waveShaderUniforms.uTime.value = waveElapsedTime
  }

  stepObjectDrawDistance()
  syncLiveEntities()
  stepLiveEntityDrawDistance()

  if (hoverUpdatePending) {
    hoverUpdatePending = false
    updateHoveredPrefab()
  }

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
  // The scene root never moves, but with matrixAutoUpdate on it flags matrixWorldNeedsUpdate every
  // frame, which FORCE-cascades world-matrix recomputation down to every descendant — silently
  // undoing freezeStaticTransforms for the thousands of static chunk meshes below it.
  scene.matrixAutoUpdate = false
  scene.fog = new THREE.Fog(0xbfd9e8, 60, 320)

  // near=0.02 (instead of an extreme 0.001) keeps a plain 24-bit depth buffer precise enough out
  // to the fog limit, so logarithmicDepthBuffer isn't needed — that mode writes gl_FragDepth per
  // fragment, which disables the GPU's early-depth rejection and makes every layer of overdraw
  // (dense forests, the full-screen ocean planes) pay full shading cost.
  camera = new THREE.PerspectiveCamera(60, width / height, 0.02, 5000)
  camera.position.set(14, 12, 18)
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO))
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
  freezeStaticTransforms(sky)

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
    // Deferred to the next animation frame instead of raycasting inline, and skipped outright
    // while a button is held — during orbit drags this would otherwise raycast dense instanced
    // geometry continuously for a tooltip nobody is reading mid-drag.
    hoverUpdatePending = event.buttons === 0
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

  selectedServer.value?.LiveEntities.clear()
  requestTerrain()
  requestMapObjects()
  requestMapInfo()
  selectedServer.value?.sendCall('LoadStringPool')
  selectedServer.value?.sendCall('SendFakePlayerSnapshot')
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
  waveElapsedTime = 0
  hoverUpdatePending = false
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
  removeLiveEntities()

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
