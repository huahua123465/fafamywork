import { readToken } from './admin-session'

// 访问统计：浏览和咨询事件发到自己的 /api/track，服务器按天聚合，不用第三方统计服务。
// 以下情况不上报：站长本人（浏览器里有后台登录记录）、自动化浏览器、开启了「请勿追踪」。

export type TrackType = 'view' | 'contact' | 'copy'
interface TrackEvent {
  type: TrackType
  path?: string
  slug?: string
  device?: 'mobile' | 'desktop'
  referrer?: string
}

let firstView = true

function shouldTrack() {
  if (typeof navigator === 'undefined') return false
  if (navigator.webdriver || navigator.doNotTrack === '1') return false
  return !readToken()
}

function send(event: TrackEvent) {
  if (!shouldTrack()) return
  const body = JSON.stringify(event)
  try {
    if (navigator.sendBeacon?.('/api/track', new Blob([body], { type: 'application/json' }))) return
  } catch {
    // 部分内置浏览器禁用 sendBeacon，退回 fetch
  }
  fetch('/api/track', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(
    () => {},
  )
}

export function trackView(path: string) {
  const slug = path.match(/^\/projects\/([a-z0-9-]+)\/?$/)?.[1]
  send({
    type: 'view',
    path: path.replace(/(.)\/+$/, '$1'),
    slug,
    device: matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop',
    // 外部来源只在打开网站的第一个页面有意义，站内跳转不再重复带
    referrer: firstView ? document.referrer : undefined,
  })
  firstView = false
}

export function trackEvent(type: Exclude<TrackType, 'view'>, slug?: string) {
  send({ type, slug })
}

export interface StatsSummary {
  days: number
  total: { views: number; visitors: number; mobile: number; desktop: number; contacts: number; copies: number }
  daily: { date: string; views: number; visitors: number; contacts: number }[]
  pages: { key: string; count: number }[]
  referrers: { key: string; count: number }[]
  projects: { slug: string; views: number; contacts: number }[]
  firstDate: string
}

export async function fetchStats(token: string, days: number): Promise<StatsSummary> {
  const res = await fetch(`/api/stats?days=${days}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
  if (res.status === 401) throw Object.assign(new Error('登录已过期，请重新登录'), { status: 401 })
  if (!res.ok) throw new Error('读取统计失败，后端可能没有启动')
  return res.json()
}
