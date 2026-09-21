import { ref } from 'vue'
import { authHeaders, userApi } from './user-session'
import { copyText } from './clipboard'
import { projects } from '../content/projects'

export interface ShareOffer {
  referralCode: string
  projectSlug: string
  pointsPerInvite: number
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

/**
 * 被邀请人通过专属链接进站时记下邀请（7 天有效），注册时一并提交。
 * 存 localStorage：好友可能先逛几页、甚至隔天回来再注册。
 */
export interface PendingInvite {
  code: string
  projectSlug: string
  nickname: string
  pointsPerInvite: number
  at: number
}
const INVITE_KEY = 'portfolio-invite'
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

function readInvite(): PendingInvite | null {
  try {
    const data = JSON.parse(localStorage.getItem(INVITE_KEY) || 'null') as PendingInvite | null
    return data && Date.now() - data.at < INVITE_TTL_MS ? data : null
  } catch {
    return null
  }
}
export const pendingInvite = ref<PendingInvite | null>(typeof window === 'undefined' ? null : readInvite())

export function clearInvite() {
  pendingInvite.value = null
  try { localStorage.removeItem(INVITE_KEY) } catch { /* 隐私模式等 */ }
}

/** 校验分享码并取邀请人昵称；无效或活动关闭时返回 null */
export async function captureInvite(referralCode: unknown, projectSlug: string): Promise<PendingInvite | null> {
  const code = String(referralCode || '').trim().toUpperCase()
  if (!/^[A-Z0-9]{6,8}$/.test(code)) return null
  try {
    const res = await fetch(`/api/shares/inviter?code=${code}`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    if (!data.sharingEnabled) return null
    const invite = { code, projectSlug, nickname: String(data.nickname || ''), pointsPerInvite: Number(data.pointsPerInvite) || 0, at: Date.now() }
    pendingInvite.value = invite
    try { localStorage.setItem(INVITE_KEY, JSON.stringify(invite)) } catch { /* 隐私模式等 */ }
    return invite
  } catch {
    return null
  }
}

/** 注册结果里的邀请说明 */
export function describeReferral(referral: { rewarded: boolean; reason?: string; points?: number; inviter?: string } | undefined) {
  if (!referral) return '注册成功'
  if (referral.rewarded) return `注册成功，${referral.inviter} 获得了 ${referral.points} 积分`
  if (referral.reason === 'self') return '注册成功。这个浏览器登录过邀请人的账号，本次不计积分'
  if (referral.reason === 'daily_limit') return '注册成功。邀请人今天的奖励次数已满，本次不计积分'
  return '注册成功'
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

/** 旧版积分流水里的原因写的是项目 slug，展示时换成项目名称 */
export function describeReason(reason: string) {
  return reason.replace(/分享项目 ([a-z0-9-]+) /, (_, slug: string) => `分享项目「${projectName(slug)}」`)
}
