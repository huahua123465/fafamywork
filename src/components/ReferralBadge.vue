<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Icon from './Icon.vue'
import { referralState } from '../utils/sharing'

// 访客通过专属链接打开详情页时的计分进度：倒计时 → 确认中 → 计分成功 / 不计分
const dismissed = ref(false)
let hideTimer: ReturnType<typeof setTimeout> | undefined
watch(() => referralState.value?.phase, (phase) => {
  clearTimeout(hideTimer)
  if (!phase) return
  dismissed.value = false
  // 结果出来后停留一会儿自动收起
  if (phase === 'rewarded' || phase === 'not_counted') hideTimer = setTimeout(() => { dismissed.value = true }, 12000)
})
const state = computed(() => (dismissed.value ? null : referralState.value))

// 截图预览等弹窗用 showModal 打开，处在浏览器顶层，普通 fixed 元素会被盖住。
// 计时条也放进顶层（popover），每当有弹窗打开就重新弹出一次，保持在最上面。
// 不支持 popover 的浏览器会忽略这个属性，照常按 fixed 显示。
const el = ref<HTMLElement>()
function raise() {
  const node = el.value
  if (!node || typeof node.showPopover !== 'function') return
  try {
    if (node.matches(':popover-open')) node.hidePopover()
    node.showPopover()
  } catch {
    // 元素正在移除等情况，忽略
  }
}
watch(el, (node) => { if (node) raise() }, { flush: 'post' })
let observer: MutationObserver | undefined
onMounted(() => {
  observer = new MutationObserver((records) => {
    if (records.some((r) => r.target instanceof HTMLDialogElement && r.target.open)) raise()
  })
  observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] })
})
onBeforeUnmount(() => observer?.disconnect())
const progress = computed(() => {
  const s = state.value
  if (!s) return 0
  if (s.phase !== 'counting') return 100
  return s.total ? Math.round(((s.total - s.remaining) / s.total) * 100) : 100
})
</script>

<template>
  <Transition name="toast">
    <aside v-if="state" ref="el" popover="manual" class="referral-badge" :class="state.phase" role="status" aria-live="polite">
      <div class="referral-badge-body">
        <template v-if="state.phase === 'counting'">
          <strong v-if="state.remaining > 0"><span class="referral-count">{{ state.remaining }}</span> 秒后为分享者计分</strong>
          <strong v-else>还差一步</strong>
          <p>{{ state.remaining > 0 ? (state.interacted ? '继续浏览就好，不需要注册。' : '期间滑动一下页面，不需要注册。') : '滑动一下页面即可完成计分。' }}</p>
        </template>
        <template v-else-if="state.phase === 'submitting'"><strong>正在确认…</strong><p>马上就好。</p></template>
        <template v-else-if="state.phase === 'rewarded'"><strong><Icon name="success" :size="16" /> 计分成功</strong><p>分享者获得 {{ state.points }} 积分，谢谢你的浏览。</p></template>
        <template v-else><strong>本次不计积分</strong><p>{{ state.message }}</p></template>
      </div>
      <button class="referral-badge-close" type="button" aria-label="收起" @click="dismissed = true"><Icon name="close" :size="15" /></button>
      <span class="referral-badge-bar" :style="{ width: `${progress}%` }" aria-hidden="true" />
    </aside>
  </Transition>
</template>
