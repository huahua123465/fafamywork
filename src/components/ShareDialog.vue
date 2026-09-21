<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { Project } from '../types'
import Modal from './Modal.vue'
import AssetImage from './AssetImage.vue'
import Icon from './Icon.vue'
import { createRewardShare, ordinaryShareUrl, rewardShareUrl, shareLink, type ShareOffer } from '../utils/sharing'
import { currentUser, requireUser } from '../utils/user-session'

const props = defineProps<{ open: boolean; project: Project }>()
const emit = defineEmits<{ close: [] }>()
const offer = ref<ShareOffer | null>(null)
const busy = ref(false)
const error = ref('')
// 复制失败时把链接放进输入框让用户手动复制
const manualUrl = ref('')
const manualInput = ref<HTMLInputElement>()
const resultBox = ref<HTMLElement>()
// 弹窗在浏览器顶层，全局 toast 会被遮罩盖住看不见，分享结果必须在弹窗里显示
const result = ref<{ kind: 'reward' | 'normal'; outcome: 'shared' | 'copied' | 'error'; url: string } | null>(null)
const justDone = ref(false)
let doneTimer: ReturnType<typeof setTimeout> | undefined

watch(() => props.open, (open) => {
  manualUrl.value = ''
  result.value = null
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
async function share(kind: 'reward' | 'normal', url: string) {
  manualUrl.value = ''
  result.value = null
  try {
    const outcome = await shareLink({ title: props.project.name, text: `看看这个项目：${props.project.name}`, url })
    if (outcome === 'manual') {
      manualUrl.value = url
      await nextTick()
      manualInput.value?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      manualInput.value?.select()
      return
    }
    result.value = { kind, outcome, url }
    void nextTick(() => resultBox.value?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
    justDone.value = true
    clearTimeout(doneTimer)
    doneTimer = setTimeout(() => { justDone.value = false }, 2500)
  } catch (e) {
    if ((e as Error).name !== 'AbortError') {
      result.value = { kind, outcome: 'error', url }
      void nextTick(() => resultBox.value?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
    }
  }
}
function rewardShare() {
  if (offer.value) return share('reward', rewardShareUrl(offer.value))
}
function normalShare() {
  return share('normal', ordinaryShareUrl())
}
</script>

<template>
  <Modal :open="open" title="分享这个项目" @close="emit('close')"><div class="modal-body">
    <div class="share-card">
      <AssetImage v-if="project.cover" :src="project.cover.src" :fallback-src="project.cover.fullSrc" :alt="project.cover.alt" :width="project.cover.width" :height="project.cover.height" />
      <div><small>{{ project.category }}</small><h3>{{ project.name }}</h3><p>{{ project.summary }}</p></div>
    </div>
    <div v-if="!currentUser" class="share-login-callout"><h3>登录后分享赚积分</h3><p>好友通过你的专属链接形成有效访问后，你会获得积分。对方不需要注册。</p><button class="button" @click="loginAndContinue">登录或注册</button></div>
    <div v-else class="share-reward-box"><h3>专属积分分享</h3><p v-if="busy">正在生成专属链接…</p><p v-else-if="error" class="form-error">{{ error }}</p><template v-else-if="offer"><p>每邀请一位好友注册奖励 <strong>{{ offer.pointsPerInvite }}</strong> 积分，今天还可获得 <strong>{{ offer.remainingToday }}</strong> 次奖励。</p><ul class="share-rules"><li>好友打开你的专属链接会看到注册邀请，用链接注册新账号即为你计分</li><li>每个新账号只算一次，已有账号的好友不计分</li><li>在你登录过的浏览器上注册的账号不计分</li></ul><button class="button" :disabled="offer.remainingToday <= 0" @click="rewardShare"><Icon :name="justDone && result?.kind === 'reward' ? 'success' : 'share'" :size="17" /> {{ offer.remainingToday <= 0 ? '今日奖励已达上限' : justDone && result?.kind === 'reward' ? '已复制' : '分享赚积分' }}</button></template></div>
    <div v-if="result" ref="resultBox" class="share-result" :class="{ error: result.outcome === 'error' }" role="status">
      <template v-if="result.outcome === 'error'"><strong>分享没有成功</strong><p>请再点一次，或复制下面的链接发给好友。</p></template>
      <template v-else-if="result.kind === 'reward'"><strong>{{ result.outcome === 'copied' ? '专属链接已复制' : '已打开分享' }}</strong><p>{{ result.outcome === 'copied' ? '到微信或 QQ 里粘贴发给好友。' : '' }}好友通过链接注册新账号后，你会获得 {{ offer?.pointsPerInvite }} 积分，可在「我的积分」里查看。</p></template>
      <template v-else><strong>{{ result.outcome === 'copied' ? '普通链接已复制' : '已打开分享' }}</strong><p>{{ result.outcome === 'copied' ? '到微信或 QQ 里粘贴发给好友即可。' : '' }}普通链接不计积分{{ currentUser ? '，想赚积分请用上面的「分享赚积分」' : '，想赚积分可以登录后用专属链接分享' }}。</p></template>
      <input :value="result.url" readonly aria-label="分享链接" @focus="($event.target as HTMLInputElement).select()" />
    </div>
    <div v-if="manualUrl" class="share-manual"><p>没能自动复制，请长按或手动复制下面的链接：</p><input ref="manualInput" :value="manualUrl" readonly aria-label="分享链接" @focus="($event.target as HTMLInputElement).select()" /></div>
    <button class="text-link share-normal" @click="normalShare">普通分享（无需登录，不计积分）</button>
  </div></Modal>
</template>
