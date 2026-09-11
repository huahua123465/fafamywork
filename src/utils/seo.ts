import type { ProjectSummary } from '../types'

// 页面 <head> 信息的唯一来源：浏览器端切换路由时调用 applyHead 更新标签，
// 构建时 scripts/prerender.mjs 调用 renderHead 把同样的内容写进每个静态 HTML。

export interface PageMeta {
  siteName: string
  title: string
  description: string
  /** 规范地址的路径部分，不含域名和查询参数 */
  path: string
  image: string
  imageWidth: number
  imageHeight: number
  imageAlt: string
  type: 'website' | 'article'
  noindex: boolean
}

export interface RouteLike {
  path: string
  params: Record<string, unknown>
  meta: Record<string, unknown>
  matched: { path: string }[]
}

/** 站点对外地址：优先用构建配置里的正式域名，开发环境退回当前页面地址。 */
export function siteOrigin() {
  return (import.meta.env.VITE_SITE_URL || (typeof location === 'undefined' ? '' : location.origin)).replace(/\/$/, '')
}

const DEFAULT_DESCRIPTION = '浏览项目作品，查看界面截图、功能说明与技术要求，咨询源码与交付。'
const DESCRIPTIONS: Record<string, string> = {
  '/about': '一个喜欢创造的人，一些认真做的作品。了解作品背后的思考与创作过程。',
  '/buying-guide': '购买项目前需要确认的内容：适用技术、界面与运行效果、交付清单、报价与售后、使用和验收方式。',
}
const OG_COVER = { image: '/og-cover.png', imageWidth: 1200, imageHeight: 630 }

export function pageMeta(route: RouteLike, siteName: string, projects: ProjectSummary[]): PageMeta {
  const notFound = route.matched.some((record) => record.path.includes(':pathMatch'))
  if ('slug' in route.params) {
    const project = projects.find((p) => p.slug === route.params.slug)
    if (project) {
      const cover = project.cover
      // 分享卡片用轻量封面（宽 850），高度按原图比例换算
      const width = 850
      const height = cover?.width && cover.height ? Math.round((width * cover.height) / cover.width) : 1173
      return {
        siteName,
        title: `${project.name} · ${siteName}`,
        description: `${project.summary}${project.tags.length ? `技术：${project.tags.join('、')}。` : ''}共 ${project.imageCount} 张界面截图，可咨询源码与交付。`,
        path: `/projects/${project.slug}`,
        ...(cover ? { image: cover.src, imageWidth: width, imageHeight: height } : OG_COVER),
        imageAlt: `${project.name} 页面总览`,
        type: 'article',
        noindex: false,
      }
    }
  }
  const missing = notFound || 'slug' in route.params
  const title = missing ? '页面未找到' : String(route.meta.title || '')
  return {
    siteName,
    title: title ? `${title} · ${siteName}` : siteName,
    description: DESCRIPTIONS[route.path] || DEFAULT_DESCRIPTION,
    path: missing ? route.path : route.path.replace(/(.)\/+$/, '$1'),
    ...OG_COVER,
    imageAlt: `${siteName} · 让好点子成为真实作品`,
    type: 'website',
    noindex: missing || Boolean(route.meta.noindex),
  }
}

const absolute = (siteUrl: string, path: string) => `${siteUrl.replace(/\/$/, '')}${path}`

/** 需要写入的 head 标签：[选择器所需的属性名, 属性值, content] */
function headEntries(meta: PageMeta, siteUrl: string): [string, string, string][] {
  const url = absolute(siteUrl, meta.path)
  const image = absolute(siteUrl, meta.image)
  return [
    ['name', 'description', meta.description],
    ['name', 'robots', meta.noindex ? 'noindex, nofollow' : 'index, follow'],
    ['property', 'og:type', meta.type],
    ['property', 'og:site_name', meta.siteName],
    ['property', 'og:title', meta.title],
    ['property', 'og:description', meta.description],
    ['property', 'og:url', url],
    ['property', 'og:image', image],
    ['property', 'og:image:width', String(meta.imageWidth)],
    ['property', 'og:image:height', String(meta.imageHeight)],
    ['property', 'og:image:alt', meta.imageAlt],
    ['name', 'twitter:title', meta.title],
    ['name', 'twitter:description', meta.description],
    ['name', 'twitter:image', image],
  ]
}

export function applyHead(meta: PageMeta, siteUrl: string) {
  document.title = meta.title
  for (const [attr, key, content] of headEntries(meta, siteUrl)) {
    let tag = document.head.querySelector(`meta[${attr}="${key}"]`)
    if (!tag) {
      tag = document.createElement('meta')
      tag.setAttribute(attr, key)
      document.head.appendChild(tag)
    }
    tag.setAttribute('content', content)
  }
  let canonical = document.head.querySelector('link[rel="canonical"]')
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.setAttribute('rel', 'canonical')
    document.head.appendChild(canonical)
  }
  canonical.setAttribute('href', absolute(siteUrl, meta.path))
}

const escapeAttr = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** 在构建产物 index.html 的基础上替换 head 标签，返回新的 HTML 字符串。 */
export function renderHead(template: string, meta: PageMeta, siteUrl: string): string {
  // 替换内容用函数返回，避免文案里的 $ 被当成正则替换符
  let html = template.replace(/<title>[^<]*<\/title>/, () => `<title>${escapeAttr(meta.title)}</title>`)
  for (const [attr, key, content] of headEntries(meta, siteUrl)) {
    const pattern = new RegExp(`<meta ${attr}="${key.replace(/[:]/g, '\\:')}" content="[^"]*"\\s*/?>`)
    const tag = `<meta ${attr}="${key}" content="${escapeAttr(content)}" />`
    html = pattern.test(html) ? html.replace(pattern, () => tag) : html.replace('</head>', () => `    ${tag}\n  </head>`)
  }
  return html.replace(
    /<link rel="canonical" href="[^"]*"\s*\/?>/,
    () => `<link rel="canonical" href="${escapeAttr(absolute(siteUrl, meta.path))}" />`,
  )
}
