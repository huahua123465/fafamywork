<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import { changeUserPassword, currentUser, logoutUser, openAuth, userApi } from '../utils/user-session'
import { notify } from '../composables/ui'

const router = useRouter()
const summary = ref<any>(null)
const transactions = ref<any[]>([])
const visits = ref<any[]>([])
const loading = ref(true)
const error = ref('')
const password = reactive({ current: '', next: '', confirm: '' })
const changing = ref(false)

async function load() {
  if (!currentUser.value) { loading.value = false; return }
  try {
    const [a, b, c] = await Promise.all([
      userApi('/api/account/share-summary'), userApi('/api/account/point-transactions'), userApi('/api/account/share-visits'),
    ])
    summary.value = a
    if (currentUser.value) currentUser.value.points = a.points
    transactions.value = b.transactions
    visits.value = c.visits
  } catch (e) { error.value = e instanceof Error ? e.message : '读取账号信息失败' }
  finally { loading.value = false }
}

async function logout() {
  await logoutUser()
  notify('已退出登录')
  router.push('/')
}

async function changePassword() {
  if (password.next !== password.confirm) { error.value = '两次输入的新密码不一致'; return }
  changing.value = true; error.value = ''
  try {
    await changeUserPassword(password.current, password.next)
    notify('密码已修改，请重新登录')
    openAuth(() => { void router.replace('/account') })
  } catch (e) { error.value = e instanceof Error ? e.message : '修改密码失败' }
  finally { changing.value = false }
}

onMounted(load)
</script>

<template>
  <section class="account-page container section-pad">
    <div class="page-heading"><p class="eyebrow">MY ACCOUNT</p><h1>我的积分账户。</h1><p>查看分享进度、积分流水和账号安全设置。</p></div>
    <div v-if="!currentUser" class="account-empty"><h2>登录后查看积分</h2><p>浏览网站无需登录，只有分享赚积分时才需要账号。</p><button class="button" @click="openAuth(load)">登录或注册</button></div>
    <p v-else-if="loading">正在读取账号信息…</p>
    <div v-else class="account-layout">
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <section class="account-hero">
        <div class="account-avatar">{{ (currentUser.nickname || currentUser.username).slice(0, 1).toUpperCase() }}</div>
        <div><small>@{{ currentUser.username }}</small><h2>{{ currentUser.nickname || currentUser.username }}</h2><p>分享码：{{ currentUser.referralCode }}</p></div>
        <button class="text-link" @click="logout">退出登录</button>
      </section>
      <div class="account-stats">
        <article><small>当前积分</small><strong>{{ summary?.points || 0 }}</strong></article>
        <article><small>累计有效访问</small><strong>{{ summary?.totalQualifiedVisits || 0 }}</strong></article>
        <article><small>今日进度</small><strong>{{ summary?.rewardedToday || 0 }} / {{ summary?.dailyRewardLimit || 0 }}</strong></article>
      </div>
      <section class="account-panel"><h2>积分明细</h2><div v-if="transactions.length" class="account-list"><div v-for="item in transactions" :key="item.id"><span>{{ item.reason }}<small>{{ new Date(item.createdAt).toLocaleString('zh-CN') }}</small></span><strong :class="{ negative: item.amount < 0 }">{{ item.amount > 0 ? '+' : '' }}{{ item.amount }}</strong></div></div><p v-else>还没有积分记录，分享项目后会显示在这里。</p></section>
      <section class="account-panel"><h2>分享记录</h2><div v-if="visits.length" class="account-list"><div v-for="item in visits" :key="item.id"><span>{{ item.projectSlug }}<small>{{ new Date(item.createdAt).toLocaleString('zh-CN') }}</small></span><strong>{{ item.status === 'rewarded' ? `+${item.rewardPoints}` : item.status === 'pending' ? '待确认' : '未奖励' }}</strong></div></div><p v-else>还没有分享访问记录。</p></section>
      <section class="account-panel"><h2>修改密码</h2><form class="password-form" @submit.prevent="changePassword"><label><span>当前密码</span><input v-model="password.current" type="password" autocomplete="current-password" required /></label><label><span>新密码</span><input v-model="password.next" type="password" autocomplete="new-password" minlength="8" required /></label><label><span>确认新密码</span><input v-model="password.confirm" type="password" autocomplete="new-password" minlength="8" required /></label><button class="button" :disabled="changing">{{ changing ? '修改中…' : '修改密码' }} <Icon name="right" :size="17" /></button></form></section>
    </div>
  </section>
</template>
