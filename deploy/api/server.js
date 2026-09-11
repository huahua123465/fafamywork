'use strict'
// 个人资料 API：零依赖，把资料存成一个 JSON 文件。
// GET  /api/profile  公开读取（站点启动时拉取）
// POST /api/login    用密码换 token
// GET  /api/session  检查 token 是否仍有效
// PUT  /api/profile  带 token 保存；格式不对的字段返回 400 和字段名，不再静默清空
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const PORT = Number(process.env.PORT || 3000)
const DATA_FILE = process.env.DATA_FILE || '/data/profile.json'
const PASSWORD = process.env.ADMIN_PASSWORD || ''
const SECRET = process.env.TOKEN_SECRET || crypto.randomBytes(32).toString('hex')
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000

if (!PASSWORD) {
  console.error('缺少 ADMIN_PASSWORD 环境变量，拒绝启动')
  process.exit(1)
}

// ---- 字段白名单：只接受这些键，其余一律丢弃 ----
const TEXT_FIELDS = {
  name: 40,
  role: 60,
  introduction: 400,
  email: 120,
  wechat: 60,
  qq: 30,
  phone: 40,
  location: 60,
  siteName: 30,
  footerText: 60,
  priceNote: 120,
}
const URL_FIELDS = { github: 300, resume: 300, avatar: 500, blog: 300 }

const EMPTY = () => {
  const o = {}
  for (const k of Object.keys(TEXT_FIELDS)) o[k] = ''
  for (const k of Object.keys(URL_FIELDS)) o[k] = ''
  o.stories = []
  o.timeline = []
  o.updatedAt = ''
  return o
}

function safeUrl(value, max) {
  const v = String(value || '').trim()
  if (!v) return ''
  if (v.length > max) return ''
  // 允许站内相对路径（头像可以放 /images/... ）
  if (v.startsWith('/') && !v.startsWith('//')) return v
  try {
    const u = new URL(v)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : ''
  } catch {
    return ''
  }
}

const FIELD_LABELS = {
  email: '邮箱',
  github: 'GitHub 主页',
  blog: '个人博客 / 主页',
  resume: '简历链接',
  avatar: '头像地址',
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** 返回第一个格式不对的字段，全部合格返回 null。手机号不校验：允许填微信号等其他联系账号。 */
function validate(input) {
  if (!input || typeof input !== 'object') return { field: '', error: '请求格式错误' }
  const email = typeof input.email === 'string' ? input.email.trim() : ''
  if (email && !EMAIL_RE.test(email)) return { field: 'email', error: '邮箱格式不正确' }
  for (const [k, max] of Object.entries(URL_FIELDS)) {
    const v = typeof input[k] === 'string' ? input[k].trim() : ''
    if (!v) continue
    if (v.length > max) return { field: k, error: `${FIELD_LABELS[k]}太长了，最多 ${max} 个字符` }
    if (!safeUrl(v, max)) return { field: k, error: `${FIELD_LABELS[k]}需要以 https:// 开头，或填写以 / 开头的站内路径` }
  }
  return null
}

function sanitize(input) {
  const out = EMPTY()
  if (!input || typeof input !== 'object') return out
  for (const [k, max] of Object.entries(TEXT_FIELDS)) {
    if (typeof input[k] === 'string') out[k] = input[k].trim().slice(0, max)
  }
  for (const [k, max] of Object.entries(URL_FIELDS)) {
    if (typeof input[k] === 'string') out[k] = safeUrl(input[k], max)
  }
  if (Array.isArray(input.stories)) {
    out.stories = input.stories
      .filter((s) => typeof s === 'string' && s.trim())
      .slice(0, 6)
      .map((s) => s.trim().slice(0, 500))
  }
  if (Array.isArray(input.timeline)) {
    out.timeline = input.timeline
      .filter((t) => t && typeof t === 'object')
      .slice(0, 20)
      .map((t) => ({
        date: String(t.date || '').trim().slice(0, 30),
        title: String(t.title || '').trim().slice(0, 60),
        text: String(t.text || '').trim().slice(0, 300),
      }))
      .filter((t) => t.date || t.title || t.text)
  }
  out.updatedAt = new Date().toISOString()
  return out
}

function readProfile() {
  try {
    return { ...EMPTY(), ...JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) }
  } catch {
    return EMPTY()
  }
}

function writeProfile(profile) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true })
  const tmp = `${DATA_FILE}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(profile, null, 2))
  fs.renameSync(tmp, DATA_FILE) // 原子替换，避免读到写了一半的文件
}

// ---- token ----
function issueToken() {
  const exp = Date.now() + TOKEN_TTL_MS
  const sig = crypto.createHmac('sha256', SECRET).update(String(exp)).digest('hex')
  return `${exp}.${sig}`
}
function verifyToken(token) {
  const [exp, sig] = String(token || '').split('.')
  if (!exp || !sig || Number(exp) < Date.now()) return false
  const expected = crypto.createHmac('sha256', SECRET).update(exp).digest('hex')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
function checkPassword(candidate) {
  const a = crypto.createHash('sha256').update(String(candidate || '')).digest()
  const b = crypto.createHash('sha256').update(PASSWORD).digest()
  return crypto.timingSafeEqual(a, b)
}

// ---- 登录限速：同一 IP 连续失败后逐步拉长等待；15 分钟没有再失败就清零 ----
const ATTEMPT_RESET_MS = 15 * 60 * 1000
const attempts = new Map()
setInterval(() => {
  const now = Date.now()
  for (const [ip, rec] of attempts) if (now - rec.last > ATTEMPT_RESET_MS) attempts.delete(ip)
}, 60 * 1000).unref()
function loginBlocked(ip) {
  const rec = attempts.get(ip)
  if (!rec) return 0
  if (Date.now() - rec.last > ATTEMPT_RESET_MS) {
    attempts.delete(ip)
    return 0
  }
  if (rec.count < 5) return 0
  const wait = Math.min(2 ** (rec.count - 4), 300) * 1000
  const left = rec.last + wait - Date.now()
  return left > 0 ? Math.ceil(left / 1000) : 0
}
function noteLogin(ip, ok) {
  if (ok) return attempts.delete(ip)
  const old = attempts.get(ip)
  const rec = old && Date.now() - old.last <= ATTEMPT_RESET_MS ? old : { count: 0, last: 0 }
  rec.count += 1
  rec.last = Date.now()
  attempts.set(ip, rec)
}

function send(res, code, body) {
  const payload = JSON.stringify(body)
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  res.end(payload)
}

function bearer(req) {
  return String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
}

function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > limit) {
        reject(new Error('too large'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'))
      } catch {
        reject(new Error('bad json'))
      }
    })
    req.on('error', reject)
  })
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress

  if (url.pathname === '/api/health') return send(res, 200, { ok: true })

  if (url.pathname === '/api/profile' && req.method === 'GET') {
    return send(res, 200, readProfile())
  }

  if (url.pathname === '/api/login' && req.method === 'POST') {
    const wait = loginBlocked(ip)
    if (wait) return send(res, 429, { error: `尝试过于频繁，请 ${wait} 秒后再试` })
    let body
    try {
      body = await readBody(req)
    } catch {
      return send(res, 400, { error: '请求格式错误' })
    }
    const ok = checkPassword(body.password)
    noteLogin(ip, ok)
    if (!ok) return send(res, 401, { error: '密码不正确' })
    return send(res, 200, { token: issueToken(), expiresIn: TOKEN_TTL_MS })
  }

  if (url.pathname === '/api/session' && req.method === 'GET') {
    const token = bearer(req)
    if (!verifyToken(token)) return send(res, 401, { error: '登录已过期，请重新登录' })
    return send(res, 200, { ok: true, expiresAt: Number(token.split('.')[0]) })
  }

  if (url.pathname === '/api/profile' && req.method === 'PUT') {
    if (!verifyToken(bearer(req))) return send(res, 401, { error: '登录已过期，请重新登录' })
    let body
    try {
      body = await readBody(req)
    } catch (e) {
      return send(res, 400, { error: e.message === 'too large' ? '内容过大' : '请求格式错误' })
    }
    const invalid = validate(body)
    if (invalid) return send(res, 400, invalid)
    const profile = sanitize(body)
    try {
      writeProfile(profile)
    } catch (e) {
      console.error('写入失败', e)
      return send(res, 500, { error: '保存失败' })
    }
    return send(res, 200, profile)
  }

  send(res, 404, { error: 'not found' })
})

server.listen(PORT, () => console.log(`profile api on :${PORT}, data=${DATA_FILE}`))
