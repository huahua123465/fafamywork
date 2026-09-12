<script setup lang="ts">
import { ref, watch, onBeforeUnmount, onMounted } from 'vue'
import Icon from './Icon.vue'
const props = defineProps<{
  src: string
  alt: string
  fallbackSrc?: string
  eager?: boolean
  priority?: boolean
  /** 原图尺寸：只用来设置 aspect-ratio，让图片加载前就占好位置、不引起页面跳动 */
  width?: number
  height?: number
}>()
const failed = ref(false)
const loaded = ref(false)
const element = ref<HTMLImageElement>()
const actualSrc = ref(props.src)
const attempts = ref(0)
let timer: ReturnType<typeof setTimeout> | undefined
function reset() {
  clearTimeout(timer)
  failed.value = false
  loaded.value = false
  attempts.value = 0
  actualSrc.value = props.src
}
function retry() {
  reset()
  actualSrc.value = `${props.src}${props.src.includes('?') ? '&' : '?'}retry=${Date.now()}`
}
function onError() {
  if (attempts.value < 2) {
    attempts.value++
    timer = setTimeout(() => {
      actualSrc.value = `${props.src}${props.src.includes('?') ? '&' : '?'}retry=${Date.now()}`
    }, attempts.value * 800)
  } else if (props.fallbackSrc && actualSrc.value !== props.fallbackSrc) {
    actualSrc.value = props.fallbackSrc
  } else failed.value = true
}
onMounted(() => {
  window.addEventListener('online', retry)
  if (element.value?.complete && element.value.naturalWidth) loaded.value = true
})
onBeforeUnmount(() => {
  clearTimeout(timer)
  window.removeEventListener('online', retry)
})
watch(() => props.src, reset)
</script>
<template>
  <span v-if="failed" class="image-fallback" role="img" :aria-label="alt"
    ><Icon name="image" :size="32" /><span>图片加载失败</span
    ><span
      role="button"
      tabindex="0"
      class="image-retry"
      @click.stop="retry"
      @keydown.enter.stop.prevent="retry"
      @keydown.space.stop.prevent="retry"
      >重新加载</span
    ></span
  ><img
    v-else
    ref="element"
    class="asset-image"
    :class="{ 'is-loaded': loaded }"
    :src="actualSrc"
    :alt="alt"
    :loading="eager ? 'eager' : 'lazy'"
    :style="width && height ? { aspectRatio: `${width} / ${height}` } : undefined"
    :fetchpriority="priority ? 'high' : undefined"
    decoding="async"
    @error="onError"
    @load="loaded = true"
  />
</template>
