import { ApiError } from './profile'

// 买家留言与微信二维码：留言是公开接口，其余操作都要后台登录。

export interface BuyerMessage {
  id: string
  at: string
  name: string
  contact: string
  message: string
  slug: string
  read: boolean
}

export interface MessageDraft {
  name?: string
  contact: string
  message: string
  slug?: string
  /** 蜜罐字段，真实访客看不到；填了就会被服务器丢弃 */
  website?: string
}

async function parse(res: Response) {
  const data = await res.json().catch(() => ({}))
  // 413 由 nginx 直接返回，响应体是 HTML，解析不出 error 字段
  if (res.status === 413) throw new ApiError('图片太大了，请换一张小一点的图片', 413)
  if (!res.ok) throw new ApiError(data.error || '操作失败', res.status, data.field)
  return data
}

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` })

export async function sendMessage(draft: MessageDraft): Promise<void> {
  await parse(
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    }),
  )
}

export async function fetchMessages(token: string): Promise<{ messages: BuyerMessage[]; unread: number }> {
  const data = await parse(await fetch('/api/messages', { headers: authHeaders(token), cache: 'no-store' }))
  return { messages: data.messages || [], unread: data.unread || 0 }
}

export async function setMessageRead(token: string, id: string, read = true): Promise<void> {
  await parse(
    await fetch('/api/messages/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify({ id, read }),
    }),
  )
}

export async function deleteMessage(token: string, id: string): Promise<void> {
  await parse(
    await fetch('/api/messages/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify({ id }),
    }),
  )
}

/** 上传微信二维码，返回站内地址；图片限 400KB，服务器按文件头校验类型。 */
export async function uploadWechatQr(token: string, dataUrl: string): Promise<string> {
  const data = await parse(
    await fetch('/api/media/wechat-qr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify({ dataUrl }),
    }),
  )
  return data.url || '/api/media/wechat-qr'
}

export async function deleteWechatQr(token: string): Promise<void> {
  await parse(await fetch('/api/media/wechat-qr', { method: 'DELETE', headers: authHeaders(token) }))
}

/**
 * 把用户选的图片压缩成 data:URL 再上传。
 * 手机拍的照片动辄几 MB，而 base64 体积还要再涨 1/3，不压缩很容易超过服务器限制。
 * 二维码缩到 720px 仍然能正常扫描；PNG 太大时退回 JPEG。
 */
export function compressImage(file: File, max = 720): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('图片读取失败，请换一张试试'))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error('这张图片浏览器打不开，请改用 PNG 或 JPG'))
      image.onload = () => {
        const scale = Math.min(1, max / Math.max(image.width, image.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(image.width * scale)
        canvas.height = Math.round(image.height * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(String(reader.result || ''))
        // 二维码多为透明或白底，先铺白底再画，避免转 JPEG 后发黑
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
        const png = canvas.toDataURL('image/png')
        resolve(png.length > 400 * 1024 ? canvas.toDataURL('image/jpeg', 0.9) : png)
      }
      image.src = String(reader.result || '')
    }
    reader.readAsDataURL(file)
  })
}
