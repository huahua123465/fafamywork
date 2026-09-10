export interface VisitRecord {
  path: string
  title: string
  views: number
  lastVisited: string
}
export interface AnalyticsData {
  totalViews: number
  sessions: number
  desktopViews: number
  mobileViews: number
  daily: Record<string, number>
  pages: Record<string, VisitRecord>
}
const KEY = 'portfolio-local-analytics-v1'
const empty = (): AnalyticsData => ({
  totalViews: 0,
  sessions: 0,
  desktopViews: 0,
  mobileViews: 0,
  daily: {},
  pages: {},
})
export function readAnalytics(): AnalyticsData {
  try {
    return { ...empty(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return empty()
  }
}
export function recordPageView(path: string, title: string) {
  const data = readAnalytics()
  const now = new Date(),
    day = now.toISOString().slice(0, 10)
  if (!sessionStorage.getItem(`${KEY}-session`)) {
    sessionStorage.setItem(`${KEY}-session`, '1')
    data.sessions += 1
  }
  data.totalViews += 1
  data.daily[day] = (data.daily[day] || 0) + 1
  if (window.innerWidth < 768) data.mobileViews += 1
  else data.desktopViews += 1
  const current = data.pages[path]
  data.pages[path] = { path, title, views: (current?.views || 0) + 1, lastVisited: now.toISOString() }
  localStorage.setItem(KEY, JSON.stringify(data))
  window.dispatchEvent(new CustomEvent('portfolio-analytics-update'))
}
