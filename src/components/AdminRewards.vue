<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { notify } from '../composables/ui'
import { describeReason } from '../utils/sharing'

const props = defineProps<{ token: string }>()
const loading = ref(false)
const error = ref('')
const search = ref('')
const users = ref<any[]>([])
const transactions = ref<any[]>([])
const logs = ref<any[]>([])
const settings = reactive({ sharingEnabled: true, pointsPerQualifiedVisit: 5, dailyRewardLimit: 10, qualificationSeconds: 15, visitorDedupeDays: 30, registrationBonus: 0 })

async function api(path: string, options: RequestInit = {}) {
  const res = await fetch(path, { ...options, headers: { Authorization: `Bearer ${props.token}`, ...(options.headers || {}) }, cache: 'no-store' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || '请求失败')
  return data
}
async function load() {
  if (!props.token) return
  loading.value = true; error.value = ''
  try {
    const [a, b, c, d] = await Promise.all([
      api('/api/admin/points/settings'), api(`/api/admin/users?search=${encodeURIComponent(search.value)}`),
      api('/api/admin/point-transactions'), api('/api/admin/audit-logs'),
    ])
    Object.assign(settings, a); users.value = b.users; transactions.value = c.transactions; logs.value = d.logs
  } catch (e) { error.value = e instanceof Error ? e.message : '读取积分管理数据失败' }
  finally { loading.value = false }
}
async function saveSettings() {
  try {
    Object.assign(settings, await api('/api/admin/points/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) }))
    notify('积分规则已保存')
    await load()
  } catch (e) { notify(e instanceof Error ? e.message : '保存失败', 'error') }
}
async function adjust(user: any) {
  const amountText = prompt(`调整 @${user.username} 的积分（增加填正数，扣除填负数）`, '5')
  if (amountText === null) return
  const reason = prompt('请输入调整原因')
  if (!reason) return
  try {
    await api(`/api/admin/users/${user.id}/points`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: Number(amountText), reason }) })
    notify('积分已调整'); await load()
  } catch (e) { notify(e instanceof Error ? e.message : '调整失败', 'error') }
}
async function toggleStatus(user: any) {
  const next = user.status === 'active' ? 'blocked' : 'active'
  if (!confirm(`${next === 'blocked' ? '停用' : '恢复'}用户 @${user.username}？`)) return
  try {
    await api(`/api/admin/users/${user.id}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next }) })
    notify('用户状态已更新'); await load()
  } catch (e) { notify(e instanceof Error ? e.message : '操作失败', 'error') }
}
async function revoke(item: any) {
  const reason = prompt('请输入撤销这笔分享奖励的原因')
  if (!reason) return
  try {
    await api(`/api/admin/point-transactions/${item.id}/revoke`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) })
    notify('奖励已撤销'); await load()
  } catch (e) { notify(e instanceof Error ? e.message : '撤销失败', 'error') }
}
watch(() => props.token, load)
onMounted(load)
</script>

<template>
  <fieldset class="admin-group reward-admin">
    <legend>用户与分享积分</legend>
    <p class="admin-group-note">控制有效分享奖励、查看用户与积分流水。所有人工操作都会记录审计日志。</p>
    <p v-if="error" class="admin-error">{{ error }}</p><p v-if="loading">正在读取积分数据…</p>
    <template v-else>
      <div class="reward-settings">
        <label><span>分享积分</span><select v-model="settings.sharingEnabled"><option :value="true">开启</option><option :value="false">关闭</option></select></label>
        <label><span>每次奖励</span><input v-model.number="settings.pointsPerQualifiedVisit" type="number" min="0" /></label>
        <label><span>每日次数上限</span><input v-model.number="settings.dailyRewardLimit" type="number" min="0" /></label>
        <label><span>有效停留秒数</span><input v-model.number="settings.qualificationSeconds" type="number" min="0" /></label>
        <label><span>访客去重天数</span><input v-model.number="settings.visitorDedupeDays" type="number" min="1" /></label>
        <label><span>注册奖励</span><input v-model.number="settings.registrationBonus" type="number" min="0" /></label>
      </div>
      <button class="button small" type="button" @click="saveSettings">保存积分规则</button>
      <div class="reward-subsection"><div class="reward-heading"><h3>用户</h3><div><input v-model.trim="search" placeholder="搜索用户名或昵称" /><button type="button" @click="load">搜索</button></div></div>
        <div class="reward-table"><div v-for="user in users" :key="user.id" class="reward-row"><span><strong>{{ user.nickname || user.username }}</strong><small>@{{ user.username }} · {{ user.status === 'active' ? '正常' : '已停用' }}</small></span><b>{{ user.points }} 积分</b><button type="button" @click="adjust(user)">调整积分</button><button type="button" @click="toggleStatus(user)">{{ user.status === 'active' ? '停用' : '恢复' }}</button></div><p v-if="!users.length">暂无用户。</p></div>
      </div>
      <div class="reward-subsection"><h3>最近积分流水</h3><div class="reward-table"><div v-for="item in transactions.slice(0, 30)" :key="item.id" class="reward-row"><span><strong>@{{ item.username }}</strong><small>{{ describeReason(item.reason) }} · {{ new Date(item.createdAt).toLocaleString('zh-CN') }}</small></span><b>{{ item.amount > 0 ? '+' : '' }}{{ item.amount }}</b><button v-if="item.type === 'share_reward'" type="button" @click="revoke(item)">撤销奖励</button></div><p v-if="!transactions.length">暂无积分流水。</p></div></div>
      <details class="reward-subsection"><summary>管理员操作记录（{{ logs.length }}）</summary><div class="reward-table"><div v-for="item in logs.slice(0, 50)" :key="item.id" class="reward-row"><span><strong>{{ item.action }}</strong><small>{{ item.reason }} · {{ new Date(item.createdAt).toLocaleString('zh-CN') }}</small></span></div></div></details>
    </template>
  </fieldset>
</template>
