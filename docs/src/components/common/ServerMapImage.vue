<template>
  <div class="zpi-container select-none relative">
    <!-- Top-right controls -->
    <div
      v-if="!isDetached && imgW"
      class="zpi-controls absolute right-3 top-3 inline-flex items-center gap-2 rounded-2xl bg-black/60 backdrop-blur px-2 py-1 shadow-lg border border-white/10">
      <button
        class="zpi-btn"
        title="Zoom Out"
        aria-label="Zoom Out"
        @click="zoomAtCenter(1/zoomStep)">−</button>

      <span class="text-xs tabular-nums px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
        {{ Math.round(scale * 100) }}%
      </span>

      <button
        class="zpi-btn"
        title="Zoom In"
        aria-label="Zoom In"
        @click="zoomAtCenter(zoomStep)">+</button>

      <button
        class="zpi-btn !px-2"
        title="Reset View"
        aria-label="Reset View"
        @click="reset()">Reset</button>

      <button
        v-if="!props.isFullscreen"
        class="zpi-icon-btn"
        title="Fullscreen"
        aria-label="Fullscreen"
        @click="expand()">
        <Expand :size="18" />
      </button>
      <button
        :class="['zpi-btn !px-2', selectedServer?.MapSettings?.showMarkers ? 'opacity-100' : 'opacity-50']"
        title="Map Markers"
        aria-label="Display map markers"
        @click="toggleShowMarkers()">Map Markers</button>
      <button
        :class="['zpi-btn !px-2', selectedServer?.MapSettings?.nightMode ? 'opacity-100' : 'opacity-50']"
        title="Map Markers"
        aria-label="Display map markers"
        @click="toggleNightMode()"><Moon :size="16"/></button>
    </div>
    <div
      ref="container"
      class="relative"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @pointerleave="onPointerUp"
      @dblclick="reset">
      <div v-if="!isDetached" class="zpi-image transform-gpu" :style="{ transform: `translate(${tx}px, ${ty}px) scale(${scale})` }">
        <img
          ref="mapImage"
          @load="onMapImageLoaded"
          :src="src"
          draggable="false"
          :style="[selectedServer?.MapSettings?.nightMode ? { filter: `brightness(${getMapBrightness})` } : '']"
          class="select-none pointer-events-none"/>
        <span v-if="imgW" :style="{ minWidth: `${mapImage?.clientWidth}px`, minHeight: `${mapImage?.clientHeight}px` }">
          <span class="absolute inset-0">
            <span v-if="selectedServer?.MapSettings?.showMarkers">
              <div v-for="(monument, idx) in selectedServer?.MapInfo?.monuments" :key="idx" class="absolute transition-transform" :style="{ transform: `translate(${(mapImage?.clientWidth ?? 0) * monument.x}px, ${(mapImage?.clientHeight ?? 0) * (1 - monument.y)}px)` }">
                <div v-html="monument.label" class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[7px] px-[3px] py-0.1 text-nowrap rounded bg-black/70 border border-white/10">
                </div>
              </div>
            </span>
            <div v-for="(entity, idx) in selectedServer?.MapInfo?.entities" :key="entity.entId" class="absolute transition-transform" :style="{ transform: `translate(${(mapImage?.clientWidth ?? 0) * entity.x}px, ${(mapImage?.clientHeight ?? 0) * (1 - entity.y)}px)` }">
              <span
                  @mouseover="showLabel(idx, true)"
                  @mouseout="showLabel(idx, false)">
                <div v-if="entity.type == 0" class="entity-online"></div>
                <div v-if="entity.type == 1" class="entity-offline"></div>
              </span>
              <div v-if="labelRefs[idx]" class="absolute left-1/2 -top-3 -translate-x-1/2 transition-transform -translate-y-1/2 text-[9px] px-[3px] py-0.1 text-nowrap rounded bg-black/70 border border-white/10">
                {{ entity.label }}
              </div>
            </div>
          </span>
        </span>
      </div>
    </div>
    <div
      v-if="!isDetached && imgW"
      class="absolute left-3 bottom-3 rounded-2xl bg-black/60 backdrop-blur shadow-lg border border-white/10 overflow-hidden"
      :style="panelStyle">
      <div class="flex items-center justify-between px-2 py-1.5">
        <button
          class="inline-flex items-center gap-2 text-sm font-medium px-2 py-1 rounded-lg hover:bg-white/5 active:bg-white/10"
          @click="areEntitiesExpanded = !areEntitiesExpanded">
          <Activity class="animate-pulse" :size="14"/>
          Live Entities
          <span
            v-if="selectedServer?.MapInfo?.availableTypes?.length"
            class="text-xs opacity-70">({{ selectedServer?.MapInfo?.availableTypes.length }})</span>
          <span
            class="ml-1 transition-transform"
            :class="areEntitiesExpanded ? 'rotate-180' : ''"
          >▾</span>
        </button>
      </div>
      <div v-if="areEntitiesExpanded" class="px-2 pb-2 max-h-full ">
        <div class="grid grid-cols-2 gap-1.5 overflow-y-auto max-h-[100%] overflow-auto pr-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          <button  v-for="(type, i) in selectedServer?.MapInfo?.availableTypes" :key="`${i}-${type}`" class="chip" :class="selectedServer?.hasTrackedType(i) ? 'chip-on' : 'chip-off'" @click="selectedServer?.toggleTrackedType(i)">
            {{ getMapEntityTypeName(i) }} ({{ selectedServer?.MapInfo?.entities.filter(x => x.type == i).length }})
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Activity, Expand, Loader2, Moon } from 'lucide-vue-next'
import { ref, reactive, onMounted, onBeforeUnmount, computed } from 'vue'
import { addPopup, getMapEntityTypeName, MapEntityTypes, save, selectedServer } from '../control-panel/ControlPanel.SaveLoad'

type Point = { x: number; y: number }

const labelRefs = ref<boolean[]>([])
function showLabel(idx: number, visible: boolean) {
  labelRefs.value[idx] = visible
}
const panelStyle = computed(() => {
  const expanded = areEntitiesExpanded.value
  const w = expanded ? 350 : 205
  const h = expanded ? '40%' : '40px'
  return {
    width: `${w}px`,
    height: `${h}`,
  }
})
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
const hour = ref<number>(0)
const isDetached = ref<boolean>(false)
const scale = ref(props.initialScale)
const tx = ref(0)
const ty = ref(0)
const imgW = ref(0)
const imgH = ref(0)
const getMapBrightness = computed(() => {
  return 0.3 + Math.cos(((hour.value - 12) / 24) * Math.PI * 2) * 0.35 + 0.35
})

const activePointers = reactive(new Map<number, Point>())
let lastPanAt: Point | null = null
let pinchStart = { distance: 0, midpoint: { x: 0, y: 0 }, scale: props.initialScale, tx: 0, ty: 0 }

function toggleShowMarkers(){
  if(selectedServer.value == null) {
    return
  }
  if(selectedServer.value.MapSettings == null) {
    selectedServer.value.MapSettings = {}
  }
  selectedServer.value.MapSettings.showMarkers = !selectedServer.value.MapSettings.showMarkers
  save()
}

function toggleNightMode(){
  if(selectedServer.value == null) {
    return
  }
  if(selectedServer.value.MapSettings == null) {
    selectedServer.value.MapSettings = {}
  }
  selectedServer.value.MapSettings.nightMode = !selectedServer.value.MapSettings.nightMode
  save()
}

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
    live: true,
    title: props.title,
    subtitle: props.subtitle,
    isFullscreen: true,
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

  setInterval(() => {
    hour.value = selectedServer.value?.MapInfo?.hour
  }, 1000);
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

.entity-online {
  @apply bg-[#74cc00] w-[6px] h-[6px] rounded-full ring-1 ring-black/50 shadow-md
}

.entity-offline {
  @apply bg-[#dd24247c] w-[6px] h-[6px] rounded-full ring-1 ring-black/50 shadow-md
}

.zpi-btn {
  @apply inline-flex items-center justify-center px-2.5 py-1.5 rounded-lg text-sm
         bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/10;
}
.zpi-icon-btn {
  @apply inline-flex items-center justify-center p-1.5 rounded-lg
         bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/10;
}
.chip {
  @apply text-xs px-2 py-1 rounded-lg border transition-opacity;
}
.chip-on {
  @apply bg-emerald-500/20 border-emerald-400/40;
}
.chip-off {
  @apply bg-white/5 border-white/10 opacity-60 hover:opacity-90;
}
</style>
