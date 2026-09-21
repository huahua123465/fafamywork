import { createRequire } from 'node:module'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { createAccountStore } = require('./account-store.js')
const temporaryDirectories = []

afterEach(() => {
  while (temporaryDirectories.length) rmSync(temporaryDirectories.pop(), { recursive: true, force: true })
})

describe('账号数据库', () => {
  it('关闭并重新打开数据库后仍保留用户，旧会话也继续有效', () => {
    const directory = mkdtempSync(join(tmpdir(), 'fafa-account-store-'))
    temporaryDirectories.push(directory)
    const filename = join(directory, 'app.db')

    let store = createAccountStore(filename)
    const registered = store.register({ username: 'persistent_user', nickname: '持久用户', password: 'safe-pass-123' })
    expect(registered.user.points).toBe(0)
    store.close()

    store = createAccountStore(filename)
    expect(store.authenticate(registered.token)).toMatchObject({ username: 'persistent_user', nickname: '持久用户' })
    expect(store.login('persistent_user', 'safe-pass-123').user.username).toBe('persistent_user')
    store.close()
  })

  it('旧版数据库（share_visits 没有网络和设备列）打开时自动补列，旧记录保留', () => {
    const directory = mkdtempSync(join(tmpdir(), 'fafa-account-store-'))
    temporaryDirectories.push(directory)
    const filename = join(directory, 'app.db')
    const { DatabaseSync } = require('node:sqlite')
    const old = new DatabaseSync(filename)
    old.exec(`
      CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL COLLATE NOCASE UNIQUE, nickname TEXT NOT NULL DEFAULT '',
        password_hash TEXT NOT NULL, referral_code TEXT NOT NULL UNIQUE, points_balance INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL, last_login_at TEXT);
      CREATE TABLE share_visits (id INTEGER PRIMARY KEY AUTOINCREMENT, sharer_user_id INTEGER NOT NULL REFERENCES users(id), visit_token_hash TEXT NOT NULL UNIQUE,
        project_slug TEXT NOT NULL, visitor_hash TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL, qualified_at TEXT,
        reward_points INTEGER NOT NULL DEFAULT 0, reject_reason TEXT);
      INSERT INTO users (username, password_hash, referral_code, created_at) VALUES ('old_user', 'x', 'OLDCODE1', '2026-09-20T00:00:00.000Z');
      INSERT INTO share_visits (sharer_user_id, visit_token_hash, project_slug, visitor_hash, created_at) VALUES (1, 'h', 'smart-todo', 'v', '2026-09-20T00:00:00.000Z');
    `)
    old.close()

    const store = createAccountStore(filename)
    store.close()
    const db = new DatabaseSync(filename)
    const columns = db.prepare('PRAGMA table_info(share_visits)').all().map((c) => c.name)
    expect(columns).toEqual(expect.arrayContaining(['network_hash', 'device_hash']))
    expect(db.prepare('SELECT project_slug, network_hash FROM share_visits').get()).toMatchObject({ project_slug: 'smart-todo', network_hash: '' })
    db.close()
  })
})
