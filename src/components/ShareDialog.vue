<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { Project } from '../types'
import Modal from './Modal.vue'
import AssetImage from './AssetImage.vue'
import Icon from './Icon.vue'
import { createRewardShare, ordinaryShareUrl, rewardShareUrl, shareLink, type ShareOffer } from '../utils/sharing'
import { currentUser, requireUser } from '../utils/user-session'
import { notify } from '../composables/ui'

const props = defineProps<{ open: boolean; project: Project }>()
const emit = defineEmits<{ close: [] }>()
const offer = ref<ShareOffer | null>(null)
const busy = ref(false)
const error = ref('')
// 复制失败时把链接放进输入框让用户手动复制
const manualUrl = ref('')
const manualInput = ref<HTMLInputElement>()

watch(() => props.open, (open) => {
  manualUrl.value = ''
  if (open && currentUser.value) void loadOffer()
})
async function loadOffer() {
  busy.value = true; error.value = ''
  try { offer.value = await createRewardShare(props.project.slug) }
  catch (e) { error.value = e instanceof Error ? e.message : '暂时无法创建分享链接' }
  finally { busy.value = false }
}
function loginAndContinue() {
  requireUser(loadOffer, { label: '暂不登录，普通分享', action: () => void normalShare() })
}
async function share(url: string, copiedMessage: string) {
  manualUrl.value = ''
  try {
    const outcome = await shareLink({ title: props.project.name, text: `看看这个项目：${props.project.name}`, url })
    if (outcome === 'copied') notify(copiedMessage)
    if (outcome === 'manual') {
      manualUrl.value = url
      await nextTick()
      manualInput.value?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      manualInput.value?.select()
    }
  } catch (e) { if ((e as Error).name !== 'AbortError') notify('分享失败，请重试', 'error') }
}
function rewardShare() {
  if (offer.value) return share(rewardShareUrl(offer.value), '积分分享链接已复制')
}
function normalShare() {
  return share(ordinaryShareUrl(), '普通链接已复制')
}
</script>

<template>
  <Modal :open="open" title="分享这个项目" @close="emit('close')"><div class="modal-body">
    <div class="share-card">
      <AssetImage v-if="project.cover" :src="project.cover.src" :fallback-src="project.cover.fullSrc" :alt="project.cover.alt" :width="project.cover.width" :height="project.cover.height" />
      <div><small>{{ project.category }}</small><h3>{{ project.name }}</h3><p>{{ project.summary }}</p></div>
    </div>
    <div v-if="!currentUser" class="share-login-callout"><h3>登录后分享赚积分</h3><p>好友通过你的专属链接形成有效访问后，你会获得积分。对方不需要注册。</p><button class="button" @click="loginAndContinue">登录或注册</button></div>
    <div v-else class="share-reward-box"><h3>专属积分分享</h3><p v-if="busy">正在生成专属链接…</p><p v-else-if="error" class="form-error">{{ error }}</p><template v-else-if="offer"><p>每次有效访问奖励 <strong>{{ offer.pointsPerVisit }}</strong> 积分，今天还可获得 <strong>{{ offer.remainingToday }}</strong> 次奖励。</p><button class="button" :disabled="offer.remainingToday <= 0" @click="rewardShare"><Icon name="share" :size="17" /> {{ offer.remainingToday > 0 ? '分享赚积分' : '今日奖励已达上限' }}</button></template></div>
    <div v-if="manualUrl" class="share-manual"><p>没能自动复制，请长按或手动复制下面的链接：</p><input ref="manualInput" :value="manualUrl" readonly aria-label="分享链接" @focus="($event.target as HTMLInputElement).select()" /></div>
    <button class="text-link share-normal" @click="normalShare">普通分享（无需登录，不计积分）</button>
  </div></Modal>
</template>
