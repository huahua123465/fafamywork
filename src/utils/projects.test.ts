import { describe, expect, it } from 'vitest'
import { projects } from '../content/projects'
import { projectDetails } from '../content/project-details'
import assets from '../content/project-assets.json'
import copy from '../content/project-copy.json'
import { filterProjects, safeUrl } from './projects'
describe('项目浏览规则', () => {
  it('可以按技术标签搜索，并与题材筛选组合', () => {
    const fixture = { ...projects[0]!, tags: ['UniqueFramework'], keywords: [] }
    expect(filterProjects([fixture], { query: 'uniqueframework', category: fixture.category })).toHaveLength(1)
    expect(filterProjects([fixture], { query: 'uniqueframework', category: '不存在的题材' })).toHaveLength(0)
  })
  it('组合分类和关键词，不跨分类返回结果', () => {
    expect(filterProjects(projects, { query: '花店', category: '电商购物' }).map((p) => p.slug)).toEqual([
      'flower-shop',
      'flower-assistant',
      'document-flower',
      'flower-original',
      'flower-unmodified',
    ])
    expect(filterProjects(projects, { query: '花店', category: '校园学习' })).toHaveLength(0)
  })
  it('忽略英文大小写和首尾空格，匹配关键词', () => {
    expect(filterProjects(projects, { query: '  wims  ' })[0]?.slug).toBe('wims')
    expect(filterProjects(projects, { query: '博学' })[0]?.slug).toBe('boxuegu')
  })
  it('空搜索展示全部数据且不修改输入顺序', () => {
    const reversed = [...projects].reverse(),
      original = reversed.map((p) => p.slug)
    expect(filterProjects(reversed, { query: '   ' })).toHaveLength(projects.length)
    expect(reversed.map((p) => p.slug)).toEqual(original)
  })
  it('默认精选优先，配置顺序稳定', () => {
    expect(filterProjects([...projects].reverse(), {}).map((p) => p.order)).toEqual(
      Array.from({ length: projects.length }, (_, i) => i + 1),
    )
  })
  it('最近更新把无日期项目放最后，日期相同用配置顺序', () => {
    const fixtures = projects
      .slice(0, 3)
      .map((p, i) => ({ ...p, updatedAt: [undefined, '2025-01-01', '2025-02-01'][i] }))
    expect(filterProjects(fixtures, { sort: 'updated' }).map((p) => p.id)).toEqual([
      'travel',
      'campus-swap',
      'flower-shop',
    ])
  })
  it('无匹配和空内容均返回空列表', () => {
    expect(filterProjects(projects, { query: '不存在的项目xyz' })).toEqual([])
    expect(filterProjects([], { query: '课表' })).toEqual([])
  })
  it('技术标签要全部满足，交付要求可叠加', () => {
    const java = filterProjects(projects, { tags: ['Java'] })
    const javaRoom = filterProjects(projects, { tags: ['Java', 'Room'] })
    expect(java.length).toBeGreaterThan(javaRoom.length)
    expect(javaRoom.every((p) => p.tags.includes('Java') && p.tags.includes('Room'))).toBe(true)
    expect(filterProjects(projects, { needs: ['admin'] }).every((p) => p.hasAdmin)).toBe(true)
    expect(filterProjects(projects, { needs: ['backend'] }).every((p) => p.hasBackend)).toBe(true)
    const both = filterProjects(projects, { needs: ['admin', 'backend'] })
    expect(both.every((p) => p.hasAdmin && p.hasBackend)).toBe(true)
  })
  it('按界面数量排序，数量相同保持配置顺序', () => {
    const sorted = filterProjects(projects, { sort: 'screens' })
    expect(sorted).toHaveLength(projects.length)
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!, now = sorted[i]!
      expect(prev.imageCount > now.imageCount || (prev.imageCount === now.imageCount && prev.order < now.order)).toBe(true)
    }
  })
  it('平台筛选只返回该平台项目', () => {
    expect(filterProjects(projects, { platform: 'Android 应用' })).toHaveLength(projects.length)
    expect(filterProjects(projects, { platform: '鸿蒙' })).toHaveLength(0)
  })
  it('项目与已导入素材一一对应，总览和独立截图完整', () => {
    expect(new Set(projects.map((p) => p.slug)).size).toBe(projects.length)
    expect(projects.every((p) => !p.demoUrl && p.cover?.fullSrc)).toBe(true)
    expect(projects.map((p) => p.slug).sort()).toEqual(Object.keys(assets).sort())
    expect(projectDetails.every((p) => p.images.length > 0 && p.imageCount === p.images.length)).toBe(true)
  })
  it('列表数据与详情数据一致，列表不携带详情专用字段', () => {
    expect(projects.map((p) => p.slug)).toEqual(projectDetails.map((p) => p.slug))
    for (const summary of projects) {
      expect(summary).not.toHaveProperty('images')
      expect(summary).not.toHaveProperty('features')
      expect(summary.highlight?.src, summary.slug).toBeTruthy()
      expect(summary.platform).toBeTruthy()
    }
  })
})
describe('人工文案覆盖', () => {
  const overrides = copy.projects as Record<string, { imageCaptions?: string[]; features?: unknown[] }>
  it('只覆盖存在的项目，截图名称条数与截图一致', () => {
    const slugs = new Set(projects.map((p) => p.slug))
    for (const [slug, entry] of Object.entries(overrides)) {
      expect(slugs.has(slug), slug).toBe(true)
      if (entry.imageCaptions) expect(entry.imageCaptions).toHaveLength(assets[slug as keyof typeof assets].images.length)
    }
  })
  it('页面上不再出现同步脚本的模板句和英文截图名', () => {
    for (const project of projectDetails) {
      for (const feature of project.features) expect(feature.text, project.slug).not.toMatch(/^已有对应的/)
      expect(project.tagline, project.slug).not.toBe(project.summary)
      for (const image of project.images) expect(image.caption, project.slug).not.toMatch(/^[A-Za-z0-9 ]+$/)
      expect(project.previewNotice).not.toContain('尚未编译、安装或运行验证')
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
