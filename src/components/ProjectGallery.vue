<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { Project } from '../types'
import Modal from './Modal.vue'
import Icon from './Icon.vue'
import ProjectPreview from './ProjectPreview.vue'
import AssetImage from './AssetImage.vue'
const props = defineProps<{ project: Project; initialOpen?: boolean }>()
const emit = defineEmits<{ close: [] }>()
const selected = ref(0),
  open = ref(false)
const slides = computed(() =>
  props.project.cover || props.project.images?.length
    ? [...(props.project.cover ? [props.project.cover] : []), ...(props.project.images || [])].map(
        (image) => ({ image, caption: image.caption || image.alt, variant: 0 }),
      )
    : [],
)
const allSlides = computed(() =>
  props.project.sample
    ? [
        { image: null, caption: '主界面 · 设计预览', variant: 0 },
        { image: null, caption: '另一种状态 · 设计预览', variant: 1 },
        ...slides.value,
      ]
    : slides.value.length
      ? slides.value
      : [
          {
            image: { src: '/images/missing-image', alt: '项目截图待补充' },
            caption: '项目截图待补充',
            variant: 0,
          },
        ],
)
watch(
  () => props.initialOpen,
  (value) => {
    if (value) open.value = true
  },
  { immediate: true },
)
watch(
  () => props.project.id,
  () => {
    selected.value = 0
    open.value = !!props.initialOpen
  },
)
function move(direction: number) {
  selected.value = (selected.value + direction + allSlides.value.length) % allSlides.value.length
}
function close() {
  open.value = false
  emit('close')
}
function keydown(event: KeyboardEvent) {
  if (!open.value) return
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault()
    move(event.key === 'ArrowLeft' ? -1 : 1)
  }
}
watch(
  open,
  (value) => {
    if (value) window.addEventListener('keydown', keydown)
    else window.removeEventListener('keydown', keydown)
  },
  { immediate: true },
)
onBeforeUnmount(() => window.removeEventListener('keydown', keydown))
</script>
<template>
  <div class="project-gallery">
    <button class="gallery-stage" :class="project.color" aria-label="放大项目预览" @click="open = true">
      <AssetImage
        v-if="allSlides[selected]?.image"
        :src="allSlides[selected].image!.src"
        :alt="allSlides[selected].image!.alt"
        eager
      /><ProjectPreview v-else :kind="project.kind" :variation="allSlides[selected]?.variant" /><span
        class="gallery-expand"
        ><Icon name="expand" :size="17" /> 点击放大</span
      >
    </button>
    <div class="gallery-controls">
      <div class="gallery-thumbnails">
        <button
          v-for="(slide, i) in allSlides"
          :key="i"
          :class="{ selected: selected === i }"
          :aria-pressed="selected === i"
          :aria-label="`查看${slide.caption}`"
          @click="selected = i"
        >
          <AssetImage v-if="slide.image" :src="slide.image.src" alt="" /><span v-else :class="project.color"
            ><Icon :name="i === 0 ? 'grid' : 'layers'" :size="18"
          /></span>
        </button>
      </div>
      <p>{{ allSlides[selected]?.caption }}</p>
      <span
        >{{ String(selected + 1).padStart(2, '0') }} / {{ String(allSlides.length).padStart(2, '0') }}</span
      >
    </div>
  </div>
  <Modal :open="open" :title="`${project.name} · 界面预览`" wide @close="close"
    ><div class="lightbox">
      <p v-if="project.sample" class="preview-notice">示例项目 · 以下为界面设计展示，非可操作的业务应用</p>
      <div class="lightbox-stage" :class="project.color">
        <AssetImage
          v-if="allSlides[selected]?.image"
          :src="allSlides[selected].image!.src"
          :alt="allSlides[selected].image!.alt"
          eager
        /><ProjectPreview v-else :kind="project.kind" :variation="allSlides[selected]?.variant" />
      </div>
      <div class="lightbox-controls">
        <button class="icon-button" aria-label="上一张" @click="move(-1)"><Icon name="previous" /></button>
        <p>
          {{ allSlides[selected]?.caption }} <span>{{ selected + 1 }} / {{ allSlides.length }}</span>
        </p>
        <button class="icon-button" aria-label="下一张" @click="move(1)"><Icon name="chevron" /></button>
      </div></div
  ></Modal>
</template>
