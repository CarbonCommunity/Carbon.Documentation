<template>
  <div class="zpi-container select-none">
    <div v-if="!isDetached && imgW" class="zpi-controls inline-flex right-3 top-3">
      <button @click="zoomAtCenter(1/zoomStep)">−</button>
      <span>{{ Math.round(scale * 100) }}%</span>
      <button @click="zoomAtCenter(zoomStep)">+</button>
      <button @click="reset()">Reset</button>
      <button v-if="!props.isFullscreen" @click="expand()"><Expand :size="18"/></button>
    </div>
    <div v-if="!isDetached && imgW" :class="'zpi-controls left-3 bottom-2 w-[' + (areEntitiesExpanded ? '350px' : '250px') + '] h-[' + (areEntitiesExpanded ? '100px' : '150px') + ']'">
      <div class="inline-flex m-2">
        <button @click="areEntitiesExpanded = !areEntitiesExpanded">Live Entities</button>
      </div>
      <div v-if="areEntitiesExpanded">
        <span class="grid">
        <button :class="[selectedServer?.hasTrackedType(i) ? 'opacity-100' : 'opacity-50']" v-for="(type, i) in selectedServer?.MapInfo?.availableTypes" v-bind:key="i" @click="selectedServer?.toggleTrackedType(i)">{{ type }}</button>
        </span>
      </div>
    </div>
    <div
      ref="container"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @pointerleave="onPointerUp"
      @dblclick="reset">
        <div v-if="!isDetached" class="zpi-image" :style="{ transform: `translate(${tx}px, ${ty}px) scale(${scale})` }">
          <span v-if="imgW" :style="{ 'min-width': `${mapImage?.clientWidth}px`, 'min-height': `${mapImage?.clientHeight}px` }">
            <span v-if="props.server?.MapInfo?.entities != null" class="grid absolute">
              <div v-for="entity in props.server.MapInfo.entities" v-bind:key="entity" class="absolute" :style="{ transform: `translate(${mapImage?.clientWidth * entity.x}px, ${mapImage?.clientHeight * (1 - entity.y)}px)` }">
              <div class="bg-[#d38f50] w-[5px] h-[5px]">{{ entity.type }} Player</div>
            </div>
            </span>
          </span>
          <img ref="mapImage" @load="onMapImageLoaded" :src="src" draggable="false" />
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Expand, Loader2 } from 'lucide-vue-next'
import { ref, reactive, onMounted, onBeforeUnmount, computed } from 'vue'
import { addPopup, selectedServer } from '../control-panel/ControlPanel.SaveLoad'

type Point = { x: number; y: number }

const areEntitiesExpanded = ref<boolean>(false)
const props = withDefaults(defineProps<{
  title?: string
  subtitle?: string
  isFullscreen?: boolean
  src: string
  minScale?: number
  maxScale?: number
  initialScale?: number
  zoomStep?: number
  wheelZoomSpeed?: number
  server?: any
}>(), {
  title: 'Live Map',
  subtitle: 'Server map with various live synchronized properties and entities.',
  minScale: 0.25,
  maxScale: 10,
  initialScale: 1,
  zoomStep: 1.1,
  wheelZoomSpeed: 0.0012,
})

const container = ref<HTMLDivElement | null>(null)
const mapImage = ref<HTMLDivElement | null>(null)
const isDetached = ref<boolean>(false)
const scale = ref(props.initialScale)
const tx = ref(0)
const ty = ref(0)
const imgW = ref(0)
const imgH = ref(0)

const activePointers = reactive(new Map<number, Point>())
let lastPanAt: Point | null = null
let pinchStart = { distance: 0, midpoint: { x: 0, y: 0 }, scale: props.initialScale, tx: 0, ty: 0 }

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function onMapImageLoaded() { 
  if(mapImage.value == null) {
    return
  }
  imgW.value = mapImage.value.naturalWidth
  imgH.value = mapImage.value.naturalHeight
}

function getContainerPoint(ev: PointerEvent): Point {
  if (!container.value) return { x: 0, y: 0 }
  const rect = container.value.getBoundingClientRect()
  return { x: ev.clientX - rect.left, y: ev.clientY - rect.top }
}

function getMidpointAndDistance(): { midpoint: Point; distance: number } {
  const pts = [...activePointers.values()]
  const [a, b] = pts
  const dx = b.x - a.x
  const dy = b.y - a.y
  return { midpoint: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, distance: Math.hypot(dx, dy) }
}

function zoomAt(p: Point, factor: number) {
  const newScale = clamp(scale.value * factor, props.minScale, props.maxScale)
  const f = newScale / scale.value
  tx.value = p.x - f * (p.x - tx.value)
  ty.value = p.y - f * (p.y - ty.value)
  scale.value = newScale
}

function zoomAtCenter(factor: number) {
  if (!container.value) return
  const rect = container.value.getBoundingClientRect()
  zoomAt({ x: rect.width / 2, y: rect.height / 2 }, factor)
}

function onWheel(ev: WheelEvent) {
  ev.preventDefault()
  const p = getContainerPoint(ev as unknown as PointerEvent)
  const factor = Math.exp(-ev.deltaY * props.wheelZoomSpeed)
  zoomAt(p, factor)
}

function onPointerDown(ev: PointerEvent) {
  container.value?.setPointerCapture(ev.pointerId)
  const p = getContainerPoint(ev)
  activePointers.set(ev.pointerId, p)
  if (activePointers.size === 1) {
    lastPanAt = p
  } else if (activePointers.size === 2) {
    const { midpoint, distance } = getMidpointAndDistance()
    pinchStart = { midpoint, distance, scale: scale.value, tx: tx.value, ty: ty.value }
  }
}

function onPointerMove(ev: PointerEvent) {
  if (!activePointers.has(ev.pointerId)) return
  const p = getContainerPoint(ev)
  activePointers.set(ev.pointerId, p)

  if (activePointers.size === 1 && lastPanAt) {
    const dx = p.x - lastPanAt.x
    const dy = p.y - lastPanAt.y
    tx.value += dx
    ty.value += dy
    lastPanAt = p
  } else if (activePointers.size === 2) {
    const { midpoint, distance } = getMidpointAndDistance()
    if (pinchStart.distance > 0) {
      const factor = distance / pinchStart.distance
      scale.value = clamp(pinchStart.scale * factor, props.minScale, props.maxScale)
      const f = scale.value / pinchStart.scale
      tx.value = pinchStart.midpoint.x - f * (pinchStart.midpoint.x - pinchStart.tx)
      ty.value = pinchStart.midpoint.y - f * (pinchStart.midpoint.y - pinchStart.ty)
    }
  }
}

function onPointerUp(ev: PointerEvent) {
  if (container.value?.hasPointerCapture(ev.pointerId)) {
    container.value.releasePointerCapture(ev.pointerId)
  }
  activePointers.delete(ev.pointerId)
  if (activePointers.size <= 1) {
    lastPanAt = activePointers.size === 1 ? [...activePointers.values()][0] : null
  }
}

function reset() {
  scale.value = props.initialScale
  tx.value = 0
  ty.value = 0
}

async function expand() {
  const windowProps = {
    src: props.src,
    isFullscreen: true,
    server: props.server,
    onClosed: () => {
      isDetached.value = false
    }
  }
  isDetached.value = true
  addPopup((await import(`@/components/control-panel/ControlPanel.Popup.Map.vue`)).default, windowProps)
}

onMounted(() => {
  if (!container.value) return
  container.value.addEventListener('wheel', onWheel, { passive: false })
  reset()
})
onBeforeUnmount(() => {
  container.value?.removeEventListener('wheel', onWheel as any)
})

defineExpose({ reset, zoomAtCenter })
</script>

<style scoped>
.zpi-container {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
  touch-action: none;
  background: rgba(0,0,0,0.15);
  border-radius: 8px;
  touch-action: none;
}

.zpi-image {
  position: absolute;
  top: 0;
  left: 0;
  user-select: none;
  transform-origin: 0 0;
}

.zpi-controls {
  position: absolute;
  gap: 6px;
  align-items: center;
  padding: 6px 8px;
  border-radius: 10px;
  background: rgba(0,0,0,0.45);
  backdrop-filter: blur(3px);
  z-index: 2;
}
.zpi-controls button {
  appearance: none;
  border: 0;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(255,255,255,0.08);
  color: #eaeaea;
  font-weight: 600;
  cursor: pointer;
}
.zpi-controls span {
  color: #cfcfcf;
  font-variant-numeric: tabular-nums;
  min-width: 3.5ch;
  text-align: right;
  touch-action: auto;
  pointer-events: auto;

}
.zpi-controls button:hover {
  background: rgba(255,255,255,0.16);
}
</style>
