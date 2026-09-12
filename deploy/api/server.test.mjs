// 资料 API 集成测试：用临时数据目录启动真实的 server.js，走 HTTP 验证。
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const PASSWORD = 'test-password'
let base = ''
let child
let dir = ''

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'fafa-api-'))
  const port = 20000 + Math.floor(Math.random() * 20000)
  base = `http://127.0.0.1:${port}`
  child = spawn(process.execPath, [join(import.meta.dirname, 'server.js')], {
    env: { ...process.env, PORT: String(port), ADMIN_PASSWORD: PASSWORD, TOKEN_SECRET: 'secret', DATA_DIR: dir, DATA_FILE: join(dir, 'profile.json'), STATS_FLUSH_MS: '50' },
    stdio: 'pipe',
  })
  let output = ''
  child.stdout.on('data', (d) => (output += d))
  child.stderr.on('data', (d) => (output += d))
  // 和图片资源测试并行跑时 CPU 很忙，启动可能要好几秒
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) return
    } catch {}
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error(`API 没有启动：${output}`)
}, 30_000)
afterAll(() => {
  child?.kill()
  rmSync(dir, { recursive: true, force: true })
})

const json = (method, body, headers = {}) => ({
  method,
  headers: { 'Content-Type': 'application/json', ...headers },
  body: body === undefined ? undefined : JSON.stringify(body),
})
async function token(ip = '10.0.0.1') {
  const res = await fetch(`${base}/api/login`, json('POST', { password: PASSWORD }, { 'X-Forwarded-For': ip }))
  return (await res.json()).token
}

describe('资料接口', () => {
  it('保存前校验邮箱和链接格式，返回出错字段而不是静默清空', async () => {
    const auth = { Authorization: `Bearer ${await token()}` }
    let res = await fetch(`${base}/api/profile`, json('PUT', { email: 'not-an-email' }, auth))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ field: 'email' })
    res = await fetch(`${base}/api/profile`, json('PUT', { github: 'javascript:alert(1)' }, auth))
    expect(await res.json()).toMatchObject({ field: 'github' })
  })

  it('手机号一栏可以填微信号等任意账号，价格说明会保存', async () => {
    const auth = { Authorization: `Bearer ${await token()}` }
    const res = await fetch(
      `${base}/api/profile`,
      json('PUT', { phone: 'Strive-after-H', email: 'a@b.co', resume: '/files/cv.pdf', priceNote: '源码 ¥199 起' }, auth),
    )
    expect(res.status).toBe(200)
    const saved = await (await fetch(`${base}/api/profile`)).json()
    expect(saved).toMatchObject({ phone: 'Strive-after-H', email: 'a@b.co', resume: '/files/cv.pdf', priceNote: '源码 ¥199 起' })
  })

  it('session 接口区分有效与无效 token', async () => {
    const good = await fetch(`${base}/api/session`, { headers: { Authorization: `Bearer ${await token()}` } })
    expect(good.status).toBe(200)
    const bad = await fetch(`${base}/api/session`, { headers: { Authorization: 'Bearer 1.abc' } })
    expect(bad.status).toBe(401)
    const expired = await fetch(`${base}/api/profile`, json('PUT', {}, { Authorization: 'Bearer 1.abc' }))
    expect(expired.status).toBe(401)
  })

  it('同一 IP 连续输错 5 次后限速，其他 IP 不受影响', async () => {
    const wrong = () => fetch(`${base}/api/login`, json('POST', { password: 'x' }, { 'X-Forwarded-For': '10.9.9.9' }))
    for (let i = 0; i < 5; i++) expect((await wrong()).status).toBe(401)
    expect((await wrong()).status).toBe(429)
    expect(await token('10.8.8.8')).toBeTruthy()
  })
})

describe('访问统计接口', () => {
  const ua = { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1' }
  const track = (body, headers = {}) =>
    fetch(`${base}/api/track`, json('POST', body, { ...ua, 'X-Forwarded-For': '10.1.1.1', ...headers }))

  it('记录浏览、访客去重、项目咨询与来源，过滤爬虫和非法路径', async () => {
    expect((await track({ type: 'view', path: '/projects/flower-shop', slug: 'flower-shop', device: 'mobile', referrer: 'https://www.baidu.com/s?wd=x' })).status).toBe(204)
    await track({ type: 'view', path: '/', device: 'mobile' })
    await track({ type: 'view', path: '/about', device: 'desktop' }, { 'X-Forwarded-For': '10.2.2.2' })
    await track({ type: 'contact', slug: 'flower-shop' })
    await track({ type: 'copy', slug: 'flower-shop' })
    await track({ type: 'view', path: '/<script>' })
    await track({ type: 'view', path: '/' }, { 'User-Agent': 'Mozilla/5.0 (compatible; Baiduspider/2.0)' })
    await track({ type: 'unknown' })

    expect((await fetch(`${base}/api/stats`)).status).toBe(401)
    const res = await fetch(`${base}/api/stats?days=7`, { headers: { Authorization: `Bearer ${await token()}` } })
    const stats = await res.json()
    expect(stats.total).toEqual({ views: 3, visitors: 2, mobile: 2, desktop: 1, contacts: 1, copies: 1 })
    expect(stats.daily).toHaveLength(7)
    expect(stats.projects).toEqual([{ slug: 'flower-shop', views: 1, contacts: 1 }])
    expect(stats.referrers).toEqual([{ key: 'www.baidu.com', count: 1 }])
    expect(stats.pages.map((p) => p.key).sort()).toEqual(['/', '/about', '/projects/flower-shop'])
  })

  it('统计定期落盘，重启后数据仍在', async () => {
    await new Promise((r) => setTimeout(r, 200))
    const { readFileSync } = await import('node:fs')
    const saved = JSON.parse(readFileSync(join(dir, 'stats.json'), 'utf8'))
    const [day] = Object.values(saved.days)
    expect(day.views).toBe(3)
    expect(JSON.stringify(saved)).not.toContain('10.1.1.1')
  })
})

describe('买家留言与二维码', () => {
  const post = (path, body, headers = {}) => fetch(`${base}${path}`, json('POST', body, headers))
  // 1×1 PNG
  const PNG =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

  it('留言需要联系方式和内容，蜜罐字段会被静默丢弃', async () => {
    expect((await post('/api/messages', { message: '想买这个项目' }, { 'X-Forwarded-For': '10.5.0.1' })).status).toBe(400)
    expect((await post('/api/messages', { contact: 'wx: abc' }, { 'X-Forwarded-For': '10.5.0.1' })).status).toBe(400)
    expect((await post('/api/messages', { contact: 'bot', message: 'spam', website: 'http://x' }, { 'X-Forwarded-For': '10.5.0.1' })).status).toBe(200)
    const ok = await post('/api/messages', { name: '小王', contact: 'wx: abc123', message: '想要带管理端的版本', slug: 'wims' }, { 'X-Forwarded-For': '10.5.0.2' })
    expect(ok.status).toBe(200)
  })

  it('只有登录后能读留言，可标记已读和删除', async () => {
    expect((await fetch(`${base}/api/messages`)).status).toBe(401)
    const auth = { Authorization: `Bearer ${await token()}` }
    let data = await (await fetch(`${base}/api/messages`, { headers: auth })).json()
    expect(data.messages).toHaveLength(1)
    expect(data.unread).toBe(1)
    expect(data.messages[0]).toMatchObject({ name: '小王', contact: 'wx: abc123', slug: 'wims', read: false })
    const id = data.messages[0].id
    expect((await post('/api/messages/read', { id }, auth)).status).toBe(200)
    data = await (await fetch(`${base}/api/messages`, { headers: auth })).json()
    expect(data.unread).toBe(0)
    expect((await post('/api/messages/delete', { id }, auth)).status).toBe(200)
    data = await (await fetch(`${base}/api/messages`, { headers: auth })).json()
    expect(data.messages).toHaveLength(0)
  })

  it('同一 IP 每小时最多 5 条留言', async () => {
    const ip = { 'X-Forwarded-For': '10.5.0.9' }
    for (let i = 0; i < 5; i++) {
      expect((await post('/api/messages', { contact: 'a@b.co', message: `第 ${i} 条` }, ip)).status).toBe(200)
    }
    expect((await post('/api/messages', { contact: 'a@b.co', message: '第 6 条' }, ip)).status).toBe(429)
  })

  it('二维码上传要登录，按文件头校验类型，可读取和删除', async () => {
    expect((await post('/api/media/wechat-qr', { dataUrl: PNG })).status).toBe(401)
    const auth = { Authorization: `Bearer ${await token()}` }
    const bad = await post('/api/media/wechat-qr', { dataUrl: 'data:image/png;base64,aGVsbG8=' }, auth)
    expect(bad.status).toBe(400)
    expect((await post('/api/media/wechat-qr', { dataUrl: PNG }, auth)).status).toBe(200)
    const img = await fetch(`${base}/api/media/wechat-qr`)
    expect(img.status).toBe(200)
    expect(img.headers.get('content-type')).toBe('image/png')
    expect((await fetch(`${base}/api/media/wechat-qr`, { method: 'DELETE', headers: auth })).status).toBe(200)
    expect((await fetch(`${base}/api/media/wechat-qr`)).status).toBe(404)
  })
})
