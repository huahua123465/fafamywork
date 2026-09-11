import { describe, expect, it } from 'vitest'
import { projects } from '../content/projects'
import assets from '../content/project-assets.json'
import { filterProjects, safeUrl } from './projects'
describe('项目浏览规则', () => {
  it('可以按技术标签搜索，并与题材筛选组合', () => {
    const fixture = { ...projects[0]!, tags: ['UniqueFramework'], keywords: [] }
    expect(filterProjects([fixture], 'uniqueframework', fixture.category)).toHaveLength(1)
    expect(filterProjects([fixture], 'uniqueframework', '不存在的题材')).toHaveLength(0)
  })
  it('组合分类和关键词，不跨分类返回结果', () => {
    expect(filterProjects(projects, '花店', '电商购物').map((p) => p.slug)).toEqual([
      'flower-shop',
      'flower-assistant',
      'document-flower',
      'flower-original',
      'flower-unmodified',
    ])
    expect(filterProjects(projects, '花店', '校园学习')).toHaveLength(0)
  })
  it('忽略英文大小写和首尾空格，匹配关键词', () => {
    expect(filterProjects(projects, '  wims  ')[0]?.slug).toBe('wims')
    expect(filterProjects(projects, '博学')[0]?.slug).toBe('boxuegu')
  })
  it('空搜索展示全部数据且不修改输入顺序', () => {
    const reversed = [...projects].reverse(),
      original = reversed.map((p) => p.slug)
    expect(filterProjects(reversed, '   ')).toHaveLength(projects.length)
    expect(reversed.map((p) => p.slug)).toEqual(original)
  })
  it('默认精选优先，配置顺序稳定', () => {
    expect(filterProjects([...projects].reverse()).map((p) => p.order)).toEqual(
      Array.from({ length: projects.length }, (_, i) => i + 1),
    )
  })
  it('最近更新把无日期项目放最后，日期相同用配置顺序', () => {
    const fixtures = projects
      .slice(0, 3)
      .map((p, i) => ({ ...p, updatedAt: [undefined, '2025-01-01', '2025-02-01'][i] }))
    expect(filterProjects(fixtures, '', '全部', 'updated').map((p) => p.id)).toEqual([
      'travel',
      'campus-swap',
      'flower-shop',
    ])
  })
  it('无匹配和空内容均返回空列表', () => {
    expect(filterProjects(projects, '不存在的项目xyz')).toEqual([])
    expect(filterProjects([], '课表')).toEqual([])
  })
  it('项目与已导入素材一一对应，总览和独立截图完整', () => {
    expect(new Set(projects.map((p) => p.slug)).size).toBe(projects.length)
    expect(projects.every((p) => !p.sample && !p.demoUrl && p.cover?.fullSrc)).toBe(true)
    expect(projects.map((p) => p.slug).sort()).toEqual(Object.keys(assets).sort())
    expect(projects.every((p) => (p.images?.length || 0) > 0)).toBe(true)
  })
  it('每个项目都有完整的价值说明', () => {
    for (const project of projects) {
      expect(project.caseStudy).toBeTruthy()
      expect(Object.values(project.caseStudy || {}).every((text) => text.length > 8)).toBe(true)
    }
  })
})
describe('外部链接校验', () => {
  it('允许 HTTP(S) URL', () => {
    expect(safeUrl('https://example.com/project')).toBe('https://example.com/project')
    expect(safeUrl('http://localhost:8080')).toBe('http://localhost:8080/')
  })
  it('拒绝脚本、数据协议和无效地址', () => {
    for (const url of [
      'javascript:alert(1)',
      'data:text/html,hello',
      'file:///test',
      '//example.com',
      '不是地址',
      '',
    ])
      expect(safeUrl(url)).toBe('')
  })
})
