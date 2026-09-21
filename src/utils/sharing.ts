import { authHeaders, userApi } from './user-session'
import { copyText } from './clipboard'
import { projects } from '../content/projects'

export interface ShareOffer {
  referralCode: string
  projectSlug: string
  pointsPerVisit: number
  remainingToday: number
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

export function trackReferralVisit(projectSlug: string, referralCode: unknown) {
  const ref = String(referralCode || '').trim().toUpperCase()
  if (!ref || !/^[A-Z0-9]{6,8}$/.test(ref)) return () => undefined
  let visitToken = ''
  let ready = false
  let interacted = false
  let submitted = false
  let timer: ReturnType<typeof setTimeout> | undefined

  const qualify = async () => {
    if (submitted || !ready || !interacted || !visitToken) return
    submitted = true
    await fetch('/api/shares/qualify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitToken, interacted: true }), keepalive: true,
    }).catch(() => undefined)
  }
  const interaction = () => { interacted = true; void qualify() }
  window.addEventListener('scroll', interaction, { passive: true, once: true })
  window.addEventListener('click', interaction, { passive: true, once: true })
  window.addEventListener('keydown', interaction, { once: true })

  void fetch('/api/shares/visit', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ referralCode: ref, projectSlug }),
  }).then((res) => res.json()).then((data) => {
    if (!data.eligible) return
    visitToken = data.visitToken
    timer = setTimeout(() => { ready = true; void qualify() }, Math.max(0, Number(data.qualificationSeconds) || 15) * 1000)
  }).catch(() => undefined)

  return () => {
    clearTimeout(timer)
    window.removeEventListener('scroll', interaction)
    window.removeEventListener('click', interaction)
    window.removeEventListener('keydown', interaction)
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
