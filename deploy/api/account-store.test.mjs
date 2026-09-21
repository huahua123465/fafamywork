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
})
