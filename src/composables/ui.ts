import { ref } from 'vue'
export const contactOpen = ref(false)
export function openContact() {
  contactOpen.value = true
}
export const toast = ref('')
export const toastKind = ref<'success' | 'error'>('success')
let timer: ReturnType<typeof setTimeout>
export function notify(message: string, kind: 'success' | 'error' = 'success') {
  toast.value = message
  toastKind.value = kind
  clearTimeout(timer)
  timer = setTimeout(() => (toast.value = ''), 3200)
}
