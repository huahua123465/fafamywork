export type Category = '电商购物' | '校园学习' | '旅行生活' | '社交聊天' | '管理系统'
export interface ProjectImage {
  src: string
  alt: string
  caption?: string
  fullSrc?: string
  width?: number
  height?: number
}
export interface Project {
  id: string
  slug: string
  name: string
  english: string
  category: Category
  summary: string
  tagline: string
  description: string
  color: string
  keywords: string[]
  tags: string[]
  featured: boolean
  order: number
  status: '可体验' | '开发中' | '已归档' | '作品展示'
  platform?: string
  previewNotice?: string
  runtime?: { minSdk: number | null; compileSdk: number | null; note: string; languages: string[] }
  updatedAt?: string
  demoUrl?: string
  sourceUrl?: string
  cover?: ProjectImage
  images?: ProjectImage[]
  features: { title: string; text: string; icon: string }[]
  story: { title: string; text: string }[]
}
