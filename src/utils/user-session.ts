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
let pendingAction: (() => void | Promise<void>) | null = null

export function userToken() {
  if (typeof localStorage === 'undefined') return ''
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function authHeaders(): Record<string, string> {
  const token = userToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
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
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  })))
}

export async function loginUser(username: string, password: string) {
  return finishAuth(await parse(await fetch('/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }),
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

export function openAuth(afterLogin?: () => void | Promise<void>) {
  pendingAction = afterLogin || null
  authOpen.value = true
}

export function closeAuth() {
  authOpen.value = false
  pendingAction = null
}

export function requireUser(action: () => void | Promise<void>) {
  if (currentUser.value) return void action()
  openAuth(action)
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
  const token = userToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch(path, { ...options, headers, cache: 'no-store' })
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY)
    currentUser.value = null
  }
  return parse(res)
}
