<script setup lang="ts">
import { ref, watch, onBeforeUnmount, onMounted } from 'vue'
import Icon from './Icon.vue'
const props = defineProps<{
  src: string
  alt: string
  fallbackSrc?: string
  eager?: boolean
  priority?: boolean
}>()
const failed = ref(false)
const actualSrc = ref(props.src)
const attempts = ref(0)
let timer: ReturnType<typeof setTimeout> | undefined
function reset() {
  clearTimeout(timer)
  failed.value = false
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
onMounted(() => window.addEventListener('online', retry))
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
    :src="actualSrc"
    :alt="alt"
    :loading="eager ? 'eager' : 'lazy'"
    :fetchpriority="priority ? 'high' : undefined"
    decoding="async"
    @error="onError"
  />
</template>
