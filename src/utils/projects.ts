import type { ProjectSummary } from '../types'

export type ProjectSort = 'featured' | 'updated' | 'screens'

export interface ProjectFilter {
  query?: string
  category?: string
  platform?: string
  /** 技术标签，全部满足才算匹配 */
  tags?: string[]
  /** 交付要求：admin=带管理端，backend=带需要部署的后端 */
  needs?: string[]
  sort?: ProjectSort
}

export function filterProjects<T extends ProjectSummary>(items: T[], filter: ProjectFilter = {}): T[] {
  const { query = '', category = '全部', platform = '', tags = [], needs = [], sort = 'featured' } = filter
  const needle = query.trim().toLocaleLowerCase()
  return items
    .filter(
      (p) =>
        (category === '全部' || p.category === category) &&
        (!platform || p.platform === platform) &&
        tags.every((tag) => p.tags.includes(tag)) &&
        needs.every((need) => (need === 'admin' ? p.hasAdmin : need === 'backend' ? p.hasBackend : true)) &&
        (!needle ||
          [p.name, p.english, p.summary, p.category, p.platform, ...p.tags, ...p.keywords]
            .join(' ')
            .toLocaleLowerCase()
            .includes(needle)),
    )
    .sort((a, b) =>
      sort === 'updated'
        ? (Date.parse(b.updatedAt || '') || 0) - (Date.parse(a.updatedAt || '') || 0) || a.order - b.order
        : sort === 'screens'
          ? b.imageCount - a.imageCount || a.order - b.order
          : Number(b.featured) - Number(a.featured) || a.order - b.order,
    )
}

export function safeUrl(value?: string) {
  if (!value) return ''
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}
