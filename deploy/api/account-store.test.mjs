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

  it('旧版数据库打开时自动建邀请表、清掉网络标记，旧用户保留', () => {
    const directory = mkdtempSync(join(tmpdir(), 'fafa-account-store-'))
    temporaryDirectories.push(directory)
    const filename = join(directory, 'app.db')
    const { DatabaseSync } = require('node:sqlite')
    const old = new DatabaseSync(filename)
    old.exec(`
      CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL COLLATE NOCASE UNIQUE, nickname TEXT NOT NULL DEFAULT '',
        password_hash TEXT NOT NULL, referral_code TEXT NOT NULL UNIQUE, points_balance INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL, last_login_at TEXT);
      CREATE TABLE user_marks (user_id INTEGER NOT NULL, kind TEXT NOT NULL, mark_hash TEXT NOT NULL, last_seen_at TEXT NOT NULL, PRIMARY KEY (user_id, kind, mark_hash));
      INSERT INTO users (username, password_hash, referral_code, created_at) VALUES ('old_user', 'x', 'OLDCODE1', '2026-09-20T00:00:00.000Z');
      INSERT INTO user_marks VALUES (1, 'network', 'n', '2026-09-20T00:00:00.000Z'), (1, 'device', 'd', '2026-09-20T00:00:00.000Z');
    `)
    old.close()

    const store = createAccountStore(filename)
    expect(store.inviter('OLDCODE1')).toMatchObject({ nickname: 'old_user' })
    store.close()
    const db = new DatabaseSync(filename)
    expect(db.prepare("SELECT name FROM sqlite_master WHERE name = 'referrals'").get()).toBeTruthy()
    expect(db.prepare('SELECT kind FROM user_marks').all().map((r) => r.kind)).toEqual(['device'])
    db.close()
  })
})
