import type { Project } from '../types'
export function filterProjects(items: Project[], query = '', category = '全部', sort = 'featured') {
  const needle = query.trim().toLocaleLowerCase()
  return items
    .filter(
      (p) =>
        (category === '全部' || p.category === category) &&
        (!needle ||
          [p.name, p.english, p.summary, p.category, ...p.keywords]
            .join(' ')
            .toLocaleLowerCase()
            .includes(needle)),
    )
    .sort((a, b) =>
      sort === 'updated'
        ? (Date.parse(b.updatedAt || '') || 0) - (Date.parse(a.updatedAt || '') || 0) || a.order - b.order
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
