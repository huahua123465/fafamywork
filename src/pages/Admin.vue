<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import Icon from '../components/Icon.vue'
import { applyProfile, fetchProfile, login, saveProfile, type Profile } from '../utils/profile'
import { notify } from '../composables/ui'

const TOKEN_KEY = 'portfolio-admin-token'

const token = ref<string>(localStorage.getItem(TOKEN_KEY) || '')
const password = ref('')
const loginError = ref('')
const loggingIn = ref(false)
const saving = ref(false)
const loading = ref(false)
const savedAt = ref('')
const loadError = ref('')

const form = reactive<Profile>({
  name: '',
  role: '',
  introduction: '',
  email: '',
  wechat: '',
  qq: '',
  phone: '',
  location: '',
  github: '',
  blog: '',
  resume: '',
  avatar: '',
  siteName: '',
  footerText: '',
  stories: [],
  timeline: [],
})

const contactCount = computed(
  () => [form.email, form.wechat, form.qq, form.phone, form.github, form.blog].filter((v) => v.trim()).length,
)

const textFields: { key: keyof Profile; label: string; hint?: string; type?: string }[] = [
  { key: 'name', label: '姓名 / 昵称', hint: '显示在「关于我」页面，替换默认的「作品创作者」' },
  { key: 'role', label: '身份标签', hint: '例如：Android 开发 · 在校学生' },
  { key: 'siteName', label: '站点名称', hint: '显示在导航栏和页脚，留空则用「我的作品」' },
  { key: 'location', label: '所在城市', hint: '可留空' },
]
const contactFields: { key: keyof Profile; label: string; hint: string; type?: string }[] = [
  { key: 'email', label: '邮箱', hint: '买家最常用的联系方式，建议至少填这个', type: 'email' },
  { key: 'wechat', label: '微信号', hint: '填微信号本身，不是二维码链接' },
  { key: 'qq', label: 'QQ', hint: '可留空' },
  { key: 'phone', label: '手机号', hint: '公开手机号会收到骚扰电话，按需填写' },
  { key: 'github', label: 'GitHub 主页', hint: 'https:// 开头的完整地址', type: 'url' },
  { key: 'blog', label: '个人博客 / 主页', hint: 'https:// 开头的完整地址', type: 'url' },
  { key: 'resume', label: '简历链接', hint: 'https:// 开头，或站内路径 /files/resume.pdf', type: 'url' },
  { key: 'avatar', label: '头像地址', hint: 'https:// 开头，或站内路径 /images/avatar.webp', type: 'url' },
]

async function loadCurrent() {
  loading.value = true
  loadError.value = ''
  try {
    const data = await fetchProfile()
    for (const key of Object.keys(form) as (keyof Profile)[]) {
      const value = data[key]
      if (Array.isArray(value)) (form[key] as unknown) = [...value]
      else if (typeof value === 'string') (form[key] as unknown) = value
    }
    if (!form.stories.length) form.stories = ['']
  } catch {
    loadError.value = '读取当前资料失败，后端可能没有启动。'
  } finally {
    loading.value = false
  }
}

async function doLogin() {
  loginError.value = ''
  loggingIn.value = true
  try {
    token.value = await login(password.value)
    localStorage.setItem(TOKEN_KEY, token.value)
    password.value = ''
    await loadCurrent()
  } catch (e) {
    loginError.value = e instanceof Error ? e.message : '登录失败'
  } finally {
    loggingIn.value = false
  }
}

function logout() {
  token.value = ''
  localStorage.removeItem(TOKEN_KEY)
}

async function save() {
  saving.value = true
  try {
    const payload = { ...form, stories: form.stories.filter((s) => s.trim()) }
    const result = await saveProfile(token.value, payload)
    applyProfile(result) // 立刻更新当前页面的导航栏、页脚等
    savedAt.value = new Date().toLocaleString('zh-CN')
    notify('已保存，全站已生效')
  } catch (e) {
    const message = e instanceof Error ? e.message : '保存失败'
    notify(message)
    if (message.includes('登录')) logout()
  } finally {
    saving.value = false
  }
}

function addStory() {
  form.stories.push('')
}
function removeStory(index: number) {
  form.stories.splice(index, 1)
}
function addTimeline() {
  form.timeline.push({ date: '', title: '', text: '' })
}
function removeTimeline(index: number) {
  form.timeline.splice(index, 1)
}

onMounted(() => {
  if (token.value) loadCurrent()
})
</script>

<template>
  <section class="admin-page">
    <div class="page-heading">
      <p class="eyebrow">PROFILE</p>
      <h1>个人主页设置</h1>
      <p>在这里填写你的资料与联系方式，保存后立刻在全站生效，访客也能看到。</p>
    </div>

    <!-- 未登录 -->
    <form v-if="!token" class="admin-login" @submit.prevent="doLogin">
      <div class="admin-login-icon"><Icon name="mail" :size="28" /></div>
      <h2>请先登录</h2>
      <p class="admin-login-hint">输入管理密码后即可编辑资料。</p>
      <label class="admin-field">
        <span>管理密码</span>
        <input v-model="password" type="password" autocomplete="current-password" required />
      </label>
      <p v-if="loginError" class="admin-error" role="alert">{{ loginError }}</p>
      <button class="button" type="submit" :disabled="loggingIn">
        {{ loggingIn ? '登录中…' : '登录' }} <Icon name="right" :size="17" />
      </button>
    </form>

    <!-- 已登录 -->
    <form v-else class="admin-form" @submit.prevent="save">
      <div class="admin-bar">
        <span v-if="contactCount" class="admin-ok"
          ><span class="status-dot"></span>已填写 {{ contactCount }} 项联系方式，访客可以联系到你</span
        >
        <span v-else class="admin-warn"
          ><span class="status-dot"></span>还没有任何联系方式，访客点「联系我」会看到空白提示</span
        >
        <button class="text-link" type="button" @click="logout">退出登录</button>
      </div>

      <p v-if="loadError" class="admin-error" role="alert">{{ loadError }}</p>
      <p v-if="loading" class="admin-loading">正在读取当前资料…</p>

      <fieldset class="admin-group">
        <legend>基本信息</legend>
        <label v-for="f in textFields" :key="f.key" class="admin-field">
          <span>{{ f.label }}</span>
          <input v-model="(form as any)[f.key]" :type="f.type || 'text'" />
          <small v-if="f.hint">{{ f.hint }}</small>
        </label>
        <label class="admin-field">
          <span>一句话介绍</span>
          <textarea v-model="form.introduction" rows="3"></textarea>
          <small>显示在「关于我」页面顶部。</small>
        </label>
        <label class="admin-field">
          <span>页脚文案</span>
          <input v-model="form.footerText" type="text" />
          <small>留空则用「保持好奇，慢慢创造。」</small>
        </label>
      </fieldset>

      <fieldset class="admin-group">
        <legend>联系方式</legend>
        <p class="admin-group-note">
          填写的项会出现在「联系我」弹窗里，留空的自动隐藏。至少填一项，否则买家找不到你。
        </p>
        <label v-for="f in contactFields" :key="f.key" class="admin-field">
          <span>{{ f.label }}</span>
          <input v-model="(form as any)[f.key]" :type="f.type || 'text'" />
          <small>{{ f.hint }}</small>
        </label>
      </fieldset>

      <fieldset class="admin-group">
        <legend>关于我 · 段落</legend>
        <p class="admin-group-note">「关于我」页面的正文，一段一行。</p>
        <div v-for="(_, i) in form.stories" :key="i" class="admin-row">
          <textarea v-model="form.stories[i]" rows="3"></textarea>
          <button class="icon-button" type="button" aria-label="删除这段" @click="removeStory(i)">
            <Icon name="close" />
          </button>
        </div>
        <button class="text-link" type="button" @click="addStory">+ 增加一段</button>
      </fieldset>

      <fieldset class="admin-group">
        <legend>时间线（可选）</legend>
        <p class="admin-group-note">留空则「关于我」页面不显示时间线。</p>
        <div v-for="(item, i) in form.timeline" :key="i" class="admin-timeline-row">
          <input v-model="item.date" type="text" placeholder="2026.09" aria-label="时间" />
          <input v-model="item.title" type="text" placeholder="标题" aria-label="标题" />
          <input v-model="item.text" type="text" placeholder="说明" aria-label="说明" />
          <button class="icon-button" type="button" aria-label="删除这条" @click="removeTimeline(i)">
            <Icon name="close" />
          </button>
        </div>
        <button class="text-link" type="button" @click="addTimeline">+ 增加一条</button>
      </fieldset>

      <div class="admin-actions">
        <button class="button" type="submit" :disabled="saving">
          {{ saving ? '保存中…' : '保存并生效' }} <Icon name="right" :size="17" />
        </button>
        <span v-if="savedAt" class="admin-saved">上次保存：{{ savedAt }}</span>
      </div>
    </form>
  </section>
</template>
