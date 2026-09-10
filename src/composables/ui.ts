import { ref } from 'vue'
export const contactOpen = ref(false)
export function openContact() {
  contactOpen.value = true
}
export const toast = ref('')
let timer: ReturnType<typeof setTimeout>
export function notify(message: string) {
  toast.value = message
  clearTimeout(timer)
  timer = setTimeout(() => (toast.value = ''), 3200)
}
