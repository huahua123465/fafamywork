<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Project, ProjectImage } from '../types'
import Modal from './Modal.vue'
import Icon from './Icon.vue'
import AssetImage from './AssetImage.vue'
const props = defineProps<{ project: Project; initialOpen?: boolean }>()
const emit = defineEmits<{ close: [] }>()
const selected = ref(0),
  open = ref(false),
  expanded = ref(false),
  zoomed = ref(false)
const viewport = ref<HTMLElement>()
const slides = computed<ProjectImage[]>(() => [
  ...(props.project.cover ? [props.project.cover] : []),
  ...(props.project.images || []),
])
const current = computed(() => slides.value[selected.value])
const details = computed(() =>
  expanded.value ? props.project.images || [] : (props.project.images || []).slice(0, 8),
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
    expanded.value = false
    zoomed.value = false
    open.value = !!props.initialOpen
  },
)
watch(selected, async () => {
  zoomed.value = false
  await nextTick()
  viewport.value?.scrollTo(0, 0)
})
function choose(index: number) {
  selected.value = index
}
function inspect(index: number) {
  selected.value = index
  open.value = true
}
function move(direction: number) {
  selected.value = (selected.value + direction + slides.value.length) % slides.value.length
}
function close() {
  open.value = false
  zoomed.value = false
  emit('close')
}
function keydown(event: KeyboardEvent) {
  if (open.value && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault()
    move(event.key === 'ArrowLeft' ? -1 : 1)
  }
}
// 监听放在挂载后注册，构建时服务端渲染不会触碰 window
onMounted(() => window.addEventListener('keydown', keydown))
onBeforeUnmount(() => window.removeEventListener('keydown', keydown))
</script>
<template>
  <div class="screenshot-gallery">
    <button
      v-if="current"
      class="gallery-stage real-gallery"
      :class="project.color"
      aria-label="放大项目预览"
      @click="open = true"
    >
      <AssetImage
        :key="current.src"
        :src="current.src"
        :fallback-src="current.fullSrc"
        :width="current.width"
        :height="current.height"
        :alt="current.alt"
        eager
      />
      <span class="gallery-label"
        ><Icon name="image" :size="16" />{{ selected === 0 ? '项目页面总览' : current.caption }}</span
      >
      <span class="gallery-expand"><Icon name="expand" :size="17" /> 点击放大</span>
    </button>
    <div class="screenshot-toolbar">
      <div class="gallery-thumbnails" aria-label="选择预览图片">
        <button
          v-for="(slide, i) in slides"
          :key="slide.src"
          :class="{ selected: selected === i }"
          :aria-pressed="selected === i"
          :aria-label="`查看${slide.caption}`"
          @click="choose(i)"
        >
          <AssetImage :src="slide.src" :fallback-src="slide.fullSrc" alt="" /><span
            class="thumbnail-number"
            >{{ i === 0 ? '总览' : String(i).padStart(2, '0') }}</span
          >
        </button>
      </div>
      <div class="screenshot-position">
        <span>{{ current?.caption }}</span
        ><span>{{ selected + 1 }} / {{ slides.length }}</span>
      </div>
    </div>
    <p class="screenshot-note"><Icon name="image" :size="14" />{{ project.previewNotice }}</p>
    <section v-if="project.images?.length" class="screens-section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">A CLOSER LOOK</p>
          <h2>界面细节，逐张看。</h2>
        </div>
        <span class="screen-count">{{ project.images.length }} 张独立界面</span>
      </div>
      <div class="screens-grid">
        <button
          v-for="(screen, i) in details"
          :key="screen.src"
          class="screen-tile"
          @click="inspect(i + (project.cover ? 1 : 0))"
          :aria-label="`放大${screen.caption}`"
        >
          <div class="screen-image">
            <AssetImage
              :src="screen.src"
              :fallback-src="screen.fullSrc"
              :alt="screen.alt"
              :width="screen.width"
              :height="screen.height"
            /><span
              class="screen-zoom"
              ><Icon name="expand" :size="18"
            /></span>
          </div>
          <span class="screen-title"
            ><small>{{ String(i + 1).padStart(2, '0') }}</small
            >{{ screen.caption }}<Icon name="arrow" :size="15"
          /></span>
        </button>
      </div>
      <div v-if="project.images.length > 8" class="load-more">
        <button class="button secondary" @click="expanded = !expanded">
          {{ expanded ? '收起更多界面' : `查看其余 ${project.images.length - 8} 张界面`
          }}<Icon :name="expanded ? 'previous' : 'plus'" :size="17" />
        </button>
      </div>
    </section>
  </div>
  <Modal :open="open" :title="`${project.name} · 界面预览`" wide @close="close">
    <div v-if="current" class="screenshot-lightbox">
      <div class="image-view-actions">
        <p>{{ current.caption }}</p>
        <button class="text-link" @click="zoomed = !zoomed">
          <Icon name="expand" :size="15" />{{ zoomed ? '适应窗口' : '放大细看' }}</button
        ><a :href="current.fullSrc || current.src" target="_blank" rel="noopener noreferrer" class="text-link"
          >打开原图 <Icon name="arrow" :size="15"
        /></a>
      </div>
      <div
        ref="viewport"
        class="screenshot-viewport"
        :class="[project.color, { zoomed }]"
        tabindex="0"
        aria-label="图片预览区域"
      >
        <AssetImage
          :src="current.fullSrc || current.src"
          :alt="current.alt"
          :width="current.width"
          :height="current.height"
          eager
        />
      </div>
      <div class="lightbox-controls">
        <button class="icon-button" aria-label="上一张" @click="move(-1)"><Icon name="previous" /></button>
        <p aria-live="polite">
          {{ current.caption }} <span>{{ selected + 1 }} / {{ slides.length }}</span>
        </p>
        <button class="icon-button" aria-label="下一张" @click="move(1)"><Icon name="chevron" /></button>
      </div>
      <p class="screenshot-note modal-image-note">{{ project.previewNotice }}</p>
    </div>
  </Modal>
</template>
