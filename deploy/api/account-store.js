'use strict'

const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { DatabaseSync } = require('node:sqlite')

const USERNAME_RE = /^[a-zA-Z0-9_]{3,24}$/
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }

const nowIso = () => new Date().toISOString()
const tokenHash = (token) => crypto.createHash('sha256').update(token).digest('hex')
const chinaDayStartIso = () => {
  const shifted = new Date(Date.now() + 8 * 60 * 60 * 1000)
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - 8 * 60 * 60 * 1000).toISOString()
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const derived = crypto.scryptSync(password, salt, 32, SCRYPT_OPTIONS)
  return `scrypt$${SCRYPT_OPTIONS.N}$${SCRYPT_OPTIONS.r}$${SCRYPT_OPTIONS.p}$${salt.toString('base64url')}$${derived.toString('base64url')}`
}

function verifyPassword(password, stored) {
  const [algorithm, n, r, p, saltText, hashText] = String(stored || '').split('$')
  if (algorithm !== 'scrypt' || !n || !r || !p || !saltText || !hashText) return false
  try {
    const expected = Buffer.from(hashText, 'base64url')
    const actual = crypto.scryptSync(password, Buffer.from(saltText, 'base64url'), expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 64 * 1024 * 1024,
    })
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}

function validateRegistration(input) {
  const username = String(input.username || '').trim()
  const nickname = String(input.nickname || '').trim()
  const password = String(input.password || '')
  if (!USERNAME_RE.test(username)) {
    return { error: '用户名需为 3—24 位英文字母、数字或下划线', field: 'username' }
  }
  if (nickname.length > 30) return { error: '昵称不能超过 30 个字符', field: 'nickname' }
  if (password.length < 8 || password.length > 72) {
    return { error: '密码需为 8—72 个字符', field: 'password' }
  }
  return null
}

/** 给分享者看的被邀请人用户名只露首尾，避免把别人的账号名完整展示出去 */
const maskUsername = (name) => (name.length <= 2 ? `${name[0]}*` : `${name[0]}***${name.slice(-1)}`)

function publicUser(row) {
  return {
    id: row.id,
    username: row.username,
    nickname: row.nickname,
    referralCode: row.referral_code,
    points: row.points_balance,
    status: row.status,
    createdAt: row.created_at,
  }
}

function createAccountStore(filename) {
  fs.mkdirSync(path.dirname(filename), { recursive: true })
  const db = new DatabaseSync(filename)
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;')
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL COLLATE NOCASE UNIQUE,
      nickname TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      referral_code TEXT NOT NULL UNIQUE,
      points_balance INTEGER NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
      created_at TEXT NOT NULL,
      last_login_at TEXT
    );
    CREATE TABLE IF NOT EXISTS user_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_used_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_expiry ON user_sessions(expires_at);
    CREATE TABLE IF NOT EXISTS point_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      sharing_enabled INTEGER NOT NULL DEFAULT 1 CHECK (sharing_enabled IN (0, 1)),
      points_per_qualified_visit INTEGER NOT NULL DEFAULT 5 CHECK (points_per_qualified_visit >= 0),
      daily_reward_limit INTEGER NOT NULL DEFAULT 10 CHECK (daily_reward_limit >= 0),
      qualification_seconds INTEGER NOT NULL DEFAULT 15 CHECK (qualification_seconds >= 0),
      visitor_dedupe_days INTEGER NOT NULL DEFAULT 30 CHECK (visitor_dedupe_days >= 1),
      registration_bonus INTEGER NOT NULL DEFAULT 0 CHECK (registration_bonus >= 0),
      updated_at TEXT NOT NULL
    );
    -- 旧版「访问满 N 秒计分」的记录表，2026-09-21 改为邀请注册计分后停用，保留以免丢历史数据
    CREATE TABLE IF NOT EXISTS share_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sharer_user_id INTEGER NOT NULL REFERENCES users(id),
      visit_token_hash TEXT NOT NULL UNIQUE,
      project_slug TEXT NOT NULL,
      visitor_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'rewarded', 'rejected')),
      created_at TEXT NOT NULL,
      qualified_at TEXT,
      reward_points INTEGER NOT NULL DEFAULT 0,
      reject_reason TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_share_visits_sharer_created ON share_visits(sharer_user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_share_visits_visitor ON share_visits(sharer_user_id, visitor_hash, qualified_at);
    CREATE TABLE IF NOT EXISTS point_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      amount INTEGER NOT NULL,
      balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
      type TEXT NOT NULL,
      reference_id TEXT,
      reason TEXT NOT NULL,
      operator TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_point_transactions_user ON point_transactions(user_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS user_marks (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL CHECK (kind IN ('network', 'device')),
      mark_hash TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      PRIMARY KEY (user_id, kind, mark_hash)
    );
    CREATE INDEX IF NOT EXISTS idx_user_marks_mark ON user_marks(kind, mark_hash);
    -- 邀请注册：好友通过分享者的专属链接注册新账号，每个新账号只记一次
    CREATE TABLE IF NOT EXISTS referrals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sharer_user_id INTEGER NOT NULL REFERENCES users(id),
      invitee_user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
      project_slug TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL CHECK (status IN ('rewarded', 'rejected')),
      reject_reason TEXT,
      reward_points INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_referrals_sharer ON referrals(sharer_user_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      target_user_id INTEGER REFERENCES users(id),
      before_value TEXT,
      after_value TEXT,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `)

  // 2026-09-21 起不再按网络判断本人（开代理的用户全部被误判），清掉已记下的网络标记
  db.exec("DELETE FROM user_marks WHERE kind = 'network'")

  db.prepare(`
    INSERT INTO point_settings (id, updated_at) VALUES (1, ?)
    ON CONFLICT(id) DO NOTHING
  `).run(nowIso())

  const findUserByName = db.prepare('SELECT * FROM users WHERE username = ?')
  const findUserById = db.prepare('SELECT * FROM users WHERE id = ?')
  const insertUser = db.prepare(`
    INSERT INTO users (username, nickname, password_hash, referral_code, points_balance, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  const insertSession = db.prepare(`
    INSERT INTO user_sessions (user_id, token_hash, expires_at, created_at, last_used_at)
    VALUES (?, ?, ?, ?, ?)
  `)
  const findSession = db.prepare(`
    SELECT u.*, s.id AS session_id
    FROM user_sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?
  `)

  const settingsRow = () => db.prepare('SELECT * FROM point_settings WHERE id = 1').get()
  const publicSettings = (row = settingsRow()) => ({
    sharingEnabled: Boolean(row.sharing_enabled),
    pointsPerQualifiedVisit: row.points_per_qualified_visit,
    dailyRewardLimit: row.daily_reward_limit,
    qualificationSeconds: row.qualification_seconds,
    visitorDedupeDays: row.visitor_dedupe_days,
    registrationBonus: row.registration_bonus,
    updatedAt: row.updated_at,
  })

  function addTransaction(userId, amount, type, referenceId, reason, operator) {
    const user = findUserById.get(userId)
    if (!user) throw new Error('用户不存在')
    const balance = user.points_balance + amount
    if (balance < 0) return { invalid: { error: '扣减后的积分不能小于 0', field: 'amount' } }
    db.prepare('UPDATE users SET points_balance = ? WHERE id = ?').run(balance, userId)
    const info = db.prepare(`
      INSERT INTO point_transactions (user_id, amount, balance_after, type, reference_id, reason, operator, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, amount, balance, type, referenceId || null, reason, operator, nowIso())
    return { id: Number(info.lastInsertRowid), balance }
  }

  const upsertMark = db.prepare(`
    INSERT INTO user_marks (user_id, kind, mark_hash, last_seen_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, kind, mark_hash) DO UPDATE SET last_seen_at = excluded.last_seen_at
  `)
  /** 记下账号登录过的浏览器设备号（服务端 HMAC 后的值），marks 缺省时不记 */
  function noteMarks(userId, marks) {
    if (marks?.device) upsertMark.run(userId, 'device', marks.device, nowIso())
  }
  /** 这台浏览器是否登录过分享者的账号 */
  function isSharerDevice(sharerId, device) {
    return Boolean(device && db.prepare(`
      SELECT 1 FROM user_marks WHERE user_id = ? AND kind = 'device' AND mark_hash = ?
    `).get(sharerId, device))
  }
  const rewardedToday = (sharerId) => db.prepare(`
    SELECT COUNT(*) AS total FROM referrals WHERE sharer_user_id = ? AND status = 'rewarded' AND created_at >= ?
  `).get(sharerId, chinaDayStartIso()).total

  /**
   * 新账号通过专属链接注册时给分享者记奖励，在注册事务内调用。
   * 不奖励的情况：活动关闭、分享者已停用、在分享者登录过的浏览器上注册、分享者今日已满。
   */
  function applyReferral(invitee, referralCode, projectSlug, marks) {
    const code = String(referralCode || '').trim().toUpperCase()
    if (!/^[A-Z0-9]{6,8}$/.test(code)) return null
    const sharer = db.prepare('SELECT * FROM users WHERE referral_code = ?').get(code)
    if (!sharer || sharer.id === invitee.id) return null
    const settings = publicSettings()
    let reason = ''
    if (!settings.sharingEnabled) reason = 'disabled'
    else if (sharer.status !== 'active') reason = 'blocked'
    else if (isSharerDevice(sharer.id, marks?.device)) reason = 'self'
    else if (rewardedToday(sharer.id) >= settings.dailyRewardLimit) reason = 'daily_limit'
    const slug = /^[a-z0-9-]{1,60}$/.test(String(projectSlug || '')) ? String(projectSlug) : ''
    const points = reason ? 0 : settings.pointsPerQualifiedVisit
    const info = db.prepare(`
      INSERT INTO referrals (sharer_user_id, invitee_user_id, project_slug, status, reject_reason, reward_points, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(sharer.id, invitee.id, slug, reason ? 'rejected' : 'rewarded', reason || null, points, nowIso())
    if (!reason && points > 0) {
      addTransaction(sharer.id, points, 'invite_reward', String(info.lastInsertRowid), `邀请 ${maskUsername(invitee.username)} 注册`, 'system')
    }
    return { rewarded: !reason, reason: reason || undefined, points, inviter: sharer.nickname || sharer.username }
  }

  function newReferralCode() {
    for (let i = 0; i < 20; i += 1) {
      const code = crypto.randomBytes(6).toString('base64url').replace(/[-_]/g, '').slice(0, 8).toUpperCase()
      if (code.length >= 6 && !db.prepare('SELECT 1 FROM users WHERE referral_code = ?').get(code)) return code
    }
    throw new Error('无法生成唯一分享码')
  }

  function issueSession(userId) {
    const token = `usr_${crypto.randomBytes(32).toString('base64url')}`
    const createdAt = nowIso()
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
    insertSession.run(userId, tokenHash(token), expiresAt, createdAt, createdAt)
    return { token, expiresAt }
  }

  function transaction(operation) {
    db.exec('BEGIN IMMEDIATE')
    try {
      const result = operation()
      db.exec('COMMIT')
      return result
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  }

  const registerTransaction = (input, marks, invite) =>
    transaction(() => {
      const settings = db.prepare('SELECT registration_bonus FROM point_settings WHERE id = 1').get()
      const info = insertUser.run(
        input.username,
        input.nickname,
        hashPassword(input.password),
        newReferralCode(),
        0,
        nowIso(),
      )
      if (settings.registration_bonus > 0) {
        addTransaction(Number(info.lastInsertRowid), settings.registration_bonus, 'register_bonus', null, '新用户注册奖励', 'system')
      }
      const invitee = findUserById.get(info.lastInsertRowid)
      // 先判断邀请再记下新账号的设备，避免新账号自己的标记影响判断
      const referral = invite ? applyReferral(invitee, invite.referralCode, invite.projectSlug, marks) : null
      noteMarks(invitee.id, marks)
      const user = findUserById.get(invitee.id)
      return { user: publicUser(user), ...issueSession(user.id), ...(referral ? { referral } : {}) }
    })

  return {
    register(input, marks) {
      const invalid = validateRegistration(input)
      if (invalid) return { invalid }
      const normalized = {
        username: String(input.username).trim(),
        nickname: String(input.nickname || '').trim(),
        password: String(input.password),
      }
      try {
        return registerTransaction(normalized, marks, { referralCode: input.referralCode, projectSlug: input.projectSlug })
      } catch (error) {
        if (String(error.message).includes('UNIQUE constraint failed: users.username')) {
          return { invalid: { error: '这个用户名已经被注册', field: 'username' } }
        }
        throw error
      }
    },

    login(username, password, marks) {
      const user = findUserByName.get(String(username || '').trim())
      if (!user || !verifyPassword(String(password || ''), user.password_hash)) return null
      if (user.status !== 'active') return { blocked: true }
      const loggedAt = nowIso()
      db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(loggedAt, user.id)
      noteMarks(user.id, marks)
      return { user: publicUser(user), ...issueSession(user.id) }
    },

    authenticate(token, marks) {
      if (!String(token || '').startsWith('usr_')) return null
      const current = nowIso()
      const user = findSession.get(tokenHash(token), current)
      if (!user || user.status !== 'active') return null
      db.prepare('UPDATE user_sessions SET last_used_at = ? WHERE id = ?').run(current, user.session_id)
      noteMarks(user.id, marks)
      return { ...publicUser(user), sessionId: user.session_id }
    },

    logout(token) {
      if (!token) return
      db.prepare('DELETE FROM user_sessions WHERE token_hash = ?').run(tokenHash(token))
    },

    changePassword(userId, currentPassword, nextPassword) {
      const user = findUserById.get(userId)
      if (!user || !verifyPassword(String(currentPassword || ''), user.password_hash)) {
        return { invalid: { error: '当前密码不正确', field: 'currentPassword' } }
      }
      if (String(nextPassword || '').length < 8 || String(nextPassword || '').length > 72) {
        return { invalid: { error: '新密码需为 8—72 个字符', field: 'nextPassword' } }
      }
      transaction(() => {
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(String(nextPassword)), userId)
        db.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(userId)
      })
      return { ok: true }
    },

    createShare(userId, projectSlug) {
      const user = findUserById.get(userId)
      const settings = publicSettings()
      if (!settings.sharingEnabled) return { invalid: { error: '分享积分活动当前未开启' } }
      const slug = String(projectSlug || '').trim()
      if (!/^[a-z0-9-]{1,60}$/.test(slug)) return { invalid: { error: '项目地址无效', field: 'projectSlug' } }
      return {
        referralCode: user.referral_code,
        projectSlug: slug,
        pointsPerInvite: settings.pointsPerQualifiedVisit,
        remainingToday: Math.max(0, settings.dailyRewardLimit - rewardedToday(userId)),
      }
    },

    /** 被邀请人打开链接时显示「xx 邀请你注册」，只返回昵称和奖励数 */
    inviter(referralCode) {
      const code = String(referralCode || '').trim().toUpperCase()
      if (!/^[A-Z0-9]{6,8}$/.test(code)) return null
      const sharer = db.prepare("SELECT username, nickname FROM users WHERE referral_code = ? AND status = 'active'").get(code)
      if (!sharer) return null
      const settings = publicSettings()
      return { nickname: sharer.nickname || sharer.username, sharingEnabled: settings.sharingEnabled, pointsPerInvite: settings.pointsPerQualifiedVisit }
    },

    accountSummary(userId) {
      const user = findUserById.get(userId)
      const settings = publicSettings()
      const total = db.prepare("SELECT COUNT(*) AS total FROM referrals WHERE sharer_user_id = ? AND status = 'rewarded'").get(userId).total
      return { points: user.points_balance, totalInvites: total, rewardedToday: rewardedToday(userId), dailyRewardLimit: settings.dailyRewardLimit, settings }
    },

    pointTransactions(userId, limit = 50) {
      return db.prepare(`SELECT id, amount, balance_after AS balanceAfter, type, reference_id AS referenceId, reason, created_at AS createdAt FROM point_transactions WHERE user_id = ? ORDER BY id DESC LIMIT ?`).all(userId, Math.min(Math.max(limit, 1), 100))
    },

    /** 分享者的邀请记录 */
    referrals(userId, limit = 50) {
      const rows = db.prepare(`
        SELECT r.id, r.project_slug AS projectSlug, r.status, r.reject_reason AS rejectReason, r.reward_points AS rewardPoints,
          r.created_at AS createdAt, u.username
        FROM referrals r JOIN users u ON u.id = r.invitee_user_id
        WHERE r.sharer_user_id = ? ORDER BY r.id DESC LIMIT ?
      `).all(userId, Math.min(Math.max(limit, 1), 100))
      return rows.map(({ username, ...row }) => ({ ...row, invitee: maskUsername(username) }))
    },

    adminSettings() {
      return publicSettings()
    },

    updateSettings(input) {
      const before = publicSettings()
      const values = {
        sharingEnabled: Boolean(input.sharingEnabled),
        pointsPerQualifiedVisit: Number(input.pointsPerQualifiedVisit),
        dailyRewardLimit: Number(input.dailyRewardLimit),
        qualificationSeconds: Number(input.qualificationSeconds),
        visitorDedupeDays: Number(input.visitorDedupeDays),
        registrationBonus: Number(input.registrationBonus),
      }
      if (![values.pointsPerQualifiedVisit, values.dailyRewardLimit, values.qualificationSeconds, values.registrationBonus].every((n) => Number.isInteger(n) && n >= 0) || !Number.isInteger(values.visitorDedupeDays) || values.visitorDedupeDays < 1) {
        return { invalid: { error: '积分规则必须填写有效的非负整数，去重天数至少为 1' } }
      }
      const updatedAt = nowIso()
      db.prepare(`UPDATE point_settings SET sharing_enabled = ?, points_per_qualified_visit = ?, daily_reward_limit = ?, qualification_seconds = ?, visitor_dedupe_days = ?, registration_bonus = ?, updated_at = ? WHERE id = 1`).run(values.sharingEnabled ? 1 : 0, values.pointsPerQualifiedVisit, values.dailyRewardLimit, values.qualificationSeconds, values.visitorDedupeDays, values.registrationBonus, updatedAt)
      const after = publicSettings()
      db.prepare(`INSERT INTO admin_audit_logs (action, before_value, after_value, reason, created_at) VALUES ('settings.update', ?, ?, '更新积分规则', ?)`).run(JSON.stringify(before), JSON.stringify(after), updatedAt)
      return after
    },

    adminUsers(search = '') {
      const query = `%${String(search).trim()}%`
      return db.prepare(`SELECT id, username, nickname, referral_code AS referralCode, points_balance AS points, status, created_at AS createdAt, last_login_at AS lastLoginAt FROM users WHERE username LIKE ? OR nickname LIKE ? ORDER BY id DESC LIMIT 200`).all(query, query)
    },

    adminUser(userId) {
      const user = findUserById.get(userId)
      if (!user) return null
      return {
        user: publicUser(user),
        transactions: this.pointTransactions(userId, 100),
        referrals: this.referrals(userId, 100),
      }
    },

    adjustPoints(userId, amount, reason) {
      const value = Number(amount)
      const note = String(reason || '').trim()
      if (!Number.isInteger(value) || value === 0) return { invalid: { error: '积分调整必须是非零整数', field: 'amount' } }
      if (!note) return { invalid: { error: '请填写调整原因', field: 'reason' } }
      return transaction(() => {
        const result = addTransaction(userId, value, value > 0 ? 'admin_add' : 'admin_deduct', null, note, 'admin')
        if (result.invalid) return result
        db.prepare(`INSERT INTO admin_audit_logs (action, target_user_id, before_value, after_value, reason, created_at) VALUES ('points.adjust', ?, ?, ?, ?, ?)`).run(userId, String(result.balance - value), String(result.balance), note, nowIso())
        return result
      })
    },

    setUserStatus(userId, status, reason) {
      if (!['active', 'blocked'].includes(status)) return { invalid: { error: '用户状态无效' } }
      const note = String(reason || '').trim() || (status === 'blocked' ? '管理员停用账号' : '管理员恢复账号')
      const user = findUserById.get(userId)
      if (!user) return { invalid: { error: '用户不存在' } }
      db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, userId)
      if (status === 'blocked') db.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(userId)
      db.prepare(`INSERT INTO admin_audit_logs (action, target_user_id, before_value, after_value, reason, created_at) VALUES ('user.status', ?, ?, ?, ?, ?)`).run(userId, user.status, status, note, nowIso())
      return { ok: true, status }
    },

    adminTransactions() {
      return db.prepare(`SELECT t.id, t.user_id AS userId, u.username, t.amount, t.balance_after AS balanceAfter, t.type, t.reference_id AS referenceId, t.reason, t.operator, t.created_at AS createdAt FROM point_transactions t JOIN users u ON u.id = t.user_id ORDER BY t.id DESC LIMIT 300`).all()
    },

    revokeTransaction(transactionId, reason) {
      const note = String(reason || '').trim()
      if (!note) return { invalid: { error: '请填写撤销原因', field: 'reason' } }
      return transaction(() => {
        const original = db.prepare("SELECT * FROM point_transactions WHERE id = ? AND type IN ('share_reward', 'invite_reward')").get(transactionId)
        if (!original) return { invalid: { error: '只能撤销存在的分享或邀请奖励' } }
        const already = db.prepare("SELECT 1 FROM point_transactions WHERE type = 'reward_revoke' AND reference_id = ?").get(String(transactionId))
        if (already) return { invalid: { error: '这笔奖励已经撤销' } }
        const result = addTransaction(original.user_id, -original.amount, 'reward_revoke', String(transactionId), note, 'admin')
        if (result.invalid) return result
        db.prepare(`INSERT INTO admin_audit_logs (action, target_user_id, before_value, after_value, reason, created_at) VALUES ('reward.revoke', ?, ?, ?, ?, ?)`).run(original.user_id, String(result.balance + original.amount), String(result.balance), note, nowIso())
        return result
      })
    },

    auditLogs() {
      return db.prepare(`SELECT id, action, target_user_id AS targetUserId, before_value AS beforeValue, after_value AS afterValue, reason, created_at AS createdAt FROM admin_audit_logs ORDER BY id DESC LIMIT 300`).all()
    },

    cleanup() {
      db.prepare('DELETE FROM user_sessions WHERE expires_at <= ?').run(nowIso())
    },

    close() {
      db.close()
    },
  }
}

module.exports = { createAccountStore, hashPassword, verifyPassword, validateRegistration }
