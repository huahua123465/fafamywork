import { describe, expect, it } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import { createAppRouter } from '../router'
import { projects } from '../content/projects'
import { pageMeta, renderHead } from './seo'

const router = createAppRouter(createMemoryHistory())
const metaOf = (url: string) => pageMeta(router.resolve(url), '我的作品', projects)
const template = `<head>
    <meta name="description" content="默认" />
    <meta name="robots" content="index, follow" />
    <meta property="og:title" content="默认" />
    <meta property="og:url" content="%VITE_SITE_URL%/" />
    <link rel="canonical" href="%VITE_SITE_URL%/" />
    <title>默认</title>
  </head>`

describe('页面 head 信息', () => {
  it('项目详情页有独立标题、规范地址和封面分享图', () => {
    const meta = metaOf('/projects/flower-shop?view=preview')
    expect(meta.title).toBe('花开半夏 · 我的作品')
    expect(meta.path).toBe('/projects/flower-shop')
    expect(meta.image).toBe(projects.find((p) => p.slug === 'flower-shop')?.cover?.src)
    expect(meta.noindex).toBe(false)
  })
  it('不存在的项目和地址标记为不收录', () => {
    expect(metaOf('/projects/not-exist')).toMatchObject({ title: '页面未找到 · 我的作品', noindex: true })
    expect(metaOf('/some/where')).toMatchObject({ noindex: true })
  })
  it('管理与统计页不收录，普通页面去掉末尾斜杠', () => {
    expect(metaOf('/admin').noindex).toBe(true)
    expect(metaOf('/insights').noindex).toBe(true)
    expect(metaOf('/projects/').path).toBe('/projects')
    expect(metaOf('/').path).toBe('/')
  })
  it('renderHead 替换已有标签、补上缺失标签并转义内容', () => {
    const meta = { ...metaOf('/about'), title: '关于 "我" <&> $1' }
    const html = renderHead(template, meta, 'https://example.com/')
    expect(html).toContain('<title>关于 &quot;我&quot; &lt;&amp;&gt; $1</title>')
    expect(html).toContain('<link rel="canonical" href="https://example.com/about" />')
    expect(html).toContain('<meta property="og:url" content="https://example.com/about" />')
    expect(html).toContain('<meta property="og:image" content="https://example.com/og-cover.png" />')
    expect(html.match(/og:title/g)).toHaveLength(1)
  })
})
