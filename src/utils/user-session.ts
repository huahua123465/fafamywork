import { ref } from 'vue'

export interface SiteUser {
  id: number
  username: string
  nickname: string
  referralCode: string
  points: number
  status: 'active' | 'blocked'
  createdAt: string
}

const TOKEN_KEY = 'portfolio-user-token'
export const currentUser = ref<SiteUser | null>(null)
export const authOpen = ref(false)
/** 登录弹窗底部「暂不登录」按钮：从分享入口打开时改成直接普通分享 */
export const authSkip = ref<{ label: string; action: () => void } | null>(null)
let pendingAction: (() => void | Promise<void>) | null = null

export function userToken() {
  if (typeof localStorage === 'undefined') return ''
  return localStorage.getItem(TOKEN_KEY) || ''
}

const DEVICE_KEY = 'portfolio-device-id'

/**
 * 本浏览器的随机设备号，退出登录也保留。服务端据此认出「分享者自己的浏览器」，
 * 退出登录后再打开自己的链接不会得积分。http 下没有 crypto.randomUUID，用 getRandomValues。
 */
export function deviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY) || ''
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(id)) {
      const bytes = crypto.getRandomValues(new Uint8Array(16))
      id = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
      localStorage.setItem(DEVICE_KEY, id)
    }
    return id
  } catch {
    return ''
  }
}

export function authHeaders(): Record<string, string> {
  const token = userToken()
  const device = deviceId()
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(device ? { 'X-Device-Id': device } : {}) }
}

async function parse(res: Response) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.error || '请求失败'), { status: res.status, field: data.field })
  return data
}

export async function loadUserSession() {
  const token = userToken()
  if (!token) return null
  try {
    const data = await parse(await fetch('/api/auth/me', { headers: authHeaders(), cache: 'no-store' }))
    currentUser.value = data.user
    return data.user as SiteUser
  } catch {
    localStorage.removeItem(TOKEN_KEY)
    currentUser.value = null
    return null
  }
}

export async function registerUser(input: { username: string; nickname: string; password: string; website?: string }) {
  return finishAuth(await parse(await fetch('/api/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(input),
  })))
}

export async function loginUser(username: string, password: string) {
  return finishAuth(await parse(await fetch('/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ username, password }),
  })))
}

function finishAuth(data: { token: string; user: SiteUser }) {
  localStorage.setItem(TOKEN_KEY, data.token)
  currentUser.value = data.user
  authOpen.value = false
  const action = pendingAction
  pendingAction = null
  if (action) queueMicrotask(() => void action())
  return data.user
}

export function openAuth(afterLogin?: () => void | Promise<void>, skip?: { label: string; action: () => void }) {
  pendingAction = afterLogin || null
  authSkip.value = skip || null
  authOpen.value = true
}

export function closeAuth() {
  authOpen.value = false
  pendingAction = null
}

/** 同步调用 skip.action，保留点击手势，复制和系统分享才不会被浏览器拦下 */
export function skipAuth() {
  const skip = authSkip.value
  closeAuth()
  skip?.action()
}

export function requireUser(action: () => void | Promise<void>, skip?: { label: string; action: () => void }) {
  if (currentUser.value) return void action()
  openAuth(action, skip)
}

export async function logoutUser() {
  await fetch('/api/auth/logout', { method: 'POST', headers: authHeaders() }).catch(() => undefined)
  localStorage.removeItem(TOKEN_KEY)
  currentUser.value = null
}

export async function changeUserPassword(currentPassword: string, nextPassword: string) {
  const data = await parse(await fetch('/api/auth/change-password', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ currentPassword, nextPassword }),
  }))
  localStorage.removeItem(TOKEN_KEY)
  currentUser.value = null
  return data
}

export async function userApi(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers)
  for (const [name, value] of Object.entries(authHeaders())) headers.set(name, value)
  const res = await fetch(path, { ...options, headers, cache: 'no-store' })
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY)
    currentUser.value = null
  }
  return parse(res)
}
