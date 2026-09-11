/**
 * 复制文本到剪贴板，成功返回 true。
 *
 * 新接口 navigator.clipboard 只在 HTTPS 或 localhost 下可用；站点目前通过 http://IP 访问，
 * 浏览器里根本没有这个接口，所以要退回到「选中隐藏输入框 + execCommand('copy')」的老办法，
 * 微信、QQ 内置浏览器也靠这个方式。
 */
export async function copyText(text: string): Promise<boolean> {
  if (typeof window !== 'undefined' && window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // 权限被拒等情况，继续尝试老办法
    }
  }
  return legacyCopy(text)
}

function legacyCopy(text: string): boolean {
  const previous = document.activeElement as HTMLElement | null
  // 联系弹窗是 showModal 打开的 <dialog>，弹窗外的元素不可聚焦，输入框必须放进弹窗里
  const container = previous?.closest('dialog[open]') || document.querySelector('dialog[open]') || document.body
  const input = document.createElement('textarea')
  input.value = text
  input.setAttribute('readonly', '')
  input.setAttribute('aria-hidden', 'true')
  // 16px 避免 iOS 聚焦时页面放大；移出可视区但保持可选中
  Object.assign(input.style, {
    position: 'fixed',
    top: '0',
    left: '-9999px',
    width: '1px',
    height: '1px',
    opacity: '0',
    fontSize: '16px',
  })
  container.appendChild(input)
  let ok = false
  try {
    input.focus({ preventScroll: true })
    input.select()
    input.setSelectionRange(0, text.length) // iOS Safari 只认这个
    ok = document.execCommand('copy')
  } catch {
    ok = false
  } finally {
    input.remove()
    previous?.focus?.({ preventScroll: true })
  }
  return ok
}
