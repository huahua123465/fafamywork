import { author } from '../content/author'
import { site } from '../content/site'

export interface Profile {
  name: string
  role: string
  introduction: string
  email: string
  wechat: string
  qq: string
  phone: string
  location: string
  github: string
  blog: string
  resume: string
  avatar: string
  wechatQr: string
  siteName: string
  footerText: string
  priceNote: string
  stories: string[]
  timeline: { date: string; title: string; text: string }[]
  updatedAt?: string
}

export const PROFILE_FIELDS: (keyof Profile)[] = [
  'name', 'role', 'introduction', 'email', 'wechat', 'qq', 'phone',
  'location', 'github', 'blog', 'resume', 'avatar', 'wechatQr', 'siteName', 'footerText', 'priceNote',
]

/** 把接口返回的资料合并进 author / site；只覆盖非空字段，留空的沿用默认文案。 */
export function applyProfile(data: Partial<Profile> | null | undefined) {
  if (!data) return
  for (const key of PROFILE_FIELDS) {
    const value = data[key]
    if (typeof value !== 'string' || !value.trim()) continue
    if (key === 'siteName') site.name = value
    else if (key === 'footerText') site.footerText = value
    else if (key === 'priceNote') site.priceNote = value
    else (author as Record<string, unknown>)[key] = value
  }
  if (Array.isArray(data.stories) && data.stories.length) author.stories = data.stories
  if (Array.isArray(data.timeline) && data.timeline.length) author.timeline = data.timeline
}

/** 站点启动时调用。接口挂了也不能拖住页面，所以设了超时并吞掉错误。 */
export async function loadProfile(timeoutMs = 2000): Promise<void> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch('/api/profile', { signal: controller.signal, cache: 'no-store' })
    if (res.ok) applyProfile(await res.json())
  } catch {
    // 后端不可用时静默降级为默认文案
  } finally {
    clearTimeout(timer)
  }
}

/** 接口错误：带上 HTTP 状态码和出错字段，方便页面定位到具体输入框。 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly field = '',
  ) {
    super(message)
  }
}

export async function login(password: string): Promise<string> {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data.error || '登录失败', res.status)
  return data.token
}

export async function saveProfile(token: string, profile: Partial<Profile>): Promise<Profile> {
  const res = await fetch('/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(profile),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data.error || '保存失败', res.status, data.field)
  return data
}

/** token 仍有效返回 true；接口不可用时返回 null，由调用方决定是否保留登录态。 */
export async function checkSession(token: string): Promise<boolean | null> {
  try {
    const res = await fetch('/api/session', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
    if (res.status === 401) return false
    return res.ok ? true : null
  } catch {
    return null
  }
}

/** 管理 token 形如「过期时间戳.签名」，本地先判断是否已过期，避免编辑到一半才发现要重新登录。 */
export function tokenExpired(token: string, now = Date.now()) {
  const exp = Number(token.split('.')[0])
  return !Number.isFinite(exp) || exp <= now
}

/** 手机号一栏也可能填的是微信号等账号，只有像电话号码时才生成拨号链接。 */
export function dialable(value: string) {
  return /^\+?[\d\s-]{5,20}$/.test(value.trim())
}

export async function fetchProfile(): Promise<Partial<Profile>> {
  const res = await fetch('/api/profile', { cache: 'no-store' })
  if (!res.ok) throw new Error('读取失败')
  return res.json()
}
