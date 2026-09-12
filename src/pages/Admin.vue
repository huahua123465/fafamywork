<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import Icon from '../components/Icon.vue'
import {
  ApiError,
  applyProfile,
  checkSession,
  fetchProfile,
  login,
  saveProfile,
  tokenExpired,
  type Profile,
} from '../utils/profile'
import { notify } from '../composables/ui'
import { ADMIN_TOKEN_KEY, readToken } from '../utils/admin-session'
import {
  deleteMessage,
  deleteWechatQr,
  fetchMessages,
  readImageFile,
  setMessageRead,
  uploadWechatQr,
  type BuyerMessage,
} from '../utils/messages'

const token = ref(readToken())
const password = ref('')
const loginError = ref('')
const loggingIn = ref(false)
const saving = ref(false)
const loading = ref(false)
const savedAt = ref('')
const loadError = ref('')
/** 保存时发现登录过期：保留表单内容，原地要求重新输入密码，登录后自动继续保存 */
const reloginNeeded = ref(false)
const fieldErrors = reactive<Partial<Record<keyof Profile, string>>>({})
const messages = ref<BuyerMessage[]>([])
const unread = ref(0)
const inboxError = ref('')
const qrBusy = ref(false)

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
  wechatQr: '',
  siteName: '',
  footerText: '',
  priceNote: '',
  stories: [],
  timeline: [],
})
/** 最近一次从服务器读取或保存成功时的表单快照，用来判断是否有未保存的修改 */
const snapshot = ref('')
const serialize = () => JSON.stringify({ ...form, stories: form.stories.filter((s) => s.trim()) })
const dirty = computed(() => Boolean(snapshot.value) && serialize() !== snapshot.value)

const contactCount = computed(
  () => [form.email, form.wechat, form.qq, form.phone, form.github, form.blog].filter((v) => v.trim()).length,
)

type Field = { key: keyof Profile; label: string; hint?: string; type?: string; inputmode?: 'url' | 'email' }
const textFields: Field[] = [
  { key: 'name', label: '姓名 / 昵称', hint: '显示在「关于我」页面，替换默认的「作品创作者」' },
  { key: 'role', label: '身份标签', hint: '例如：Android 开发 · 在校学生' },
  { key: 'siteName', label: '站点名称', hint: '显示在导航栏和页脚，留空则用「我的作品」' },
  { key: 'location', label: '所在城市', hint: '可留空' },
]
const contactFields: Field[] = [
  { key: 'email', label: '邮箱', hint: '买家最常用的联系方式，建议至少填这个', type: 'email', inputmode: 'email' },
  { key: 'wechat', label: '微信号', hint: '填微信号本身，不是二维码链接' },
  { key: 'qq', label: 'QQ', hint: '可留空' },
  { key: 'phone', label: '手机号', hint: '也可以填其他联系账号；只有填的是电话号码时，访客才能点击直接拨打' },
  { key: 'github', label: 'GitHub 主页', hint: 'https:// 开头的完整地址', inputmode: 'url' },
  { key: 'blog', label: '个人博客 / 主页', hint: 'https:// 开头的完整地址', inputmode: 'url' },
  { key: 'resume', label: '简历链接', hint: 'https:// 开头，或站内路径 /files/resume.pdf', inputmode: 'url' },
  { key: 'avatar', label: '头像地址', hint: 'https:// 开头，或站内路径 /images/avatar.webp', inputmode: 'url' },
]

function clearErrors() {
  for (const key of Object.keys(fieldErrors) as (keyof Profile)[]) delete fieldErrors[key]
}

async function loadInbox() {
  inboxError.value = ''
  try {
    const data = await fetchMessages(token.value)
    messages.value = data.messages
    unread.value = data.unread
  } catch (e) {
    inboxError.value = e instanceof Error ? e.message : '读取留言失败'
  }
}

async function toggleRead(item: BuyerMessage) {
  try {
    await setMessageRead(token.value, item.id, !item.read)
    await loadInbox()
  } catch (e) {
    notify(e instanceof Error ? e.message : '操作失败', 'error')
  }
}

async function removeMessage(item: BuyerMessage) {
  if (!confirm('删除这条留言？删除后无法恢复。')) return
  try {
    await deleteMessage(token.value, item.id)
    await loadInbox()
  } catch (e) {
    notify(e instanceof Error ? e.message : '删除失败', 'error')
  }
}

/** 上传后立即保存资料，二维码马上出现在咨询弹窗里 */
async function onQrChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  qrBusy.value = true
  try {
    form.wechatQr = await uploadWechatQr(token.value, await readImageFile(file))
    await save()
  } catch (e) {
    notify(e instanceof Error ? e.message : '上传失败', 'error')
  } finally {
    qrBusy.value = false
    input.value = ''
  }
}

async function removeQr() {
  qrBusy.value = true
  try {
    await deleteWechatQr(token.value)
    form.wechatQr = ''
    await save()
  } catch (e) {
    notify(e instanceof Error ? e.message : '删除失败', 'error')
  } finally {
    qrBusy.value = false
  }
}

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
    snapshot.value = serialize()
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
    localStorage.setItem(ADMIN_TOKEN_KEY, token.value)
    password.value = ''
    if (reloginNeeded.value) {
      // 表单里是还没保存的修改，不能再用服务器上的旧资料覆盖
      reloginNeeded.value = false
      await save()
    } else await loadCurrent()
    loadInbox()
  } catch (e) {
    loginError.value = e instanceof Error ? e.message : '登录失败'
  } finally {
    loggingIn.value = false
  }
}

function logout() {
  if (dirty.value && !confirm('还有修改没有保存，确定退出登录吗？')) return
  token.value = ''
  reloginNeeded.value = false
  snapshot.value = ''
  localStorage.removeItem(ADMIN_TOKEN_KEY)
}

async function save() {
  if (tokenExpired(token.value)) {
    reloginNeeded.value = true
    return
  }
  saving.value = true
  clearErrors()
  try {
    const payload = { ...form, stories: form.stories.filter((s) => s.trim()) }
    const result = await saveProfile(token.value, payload)
    applyProfile(result) // 立刻更新当前页面的导航栏、页脚等
    snapshot.value = serialize()
    savedAt.value = new Date().toLocaleString('zh-CN')
    notify('已保存，全站已生效')
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      reloginNeeded.value = true
      loginError.value = ''
      return
    }
    const message = e instanceof Error ? e.message : '保存失败'
    if (e instanceof ApiError && e.field) {
      fieldErrors[e.field as keyof Profile] = message
      document.getElementById(`admin-${e.field}`)?.focus()
    }
    notify(message, 'error')
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

const reloginInput = ref<HTMLInputElement>()
watch(reloginNeeded, async (needed) => {
  if (!needed) return
  await nextTick()
  reloginInput.value?.focus()
})

function warnUnsaved(event: BeforeUnloadEvent) {
  if (!dirty.value) return
  event.preventDefault()
  event.returnValue = ''
}
onBeforeRouteLeave(() => !dirty.value || confirm('还有修改没有保存，确定离开吗？'))

onMounted(async () => {
  window.addEventListener('beforeunload', warnUnsaved)
  if (!token.value) return
  if (tokenExpired(token.value) || (await checkSession(token.value)) === false) {
    token.value = ''
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    loginError.value = '上次登录已过期，请重新登录'
    return
  }
  loadCurrent()
  loadInbox()
})
onBeforeUnmount(() => window.removeEventListener('beforeunload', warnUnsaved))
</script>

<template>
  <section class="admin-page">
    <div class="page-heading">
      <p class="eyebrow">PROFILE</p>
      <h1>个人主页设置</h1>
      <p>在这里填写你的资料与联系方式，保存后立刻在全站生效，访客也能看到。</p>
      <RouterLink v-if="token" to="/insights" class="text-link">查看访问统计 ↗</RouterLink>
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
        <legend>买家留言<span v-if="unread" class="inbox-badge">{{ unread }}</span></legend>
        <p v-if="inboxError" class="admin-error" role="alert">{{ inboxError }}</p>
        <p v-if="!messages.length" class="inbox-empty">还没有留言。访客在「联系我」弹窗里留下的需求会出现在这里。</p>
        <div v-else class="inbox-list">
          <article v-for="item in messages" :key="item.id" class="inbox-item" :class="{ unread: !item.read }">
            <div class="inbox-top">
              <strong>{{ item.name || '匿名访客' }}</strong>
              <time :datetime="item.at">{{ new Date(item.at).toLocaleString('zh-CN') }}</time>
            </div>
            <p class="inbox-contact">联系方式：{{ item.contact }}<template v-if="item.slug"> · 项目：{{ item.slug }}</template></p>
            <p class="inbox-text">{{ item.message }}</p>
            <div class="inbox-actions">
              <button type="button" @click="toggleRead(item)">{{ item.read ? '标为未读' : '标为已读' }}</button>
              <button type="button" class="danger" @click="removeMessage(item)">删除</button>
            </div>
          </article>
        </div>
      </fieldset>

      <fieldset class="admin-group">
        <legend>基本信息</legend>
        <label v-for="f in textFields" :key="f.key" class="admin-field">
          <span>{{ f.label }}</span>
          <input :id="`admin-${f.key}`" v-model="(form as any)[f.key]" :type="f.type || 'text'" />
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
        <label
          v-for="f in contactFields"
          :key="f.key"
          class="admin-field"
          :class="{ 'admin-field-invalid': fieldErrors[f.key] }"
        >
          <span>{{ f.label }}</span>
          <input
            :id="`admin-${f.key}`"
            v-model="(form as any)[f.key]"
            :type="f.type || 'text'"
            :inputmode="f.inputmode"
            :aria-invalid="Boolean(fieldErrors[f.key])"
            :aria-describedby="fieldErrors[f.key] ? `admin-${f.key}-error` : undefined"
            @input="delete fieldErrors[f.key]"
          />
          <small v-if="fieldErrors[f.key]" :id="`admin-${f.key}-error`" class="admin-field-error">{{
            fieldErrors[f.key]
          }}</small>
          <small v-else>{{ f.hint }}</small>
        </label>
        <div class="admin-field">
          <span>微信二维码</span>
          <div class="qr-row">
            <img v-if="form.wechatQr" class="qr-preview" :src="form.wechatQr" alt="当前微信二维码" />
            <div class="qr-actions">
              <input type="file" accept="image/png,image/jpeg,image/webp" :disabled="qrBusy" @change="onQrChange" />
              <button v-if="form.wechatQr" class="text-link" type="button" :disabled="qrBusy" @click="removeQr">
                删除二维码
              </button>
            </div>
          </div>
          <small>买家扫码就能加你，比手动输入微信号更省事。PNG / JPG / WebP，400KB 以内，上传后自动保存。</small>
        </div>
      </fieldset>

      <fieldset class="admin-group">
        <legend>价格说明</legend>
        <p class="admin-group-note">
          显示在每个项目的「购买前速览」和购买说明页。留空则显示「价格与交付范围请咨询」。
        </p>
        <label class="admin-field">
          <span>参考价格</span>
          <input v-model="form.priceNote" type="text" maxlength="120" placeholder="例如：源码 ¥199 起，含部署指导另议" />
          <small>单个项目的价格可以在项目数据的 price 字段里单独填写，填了会优先显示。</small>
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
        <div v-if="reloginNeeded" class="admin-relogin" role="alert">
          <p><strong>登录已过期。</strong>你填写的内容都还在，输入密码后会自动继续保存。</p>
          <div>
            <input
              ref="reloginInput"
              v-model="password"
              type="password"
              autocomplete="current-password"
              aria-label="管理密码"
              placeholder="管理密码"
              @keydown.enter.prevent="doLogin"
            />
            <button class="button" type="button" :disabled="loggingIn || !password" @click="doLogin">
              {{ loggingIn ? '登录中…' : '登录并保存' }}
            </button>
          </div>
          <p v-if="loginError" class="admin-error">{{ loginError }}</p>
        </div>
        <button class="button" type="submit" :disabled="saving || reloginNeeded">
          {{ saving ? '保存中…' : '保存并生效' }} <Icon name="right" :size="17" />
        </button>
        <span v-if="dirty" class="admin-unsaved">有修改尚未保存</span>
        <span v-else-if="savedAt" class="admin-saved">上次保存：{{ savedAt }}</span>
      </div>
    </form>
  </section>
</template>
