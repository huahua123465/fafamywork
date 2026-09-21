import { ref } from 'vue'
import { authHeaders, userApi } from './user-session'
import { copyText } from './clipboard'
import { projects } from '../content/projects'

export interface ShareOffer {
  referralCode: string
  projectSlug: string
  pointsPerVisit: number
  remainingToday: number
  qualificationSeconds: number
  visitorDedupeDays: number
}

export async function createRewardShare(projectSlug: string) {
  return userApi('/api/shares/create', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectSlug }),
  }) as Promise<ShareOffer>
}

export function rewardShareUrl(offer: ShareOffer) {
  const url = new URL(`/projects/${offer.projectSlug}`, window.location.origin)
  url.searchParams.set('ref', offer.referralCode)
  return url.toString()
}

/** 访客通过专属链接打开时的计分进度，详情页右下角的计时条读取它 */
export type ReferralState =
  | { phase: 'counting'; total: number; remaining: number; interacted: boolean }
  | { phase: 'submitting' }
  | { phase: 'rewarded'; points: number }
  | { phase: 'not_counted'; message: string }
export const referralState = ref<ReferralState | null>(null)

const NOT_COUNTED: Record<string, string> = {
  self: '这是分享者本人的网络或设备，自己打开不计积分。',
  duplicate: '这个网络或设备近期已经为 TA 计过分，这次不重复计算。',
  daily_limit: '分享者今天的奖励次数已满，这次不计积分。',
  disabled: '分享积分活动已暂停。',
}
const notCounted = (reason: unknown) => ({ phase: 'not_counted' as const, message: NOT_COUNTED[String(reason)] || '这次访问没有计入积分。' })

export function trackReferralVisit(projectSlug: string, referralCode: unknown) {
  const ref = String(referralCode || '').trim().toUpperCase()
  if (!ref || !/^[A-Z0-9]{6,8}$/.test(ref)) return () => undefined
  let visitToken = ''
  let ready = false
  let interacted = false
  let submitted = false
  let stopped = false
  let tick: ReturnType<typeof setInterval> | undefined
  const set = (state: ReferralState | null) => { if (!stopped) referralState.value = state }

  const qualify = async () => {
    if (submitted || !ready || !interacted || !visitToken) return
    submitted = true
    set({ phase: 'submitting' })
    try {
      const res = await fetch('/api/shares/qualify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitToken, interacted: true }), keepalive: true,
      })
      const data = await res.json()
      set(data.rewarded ? { phase: 'rewarded', points: Number(data.points) || 0 } : notCounted(data.reason))
    } catch {
      set(notCounted(''))
    }
  }
  const interaction = () => {
    if (interacted) return
    interacted = true
    const current = referralState.value
    if (current?.phase === 'counting') set({ ...current, interacted: true })
    void qualify()
  }
  // iOS 上点空白处不会冒泡 click，补 touchstart
  const events = ['scroll', 'click', 'keydown', 'touchstart'] as const
  events.forEach((name) => window.addEventListener(name, interaction, { passive: true }))

  void fetch('/api/shares/visit', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ referralCode: ref, projectSlug }),
  }).then((res) => res.json()).then((data) => {
    if (!data.eligible) {
      if (data.reason) set(notCounted(data.reason))
      return
    }
    visitToken = data.visitToken
    const total = Math.max(0, Number(data.qualificationSeconds) || 15)
    const deadline = Date.now() + total * 1000
    const update = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      if (!submitted) set({ phase: 'counting', total, remaining, interacted })
      if (remaining === 0) {
        clearInterval(tick)
        ready = true
        void qualify()
      }
    }
    update()
    tick = setInterval(update, 250)
  }).catch(() => undefined)

  return () => {
    stopped = true
    clearInterval(tick)
    events.forEach((name) => window.removeEventListener(name, interaction))
    referralState.value = null
  }
}

/**
 * 分享结果：shared 走了系统分享面板，copied 已复制，manual 复制失败需要用户手动复制。
 * 站点是 http://IP，不是安全上下文：电脑浏览器没有 navigator.share 和 navigator.clipboard，
 * 微信内置浏览器也没有 navigator.share，所以复制必须走 clipboard.ts 的兜底。
 */
export type ShareOutcome = 'shared' | 'copied' | 'manual'

export async function shareLink(data: { title: string; text?: string; url: string }): Promise<ShareOutcome> {
  if (navigator.share) {
    try {
      await navigator.share(data)
      return 'shared'
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e
      // 其余错误（权限、系统不支持）退回复制
    }
  }
  return (await copyText(data.url)) ? 'copied' : 'manual'
}

export function ordinaryShareUrl(url = window.location.href) {
  const clean = new URL(url)
  clean.searchParams.delete('ref')
  return clean.toString()
}

export function projectName(slug: string) {
  return projects.find((p) => p.slug === slug)?.name || slug
}

/** 积分流水里的原因由服务端写入项目 slug，展示时换成项目名称 */
export function describeReason(reason: string) {
  return reason.replace(/分享项目 ([a-z0-9-]+) /, (_, slug: string) => `分享项目「${projectName(slug)}」`)
}
