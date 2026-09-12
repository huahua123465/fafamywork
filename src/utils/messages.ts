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

/** 把用户选的图片读成 data:URL，交给上传接口。 */
export function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('图片读取失败'))
    reader.readAsDataURL(file)
  })
}
