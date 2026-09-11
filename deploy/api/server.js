'use strict'
// 个人资料 API：零依赖，把资料存成一个 JSON 文件。
// GET  /api/profile  公开读取（站点启动时拉取）
// POST /api/login    用密码换 token
// GET  /api/session  检查 token 是否仍有效
// PUT  /api/profile  带 token 保存；格式不对的字段返回 400 和字段名，不再静默清空
// POST /api/track    访客浏览与咨询事件（公开，过滤爬虫并限速）
// GET  /api/stats    带 token 读取访问统计
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const PORT = Number(process.env.PORT || 3000)
const DATA_FILE = process.env.DATA_FILE || '/data/profile.json'
const PASSWORD = process.env.ADMIN_PASSWORD || ''
const SECRET = process.env.TOKEN_SECRET || crypto.randomBytes(32).toString('hex')
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000
const STATS_FILE = process.env.STATS_FILE || path.join(path.dirname(DATA_FILE), 'stats.json')
const STATS_FLUSH_MS = Number(process.env.STATS_FLUSH_MS || 5000)
const STATS_KEEP_DAYS = 400

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

// ---- 访问统计 ----
// 只存按天聚合的计数；访客去重用「当天日期 + IP + UA」的 HMAC 摘要，密钥是 TOKEN_SECRET，
// 不落盘原始 IP。日期按北京时间划分。
const BOT_RE = /bot|spider|crawl|slurp|curl|wget|python|java\/|go-http|headless|lighthouse|preview|facebookexternalhit|monitor/i
const PATH_RE = /^\/[a-z0-9\-/]{0,120}$/
const SLUG_RE = /^[a-z0-9-]{1,60}$/
const MAX_KEYS_PER_DAY = 300

const today = (now = Date.now()) => new Date(now + 8 * 3600 * 1000).toISOString().slice(0, 10)
const emptyDay = () => ({ views: 0, visitors: 0, mobile: 0, desktop: 0, contacts: 0, copies: 0, pages: {}, projects: {}, referrers: {} })

function loadStats() {
  try {
    const data = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'))
    return { days: data.days || {}, visitorIds: data.visitorIds || { date: '', ids: [] } }
  } catch {
    return { days: {}, visitorIds: { date: '', ids: [] } }
  }
}
const stats = loadStats()
const visitorSet = new Set(stats.visitorIds.date === today() ? stats.visitorIds.ids : [])
let statsDirty = false

function flushStats() {
  if (!statsDirty) return
  statsDirty = false
  const date = today()
  const cutoff = today(Date.now() - STATS_KEEP_DAYS * 86400 * 1000)
  for (const day of Object.keys(stats.days)) if (day < cutoff) delete stats.days[day]
  stats.visitorIds = { date, ids: [...visitorSet] }
  try {
    fs.mkdirSync(path.dirname(STATS_FILE), { recursive: true })
    const tmp = `${STATS_FILE}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(stats))
    fs.renameSync(tmp, STATS_FILE)
  } catch (e) {
    statsDirty = true
    console.error('统计写入失败', e)
  }
}
setInterval(flushStats, STATS_FLUSH_MS).unref()
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    flushStats()
    process.exit(0)
  })
}

const bump = (obj, key, max = MAX_KEYS_PER_DAY) => {
  if (key in obj || Object.keys(obj).length < max) obj[key] = (obj[key] || 0) + 1
}

// 同一 IP 每 10 分钟最多记 200 个事件，超出的静默丢弃
const trackBudget = new Map()
setInterval(() => trackBudget.clear(), 10 * 60 * 1000).unref()

function recordEvent(event, ip, ua, host) {
  const date = today()
  if (stats.visitorIds.date !== date) {
    visitorSet.clear()
    stats.visitorIds = { date, ids: [] }
  }
  const day = (stats.days[date] ||= emptyDay())
  const slug = SLUG_RE.test(event.slug || '') ? event.slug : ''
  const project = () =>
    slug && (slug in day.projects || Object.keys(day.projects).length < MAX_KEYS_PER_DAY)
      ? (day.projects[slug] ||= { views: 0, contacts: 0 })
      : null

  if (event.type === 'view') {
    if (!PATH_RE.test(event.path || '')) return false
    day.views += 1
    day[event.device === 'mobile' ? 'mobile' : 'desktop'] += 1
    bump(day.pages, event.path)
    const match = event.path.match(/^\/projects\/([a-z0-9-]+)$/)
    const entry = match && match[1] === slug && project()
    if (entry) entry.views += 1
    const visitor = crypto.createHmac('sha256', SECRET).update(`${date}|${ip}|${ua}`).digest('hex').slice(0, 16)
    if (!visitorSet.has(visitor)) {
      visitorSet.add(visitor)
      day.visitors += 1
    }
    try {
      const ref = event.referrer ? new URL(event.referrer).hostname : ''
      if (ref && ref !== host) bump(day.referrers, ref.slice(0, 80))
    } catch {}
  } else if (event.type === 'contact') {
    day.contacts += 1
    const entry = project()
    if (entry) entry.contacts += 1
  } else if (event.type === 'copy') {
    day.copies += 1
  } else return false
  statsDirty = true
  return true
}

function summarizeStats(days) {
  const dates = []
  for (let i = days - 1; i >= 0; i--) dates.push(today(Date.now() - i * 86400 * 1000))
  const total = { views: 0, visitors: 0, mobile: 0, desktop: 0, contacts: 0, copies: 0 }
  const pages = {}
  const projects = {}
  const referrers = {}
  const daily = dates.map((date) => {
    const day = stats.days[date] || emptyDay()
    for (const key of Object.keys(total)) total[key] += day[key] || 0
    for (const [k, v] of Object.entries(day.pages)) pages[k] = (pages[k] || 0) + v
    for (const [k, v] of Object.entries(day.referrers)) referrers[k] = (referrers[k] || 0) + v
    for (const [k, v] of Object.entries(day.projects)) {
      const p = (projects[k] ||= { views: 0, contacts: 0 })
      p.views += v.views
      p.contacts += v.contacts
    }
    return { date, views: day.views, visitors: day.visitors, contacts: day.contacts }
  })
  const top = (obj, n) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([key, count]) => ({ key, count }))
  return {
    days,
    total,
    daily,
    pages: top(pages, 20),
    referrers: top(referrers, 10),
    projects: Object.entries(projects)
      .map(([slug, v]) => ({ slug, ...v }))
      .sort((a, b) => b.views - a.views || b.contacts - a.contacts)
      .slice(0, 30),
    firstDate: Object.keys(stats.days).sort()[0] || '',
  }
}

function send(res, code, body) {
  const payload = body === null ? '' : JSON.stringify(body)
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

  if (url.pathname === '/api/track' && req.method === 'POST') {
    const ua = String(req.headers['user-agent'] || '')
    if (!ua || BOT_RE.test(ua)) return send(res, 204, null)
    const used = trackBudget.get(ip) || 0
    if (used >= 200) return send(res, 204, null)
    trackBudget.set(ip, used + 1)
    let body
    try {
      body = await readBody(req, 4 * 1024)
    } catch {
      return send(res, 400, { error: '请求格式错误' })
    }
    recordEvent(body || {}, ip, ua, String(req.headers.host || '').split(':')[0])
    return send(res, 204, null)
  }

  if (url.pathname === '/api/stats' && req.method === 'GET') {
    if (!verifyToken(bearer(req))) return send(res, 401, { error: '登录已过期，请重新登录' })
    const days = Math.min(Math.max(Number(url.searchParams.get('days')) || 30, 1), 365)
    return send(res, 200, summarizeStats(days))
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
