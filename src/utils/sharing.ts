import { authHeaders, userApi } from './user-session'

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

export async function ordinaryShare(title: string, url = window.location.href) {
  const clean = new URL(url)
  clean.searchParams.delete('ref')
  if (navigator.share) await navigator.share({ title, url: clean.toString() })
  else await navigator.clipboard.writeText(clean.toString())
}
