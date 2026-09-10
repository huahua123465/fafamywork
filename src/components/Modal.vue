<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import Icon from './Icon.vue'
const props = defineProps<{ open: boolean; title: string; wide?: boolean }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement>()
let lastFocus: HTMLElement | null = null
let oldOverflow = ''
let locked = false
const unlock = () => {
  if (locked) {
    document.body.style.overflow = oldOverflow
    locked = false
  }
}
watch(
  () => props.open,
  async (open) => {
    if (open) lastFocus = document.activeElement as HTMLElement
    await nextTick()
    if (open && dialog.value && !dialog.value.open) {
      oldOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      locked = true
      dialog.value.showModal()
    } else if (!open && dialog.value?.open) {
      dialog.value.close()
      unlock()
      if (lastFocus?.isConnected) lastFocus.focus()
      else (document.querySelector('.mobile-menu-button') as HTMLElement)?.focus()
    }
  },
  { immediate: true, flush: 'sync' },
)
onBeforeUnmount(unlock)
function backdrop(event: MouseEvent) {
  if (event.target === dialog.value) {
    const r = dialog.value!.getBoundingClientRect()
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      emit('close')
  }
}
</script>
<template>
  <Teleport to="body"
    ><dialog
      ref="dialog"
      class="modal"
      :class="{ 'modal-wide': wide }"
      :aria-label="title"
      @cancel.prevent="emit('close')"
      @click="backdrop"
    >
      <div class="modal-header">
        <h2>{{ title }}</h2>
        <button class="icon-button" aria-label="关闭弹窗" autofocus @click="emit('close')">
          <Icon name="close" />
        </button>
      </div>
      <slot /></dialog
  ></Teleport>
</template>
