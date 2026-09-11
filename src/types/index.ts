export type Category = '电商购物' | '校园学习' | '旅行生活' | '社交聊天' | '管理系统'
export interface ProjectImage {
  src: string
  alt: string
  caption?: string
  fullSrc?: string
  width?: number
  height?: number
}
export interface ProjectFeature {
  title: string
  text: string
  icon: string
}
export interface ProjectStory {
  title: string
  text: string
}
export interface ProjectRuntime {
  minSdk: number | null
  compileSdk: number | null
  note: string
  languages: string[]
}

/** 数据文件里的一条项目（base-projects.json / new-projects.json 的元素）。 */
export interface ProjectInfo {
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
  features: ProjectFeature[]
  story: ProjectStory[]
  /** 技术平台，缺省为「Android 应用」；可选值见 src/content/platforms.ts */
  platform?: string
  runtime?: ProjectRuntime
  previewNotice?: string
  /** 参考价格文案，例如「¥199 起」；留空则显示「价格请咨询」 */
  price?: string
  updatedAt?: string
  demoUrl?: string
  sourceUrl?: string
}

/**
 * project-copy.json 里对单个项目的人工文案覆盖。
 * story 按位置合并（只写第一段就只替换第一段），imageCaptions 按截图顺序覆盖名称，其余字段整体替换。
 */
export type ProjectCopy = { imageCaptions?: string[] } & Partial<
  Pick<
    ProjectInfo,
    | 'name'
    | 'summary'
    | 'tagline'
    | 'description'
    | 'features'
    | 'story'
    | 'platform'
    | 'previewNotice'
    | 'price'
    | 'keywords'
    | 'updatedAt'
    | 'demoUrl'
    | 'sourceUrl'
  >
>

/** 列表、卡片、搜索、标题只需要这些字段，打进首屏包。 */
export interface ProjectSummary {
  id: string
  slug: string
  name: string
  english: string
  category: Category
  platform: string
  summary: string
  color: string
  keywords: string[]
  tags: string[]
  featured: boolean
  order: number
  price?: string
  updatedAt?: string
  demoUrl?: string
  cover?: ProjectImage
  /** 独立界面截图张数 */
  imageCount: number
  /** 卡片右下角的代表界面 */
  peek?: ProjectImage
}

/** 详情页使用的完整项目，随详情页按需加载。 */
export interface Project extends ProjectSummary {
  tagline: string
  description: string
  status: '可体验' | '开发中' | '已归档' | '作品展示'
  previewNotice: string
  runtime?: ProjectRuntime
  sourceUrl?: string
  images: ProjectImage[]
  features: ProjectFeature[]
  story: ProjectStory[]
}
