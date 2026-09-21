<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import Modal from './Modal.vue'
import { authOpen, closeAuth, loginUser, registerUser } from '../utils/user-session'

const mode = ref<'login' | 'register'>('login')
const busy = ref(false)
const error = ref('')
const form = reactive({ username: '', nickname: '', password: '', confirm: '', website: '' })
const title = computed(() => mode.value === 'login' ? '登录账号' : '注册账号')

watch(authOpen, (open) => {
  if (open) error.value = ''
})

function switchMode(next: 'login' | 'register') {
  mode.value = next
  error.value = ''
}

async function submit() {
  error.value = ''
  if (mode.value === 'register' && form.password !== form.confirm) {
    error.value = '两次输入的密码不一致'
    return
  }
  busy.value = true
  try {
    if (mode.value === 'login') await loginUser(form.username, form.password)
    else await registerUser({ username: form.username, nickname: form.nickname, password: form.password, website: form.website })
    form.password = ''
    form.confirm = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : '操作失败，请稍后再试'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Modal :open="authOpen" :title="title" @close="closeAuth">
    <div class="auth-switch" role="tablist">
      <button :class="{ active: mode === 'login' }" type="button" @click="switchMode('login')">登录</button>
      <button :class="{ active: mode === 'register' }" type="button" @click="switchMode('register')">注册</button>
    </div>
    <p class="auth-note">浏览项目不需要登录。登录仅用于分享赚积分和查看积分记录。</p>
    <form class="auth-form" @submit.prevent="submit">
      <label><span>用户名</span><input v-model.trim="form.username" autocomplete="username" required minlength="3" maxlength="24" placeholder="英文字母、数字或下划线" /></label>
      <label v-if="mode === 'register'"><span>昵称（选填）</span><input v-model.trim="form.nickname" maxlength="30" autocomplete="nickname" /></label>
      <label><span>密码</span><input v-model="form.password" type="password" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" required minlength="8" maxlength="72" /></label>
      <label v-if="mode === 'register'"><span>确认密码</span><input v-model="form.confirm" type="password" autocomplete="new-password" required minlength="8" maxlength="72" /></label>
      <label class="auth-honeypot" aria-hidden="true"><span>网站</span><input v-model="form.website" tabindex="-1" autocomplete="off" /></label>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <button class="button" type="submit" :disabled="busy">{{ busy ? '处理中…' : title }}</button>
    </form>
    <button class="text-link auth-skip" type="button" @click="closeAuth">暂不登录，继续浏览</button>
  </Modal>
</template>
