'use strict'
// 站点 API：公开资料仍存为 JSON；普通用户、会话和积分设置使用 SQLite。
// GET  /api/profile  公开读取（站点启动时拉取）
// POST /api/login    用密码换 token
// GET  /api/session  检查 token 是否仍有效
// PUT  /api/profile  带 token 保存；格式不对的字段返回 400 和字段名，不再静默清空
// POST /api/track    访客浏览与咨询事件（公开，过滤爬虫并限速）
// GET  /api/stats    带 token 读取访问统计
// POST /api/messages 买家留言（公开，蜜罐 + 限速）；GET 带 token 读取，/read /delete 管理
// /api/media/wechat-qr  GET 公开读取微信二维码，POST/DELETE 带 token 上传或删除
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { createAccountStore } = require('./account-store')

const PORT = Number(process.env.PORT || 3000)
const DATA_FILE = process.env.DATA_FILE || '/data/profile.json'
const DB_FILE = process.env.DB_FILE || path.join(path.dirname(DATA_FILE), 'app.db')
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

const accounts = createAccountStore(DB_FILE)

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
const URL_FIELDS = { github: 300, resume: 300, avatar: 500, blog: 300, wechatQr: 200 }

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
  wechatQr: '微信二维码',
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

// ---- 买家留言 ----
const MESSAGES_FILE = process.env.MESSAGES_FILE || path.join(path.dirname(DATA_FILE), 'messages.json')
const MEDIA_DIR = process.env.MEDIA_DIR || path.join(path.dirname(DATA_FILE), 'media')
const MAX_MESSAGES = 500
const MESSAGE_LIMIT_PER_HOUR = 5

function loadMessages() {
  try {
    const list = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'))
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}
let messages = loadMessages()
function saveMessages() {
  fs.mkdirSync(path.dirname(MESSAGES_FILE), { recursive: true })
  const tmp = `${MESSAGES_FILE}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(messages, null, 2))
  fs.renameSync(tmp, MESSAGES_FILE)
}

// 同一 IP 每小时最多 5 条，避免被灌垃圾留言
const messageBudget = new Map()
setInterval(() => messageBudget.clear(), 60 * 60 * 1000).unref()

const text = (value, max) => String(value == null ? '' : value).trim().slice(0, max)

// ---- 微信二维码等媒体文件 ----
const MEDIA_TYPES = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }
const MAX_MEDIA_BYTES = 400 * 1024

/** 校验 data:URL 并返回 {ext, buffer}，不合格返回带 error 的对象 */
function decodeImage(dataUrl) {
  const match = /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=\s]+)$/.exec(String(dataUrl || ''))
  if (!match) return { error: '请上传 PNG、JPG 或 WebP 图片' }
  const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64')
  if (!buffer.length) return { error: '图片内容为空' }
  if (buffer.length > MAX_MEDIA_BYTES) return { error: '图片太大了，请压缩到 400KB 以内' }
  // 按文件头判断真实类型，不信任 data:URL 里写的类型
  const hex = buffer.subarray(0, 12).toString('hex')
  const ext = hex.startsWith('89504e470d0a1a0a')
    ? 'png'
    : hex.startsWith('ffd8ff')
      ? 'jpg'
      : buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
        ? 'webp'
        : ''
  return ext ? { ext, buffer } : { error: '图片格式无法识别，请重新导出后上传' }
}

function findMedia(name) {
  for (const ext of Object.keys(MEDIA_TYPES)) {
    const file = path.join(MEDIA_DIR, `${name}.${ext}`)
    if (fs.existsSync(file)) return { file, ext }
  }
  return null
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
    accounts.close()
    process.exit(0)
  })
}

setInterval(() => accounts.cleanup(), 60 * 60 * 1000).unref()

const bump = (obj, key, max = MAX_KEYS_PER_DAY) => {
  if (key in obj || Object.keys(obj).length < max) obj[key] = (obj[key] || 0) + 1
}

// 同一 IP 每 10 分钟最多记 200 个事件，超出的静默丢弃
const trackBudget = new Map()
setInterval(() => trackBudget.clear(), 10 * 60 * 1000).unref()

// 普通账号接口按 IP 做固定窗口限速。它只作为第一层保护，数据库约束仍负责最终一致性。
const registerBudget = new Map()
const userLoginBudget = new Map()
setInterval(() => {
  registerBudget.clear()
  userLoginBudget.clear()
}, 15 * 60 * 1000).unref()

// 分享访问与有效访问确认：同一 IP 每 10 分钟各 30 次，正常访客远用不到，挡住批量刷待确认记录。
const shareVisitBudget = new Map()
const shareQualifyBudget = new Map()
const SHARE_BUDGET = 30
setInterval(() => {
  shareVisitBudget.clear()
  shareQualifyBudget.clear()
}, 10 * 60 * 1000).unref()

function budgetExceeded(budget, ip, maximum) {
  const used = budget.get(ip) || 0
  if (used >= maximum) return true
  budget.set(ip, used + 1)
  return false
}

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

function visitorHash(ip, userAgent) {
  return crypto.createHmac('sha256', SECRET).update(`${ip}\n${userAgent}`).digest('hex')
}

/** IPv4 取整个地址；IPv6 取 /64 网段（同一台设备会在网段内轮换地址） */
function networkKey(ip) {
  const addr = String(ip || '').replace(/^::ffff:/i, '')
  if (!addr.includes(':')) return addr
  const [head, tail = ''] = addr.split('::')
  const h = head ? head.split(':') : []
  const t = tail ? tail.split(':') : []
  const groups = addr.includes('::') ? [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t] : h
  return `${groups.slice(0, 4).map((g) => parseInt(g || '0', 16).toString(16)).join(':')}::/64`
}

/** 请求方的网络与设备标记（HMAC 后才入库）。设备号由前端生成存在 localStorage，经 X-Device-Id 发来 */
function clientMarks(req, ip) {
  const key = networkKey(ip)
  const deviceId = String(req.headers['x-device-id'] || '')
  const hmac = (value) => crypto.createHmac('sha256', SECRET).update(value).digest('hex')
  return {
    network: key ? hmac(`net\n${key}`) : '',
    device: /^[A-Za-z0-9_-]{16,64}$/.test(deviceId) ? hmac(`dev\n${deviceId}`) : '',
  }
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
  const marks = clientMarks(req, ip)

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

  if (url.pathname === '/api/auth/register' && req.method === 'POST') {
    if (budgetExceeded(registerBudget, ip, 5)) {
      return send(res, 429, { error: '注册尝试过于频繁，请稍后再试' })
    }
    let body
    try {
      body = await readBody(req, 8 * 1024)
    } catch {
      return send(res, 400, { error: '请求格式错误' })
    }
    // 蜜罐字段：正常页面不会填写，机器人提交时返回成功但不创建账号。
    if (text(body.website, 10)) return send(res, 200, { ok: true })
    try {
      const result = accounts.register(body, marks)
      if (result.invalid) return send(res, 400, result.invalid)
      return send(res, 201, result)
    } catch (error) {
      console.error('用户注册失败', error)
      return send(res, 500, { error: '注册暂时不可用，请稍后再试' })
    }
  }

  if (url.pathname === '/api/auth/login' && req.method === 'POST') {
    if (budgetExceeded(userLoginBudget, ip, 10)) {
      return send(res, 429, { error: '登录尝试过于频繁，请稍后再试' })
    }
    let body
    try {
      body = await readBody(req, 8 * 1024)
    } catch {
      return send(res, 400, { error: '请求格式错误' })
    }
    try {
      const result = accounts.login(body.username, body.password, marks)
      if (!result) return send(res, 401, { error: '用户名或密码不正确' })
      if (result.blocked) return send(res, 403, { error: '账号已被停用，请联系管理员' })
      userLoginBudget.delete(ip)
      return send(res, 200, result)
    } catch (error) {
      console.error('用户登录失败', error)
      return send(res, 500, { error: '登录暂时不可用，请稍后再试' })
    }
  }

  if (url.pathname === '/api/auth/me' && req.method === 'GET') {
    const user = accounts.authenticate(bearer(req), marks)
    if (!user) return send(res, 401, { error: '登录已过期，请重新登录' })
    const { sessionId, ...publicData } = user
    return send(res, 200, { user: publicData })
  }

  if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
    accounts.logout(bearer(req))
    return send(res, 200, { ok: true })
  }

  if (url.pathname === '/api/auth/change-password' && req.method === 'POST') {
    const user = accounts.authenticate(bearer(req), marks)
    if (!user) return send(res, 401, { error: '登录已过期，请重新登录' })
    let body
    try {
      body = await readBody(req, 8 * 1024)
    } catch {
      return send(res, 400, { error: '请求格式错误' })
    }
    const result = accounts.changePassword(user.id, body.currentPassword, body.nextPassword)
    if (result.invalid) return send(res, 400, result.invalid)
    return send(res, 200, { ok: true, loginRequired: true })
  }

  if (url.pathname === '/api/shares/create' && req.method === 'POST') {
    const user = accounts.authenticate(bearer(req), marks)
    if (!user) return send(res, 401, { error: '登录后才能创建积分分享链接' })
    let body
    try { body = await readBody(req, 4 * 1024) } catch { return send(res, 400, { error: '请求格式错误' }) }
    const result = accounts.createShare(user.id, body.projectSlug)
    if (result.invalid) return send(res, 400, result.invalid)
    return send(res, 200, result)
  }

  if (url.pathname === '/api/shares/visit' && req.method === 'POST') {
    const ua = String(req.headers['user-agent'] || '')
    if (!ua || BOT_RE.test(ua)) return send(res, 200, { eligible: false })
    if (budgetExceeded(shareVisitBudget, ip, SHARE_BUDGET)) return send(res, 200, { eligible: false })
    let body
    try { body = await readBody(req, 4 * 1024) } catch { return send(res, 400, { error: '请求格式错误' }) }
    const currentUser = accounts.authenticate(bearer(req), marks)
    const result = accounts.beginVisit(body.referralCode, body.projectSlug, { visitor: visitorHash(ip, ua), ...marks }, currentUser?.id)
    if (!result || result.rejected) return send(res, 200, { eligible: false })
    return send(res, 201, { eligible: true, ...result })
  }

  if (url.pathname === '/api/shares/qualify' && req.method === 'POST') {
    if (budgetExceeded(shareQualifyBudget, ip, SHARE_BUDGET)) return send(res, 200, { rewarded: false, reason: 'rate_limited' })
    let body
    try { body = await readBody(req, 4 * 1024) } catch { return send(res, 400, { error: '请求格式错误' }) }
    const result = accounts.qualifyVisit(body.visitToken, body.interacted === true)
    return send(res, 200, result)
  }

  if (url.pathname === '/api/account/share-summary' && req.method === 'GET') {
    const user = accounts.authenticate(bearer(req), marks)
    if (!user) return send(res, 401, { error: '登录已过期，请重新登录' })
    return send(res, 200, accounts.accountSummary(user.id))
  }

  if (url.pathname === '/api/account/point-transactions' && req.method === 'GET') {
    const user = accounts.authenticate(bearer(req), marks)
    if (!user) return send(res, 401, { error: '登录已过期，请重新登录' })
    return send(res, 200, { transactions: accounts.pointTransactions(user.id) })
  }

  if (url.pathname === '/api/account/share-visits' && req.method === 'GET') {
    const user = accounts.authenticate(bearer(req), marks)
    if (!user) return send(res, 401, { error: '登录已过期，请重新登录' })
    return send(res, 200, { visits: accounts.shareVisits(user.id) })
  }

  if (url.pathname === '/api/admin/points/settings') {
    if (!verifyToken(bearer(req))) return send(res, 401, { error: '登录已过期，请重新登录' })
    if (req.method === 'GET') return send(res, 200, accounts.adminSettings())
    if (req.method === 'PUT') {
      let body
      try { body = await readBody(req) } catch { return send(res, 400, { error: '请求格式错误' }) }
      const result = accounts.updateSettings(body)
      if (result.invalid) return send(res, 400, result.invalid)
      return send(res, 200, result)
    }
  }

  if (url.pathname === '/api/admin/users' && req.method === 'GET') {
    if (!verifyToken(bearer(req))) return send(res, 401, { error: '登录已过期，请重新登录' })
    return send(res, 200, { users: accounts.adminUsers(url.searchParams.get('search') || '') })
  }

  const userDetailMatch = url.pathname.match(/^\/api\/admin\/users\/(\d+)$/)
  if (userDetailMatch && req.method === 'GET') {
    if (!verifyToken(bearer(req))) return send(res, 401, { error: '登录已过期，请重新登录' })
    const result = accounts.adminUser(Number(userDetailMatch[1]))
    return result ? send(res, 200, result) : send(res, 404, { error: '用户不存在' })
  }

  const statusMatch = url.pathname.match(/^\/api\/admin\/users\/(\d+)\/status$/)
  if (statusMatch && req.method === 'POST') {
    if (!verifyToken(bearer(req))) return send(res, 401, { error: '登录已过期，请重新登录' })
    let body
    try { body = await readBody(req) } catch { return send(res, 400, { error: '请求格式错误' }) }
    const result = accounts.setUserStatus(Number(statusMatch[1]), body.status, body.reason)
    if (result.invalid) return send(res, 400, result.invalid)
    return send(res, 200, result)
  }

  const pointsMatch = url.pathname.match(/^\/api\/admin\/users\/(\d+)\/points$/)
  if (pointsMatch && req.method === 'POST') {
    if (!verifyToken(bearer(req))) return send(res, 401, { error: '登录已过期，请重新登录' })
    let body
    try { body = await readBody(req) } catch { return send(res, 400, { error: '请求格式错误' }) }
    const result = accounts.adjustPoints(Number(pointsMatch[1]), body.amount, body.reason)
    if (result.invalid) return send(res, 400, result.invalid)
    return send(res, 200, result)
  }

  if (url.pathname === '/api/admin/point-transactions' && req.method === 'GET') {
    if (!verifyToken(bearer(req))) return send(res, 401, { error: '登录已过期，请重新登录' })
    return send(res, 200, { transactions: accounts.adminTransactions() })
  }

  const revokeMatch = url.pathname.match(/^\/api\/admin\/point-transactions\/(\d+)\/revoke$/)
  if (revokeMatch && req.method === 'POST') {
    if (!verifyToken(bearer(req))) return send(res, 401, { error: '登录已过期，请重新登录' })
    let body
    try { body = await readBody(req) } catch { return send(res, 400, { error: '请求格式错误' }) }
    const result = accounts.revokeTransaction(Number(revokeMatch[1]), body.reason)
    if (result.invalid) return send(res, 400, result.invalid)
    return send(res, 200, result)
  }

  if (url.pathname === '/api/admin/audit-logs' && req.method === 'GET') {
    if (!verifyToken(bearer(req))) return send(res, 401, { error: '登录已过期，请重新登录' })
    return send(res, 200, { logs: accounts.auditLogs() })
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

  if (url.pathname === '/api/messages' && req.method === 'POST') {
    let body
    try {
      body = await readBody(req, 16 * 1024)
    } catch {
      return send(res, 400, { error: '请求格式错误' })
    }
    // 蜜罐字段：真实访客看不到这个输入框，填了的一律当机器人
    if (text(body.website, 10)) return send(res, 200, { ok: true })
    const used = messageBudget.get(ip) || 0
    if (used >= MESSAGE_LIMIT_PER_HOUR) return send(res, 429, { error: '留言太频繁了，请稍后再试' })
    const contact = text(body.contact, 80)
    const message = text(body.message, 1000)
    if (!contact) return send(res, 400, { error: '请留下联系方式，否则没法回复你', field: 'contact' })
    if (!message) return send(res, 400, { error: '请写一下你的需求', field: 'message' })
    messageBudget.set(ip, used + 1)
    messages.unshift({
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      name: text(body.name, 40),
      contact,
      message,
      slug: text(body.slug, 60),
      read: false,
    })
    messages = messages.slice(0, MAX_MESSAGES)
    try {
      saveMessages()
    } catch (e) {
      console.error('留言写入失败', e)
      return send(res, 500, { error: '留言没能保存，请直接用页面上的联系方式找我' })
    }
    return send(res, 200, { ok: true })
  }

  if (url.pathname === '/api/messages' && req.method === 'GET') {
    if (!verifyToken(bearer(req))) return send(res, 401, { error: '登录已过期，请重新登录' })
    return send(res, 200, { messages, unread: messages.filter((m) => !m.read).length })
  }

  if ((url.pathname === '/api/messages/read' || url.pathname === '/api/messages/delete') && req.method === 'POST') {
    if (!verifyToken(bearer(req))) return send(res, 401, { error: '登录已过期，请重新登录' })
    let body
    try {
      body = await readBody(req)
    } catch {
      return send(res, 400, { error: '请求格式错误' })
    }
    const id = text(body.id, 64)
    const found = messages.find((m) => m.id === id)
    if (!found) return send(res, 404, { error: '这条留言不存在' })
    if (url.pathname.endsWith('read')) found.read = body.read !== false
    else messages = messages.filter((m) => m.id !== id)
    try {
      saveMessages()
    } catch (e) {
      console.error('留言写入失败', e)
      return send(res, 500, { error: '保存失败' })
    }
    return send(res, 200, { ok: true, unread: messages.filter((m) => !m.read).length })
  }

  if (url.pathname === '/api/media/wechat-qr' && req.method === 'GET') {
    const found = findMedia('wechat-qr')
    if (!found) return send(res, 404, { error: 'not found' })
    res.writeHead(200, {
      'Content-Type': MEDIA_TYPES[found.ext],
      'Cache-Control': 'public, max-age=60',
      'X-Content-Type-Options': 'nosniff',
    })
    return fs.createReadStream(found.file).pipe(res)
  }

  if (url.pathname === '/api/media/wechat-qr' && (req.method === 'POST' || req.method === 'DELETE')) {
    if (!verifyToken(bearer(req))) return send(res, 401, { error: '登录已过期，请重新登录' })
    const existing = findMedia('wechat-qr')
    if (req.method === 'DELETE') {
      if (existing) fs.rmSync(existing.file, { force: true })
      return send(res, 200, { ok: true })
    }
    let body
    try {
      body = await readBody(req, MAX_MEDIA_BYTES * 2)
    } catch (e) {
      return send(res, 400, { error: e.message === 'too large' ? '图片太大了，请压缩到 400KB 以内' : '请求格式错误' })
    }
    const image = decodeImage(body.dataUrl)
    if (image.error) return send(res, 400, { error: image.error, field: 'wechatQr' })
    try {
      fs.mkdirSync(MEDIA_DIR, { recursive: true })
      if (existing) fs.rmSync(existing.file, { force: true })
      fs.writeFileSync(path.join(MEDIA_DIR, `wechat-qr.${image.ext}`), image.buffer)
    } catch (e) {
      console.error('二维码写入失败', e)
      return send(res, 500, { error: '图片保存失败' })
    }
    return send(res, 200, { ok: true, url: '/api/media/wechat-qr' })
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

server.listen(PORT, () => console.log(`site api on :${PORT}, profile=${DATA_FILE}, database=${DB_FILE}`))
