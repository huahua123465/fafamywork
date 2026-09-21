import { captureInvite } from './sharing'
import { currentUser, openAuth } from './user-session'
import { notify } from '../composables/ui'

export function openInviteRegistration() {
  openAuth(undefined, { label: '暂不注册，先看看项目', action: () => undefined }, 'register')
}

/**
 * 访客带着 ?ref=分享码 进站：新访客直接弹出注册框（写明谁邀请的），
 * 已登录的访客不计分，只给一句说明，避免以为链接坏了。
 */
export async function handleInviteLink(referralCode: unknown, path: string) {
  const code = String(referralCode || '').trim().toUpperCase()
  if (!code) return
  if (currentUser.value) {
    notify(currentUser.value.referralCode === code
      ? '这是你自己的专属链接，好友通过它注册新账号后你会获得积分'
      : '你已经有账号了，邀请链接只对新注册的用户计分')
    return
  }
  const slug = path.match(/^\/projects\/([a-z0-9-]+)/)?.[1] || ''
  const invite = await captureInvite(code, slug)
  if (invite && !currentUser.value) openInviteRegistration()
}
