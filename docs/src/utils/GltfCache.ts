import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// resolveModelUrl() below always keeps the leading "assets/" from the server-resolved path (e.g.
// "assets/bundled/prefabs/campfire.prefab"), so this base must NOT itself end in "assets/" or the
// final URL doubles up (".../assets/assets/bundled/..."). Was '/' while assets were self-hosted
// under docs/public/assets during testing.
const ASSET_BASE_URL = 'https://cdn.carbonmod.gg/rustassets/';

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

const modelCache = new Map<string, Promise<THREE.Object3D | null>>();

// Converts a Rust asset path (as resolved by StringPool.Get on the server) into a loadable model URL.
export function resolveModelUrl(assetPath: string): string {
  const glbPath = assetPath.replace(/\.prefab$/i, '.glb');
  return ASSET_BASE_URL + glbPath.replace(/^\/+/, '');
}

// Many of these GLBs embed real lights via KHR_lights_punctual (campfires, lanterns, lasers...),
// which GLTFLoader turns into actual THREE.Light objects. Cloning a lit prop per instance across
// a whole map adds one real light per instance — quickly exceeding the GPU's fragment shader
// uniform budget and breaking shader compilation for every material in the scene, not just the
// lit ones. We only want a rough placeholder here, not per-prop dynamic lighting, so strip them.
function stripEmbeddedLights(root: THREE.Object3D) {
  const lights: THREE.Light[] = [];
  root.traverse((child) => {
    if (child instanceof THREE.Light) {
      lights.push(child);
    }
  });
  for (const light of lights) {
    light.parent?.remove(light);
  }
}

// GLTFLoader already honors a glTF material's declared alphaMode (MASK/BLEND), but Rust's asset
// conversion pipeline doesn't reliably set that even for prefabs whose textures clearly need real
// transparency, leaving them OPAQUE. Rather than inspecting texture pixels, prefab paths matching
// one of these known-transparent categories get transparency forced on instead — extend this list
// as more categories turn up looking wrong (opaque where they should be see-through).
const TRANSPARENT_PATH_PATTERN = /grass|glass|leaf|foliage|bush|palm|power_sub|jungle|water_well|marketplace|collapsed_bits|sphere_tank|road|slab|vine|rubble|tunnel|fence|net|curtain|tarp/i;

// Enables blending for every textured material in a model whose resolved URL (and therefore
// prefab path — see resolveModelUrl) matches TRANSPARENT_PATH_PATTERN. Materials that already
// declare transparency or a MASK alphaTest cutout are left alone since GLTFLoader already
// configured those correctly.
// Note: this trades away depth-writing for affected materials (standard for blended transparency),
// which — combined with InstancedMesh not depth-sorting its own instances — can show minor
// draw-order artifacts where several transparent instances of the same model overlap.
function applyTextureTransparency(root: THREE.Object3D, url: string) {
  if (!TRANSPARENT_PATH_PATTERN.test(url)) {
    return;
  }
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial) || material.transparent || material.alphaTest > 0) {
        continue;
      }
      if (material.map) {
        material.transparent = true;
        material.depthWrite = true;
        material.needsUpdate = true;
      }
    }
  });
}

// Loads (and caches) a GLB by URL. Multiple calls for the same URL share one in-flight/loaded promise.
export function loadModel(url: string): Promise<THREE.Object3D | null> {
  let pending = modelCache.get(url);
  if (!pending) {
    pending = new Promise((resolve) => {
      gltfLoader.load(
        url,
        (gltf) => {
          stripEmbeddedLights(gltf.scene);
          applyTextureTransparency(gltf.scene, url);
          resolve(gltf.scene);
        },
        undefined,
        (err) => {
          console.warn(`Failed to load model "${url}"`, err);
          resolve(null);
        }
      );
    });
    modelCache.set(url, pending);
  }
  return pending;
}

// Clones a loaded model for reuse across multiple placed instances (shares geometry/material buffers).
export function cloneModel(model: THREE.Object3D): THREE.Object3D {
  return model.clone(true);
}
