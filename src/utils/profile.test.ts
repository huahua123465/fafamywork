import { describe, expect, it, beforeEach } from 'vitest'
import { applyProfile, dialable, tokenExpired } from './profile'
import { author } from '../content/author'
import { site } from '../content/site'

const defaults = {
  name: author.name,
  role: author.role,
  siteName: site.name,
  footerText: site.footerText,
  stories: [...author.stories],
}

beforeEach(() => {
  author.name = defaults.name
  author.role = defaults.role
  author.email = ''
  author.github = ''
  author.stories = [...defaults.stories]
  author.timeline = []
  site.name = defaults.siteName
  site.footerText = defaults.footerText
  site.priceNote = ''
})

describe('applyProfile', () => {
  it('把填写的字段合并到 author 与 site', () => {
    applyProfile({ name: '张三', email: 'a@b.com', siteName: '张三的作品', footerText: '慢慢来。' })
    expect(author.name).toBe('张三')
    expect(author.email).toBe('a@b.com')
    expect(site.name).toBe('张三的作品')
    expect(site.footerText).toBe('慢慢来。')
  })

  it('留空的字段不覆盖默认文案', () => {
    applyProfile({ name: '', role: '   ', siteName: '' })
    expect(author.name).toBe(defaults.name)
    expect(author.role).toBe(defaults.role)
    expect(site.name).toBe(defaults.siteName)
  })

  it('空数组不清掉默认的「关于我」段落', () => {
    applyProfile({ stories: [] })
    expect(author.stories).toEqual(defaults.stories)
  })

  it('非空数组会替换段落与时间线', () => {
    applyProfile({ stories: ['新的一段'], timeline: [{ date: '2026.09', title: '上线', text: '说明' }] })
    expect(author.stories).toEqual(['新的一段'])
    expect(author.timeline).toHaveLength(1)
  })

  it('接口无响应（null/undefined）时保持默认值不报错', () => {
    expect(() => applyProfile(null)).not.toThrow()
    expect(() => applyProfile(undefined)).not.toThrow()
    expect(author.name).toBe(defaults.name)
  })

  it('忽略白名单以外的字段', () => {
    applyProfile({ isAdmin: true, name: '李四' } as never)
    expect(author.name).toBe('李四')
    expect((author as Record<string, unknown>).isAdmin).toBeUndefined()
  })
})

describe('管理登录与联系方式辅助函数', () => {
  it('按 token 里的时间戳判断是否过期', () => {
    expect(tokenExpired(`${Date.now() + 60_000}.sig`)).toBe(false)
    expect(tokenExpired(`${Date.now() - 1}.sig`)).toBe(true)
    expect(tokenExpired('')).toBe(true)
    expect(tokenExpired('abc.sig')).toBe(true)
  })
  it('只有电话号码才生成拨号链接，微信号等账号原样显示', () => {
    expect(dialable('13800138000')).toBe(true)
    expect(dialable('+86 138-0013-8000')).toBe(true)
    expect(dialable('Strive-after-H')).toBe(false)
    expect(dialable('')).toBe(false)
  })
  it('参考价格写入站点配置', () => {
    applyProfile({ priceNote: '源码 ¥199 起' })
    expect(site.priceNote).toBe('源码 ¥199 起')
  })
})
