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
  siteName: string
  footerText: string
  stories: string[]
  timeline: { date: string; title: string; text: string }[]
  updatedAt?: string
}

export const PROFILE_FIELDS: (keyof Profile)[] = [
  'name', 'role', 'introduction', 'email', 'wechat', 'qq', 'phone',
  'location', 'github', 'blog', 'resume', 'avatar', 'siteName', 'footerText',
]

/** 把接口返回的资料合并进 author / site；只覆盖非空字段，留空的沿用默认文案。 */
export function applyProfile(data: Partial<Profile> | null | undefined) {
  if (!data) return
  for (const key of PROFILE_FIELDS) {
    const value = data[key]
    if (typeof value !== 'string' || !value.trim()) continue
    if (key === 'siteName') site.name = value
    else if (key === 'footerText') site.footerText = value
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

export async function login(password: string): Promise<string> {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || '登录失败')
  return data.token
}

export async function saveProfile(token: string, profile: Partial<Profile>): Promise<Profile> {
  const res = await fetch('/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(profile),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || '保存失败')
  return data
}

export async function fetchProfile(): Promise<Partial<Profile>> {
  const res = await fetch('/api/profile', { cache: 'no-store' })
  if (!res.ok) throw new Error('读取失败')
  return res.json()
}
