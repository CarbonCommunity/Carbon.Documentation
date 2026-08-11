<script setup lang="ts" generic="T">
import { onMounted, onUnmounted, ref, Ref, shallowRef, watch } from 'vue'

const { list, pageSize, initialPageSize } = defineProps<{
  list: T[]
  pageSize: number
  initialPageSize?: number
}>()

const currentPage = shallowRef(1)
const renderedList = ref<T[]>([]) as Ref<T[]>

const sentinel = shallowRef<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

function renderMore() {
  if (renderedList.value.length >= list.length) {
    return
  }
  currentPage.value++
  const nextItems = list.slice(renderedList.value.length, currentPage.value * pageSize)
  renderedList.value.push(...nextItems)
}

function rerenderList() {
  renderedList.value = list.slice(0, currentPage.value * (initialPageSize ?? pageSize))
}

watch(
  () => list,
  () => {
    currentPage.value = Math.min(currentPage.value, Math.ceil(list.length / pageSize))
    rerenderList()
  }
)

onMounted(() => {
  rerenderList()
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        renderMore()
      }
    },
    {
      rootMargin: '0px 0px 300px 0px',
    }
  )
  if (sentinel.value) {
    observer.observe(sentinel.value)
  }
})

onUnmounted(() => {
  if (observer) {
    if (sentinel.value) {
      observer.unobserve(sentinel.value)
    }
    observer.disconnect()
  }
})
</script>

<template>
  <slot :renderedList="renderedList" />
  <div ref="sentinel"></div>
</template>
