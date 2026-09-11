import type {
  Project,
  ProjectCopy,
  ProjectImage,
  ProjectInfo,
  ProjectSummary,
} from '../types'

// 纯函数，不导入任何数据文件：浏览器端（经 vite 虚拟模块）、构建插件和预渲染脚本共用同一套合并规则。

export const DEFAULT_PLATFORM = 'Android 应用'
export const DEFAULT_NOTICE = '界面为项目自带图片或依据源码整理的静态预览，实际运行效果以应用为准。'
/** 首页默认展示的精选数量：数据顺序里的前几项 */
export const FEATURED_COUNT = 6

export interface ProjectAssets {
  cover: ProjectImage
  images: ProjectImage[]
}
export interface ProjectCopyFile {
  /** 截图名称统一翻译，键为导入脚本生成的原始 caption */
  captions?: Record<string, string>
  /** 预览说明统一替换，键为同步脚本生成的原文 */
  notices?: Record<string, string>
  /** 按 slug 覆盖生成的文案 */
  projects?: Record<string, ProjectCopy>
}

function translate(image: ProjectImage, captions: Record<string, string>, own?: string): ProjectImage {
  const caption = own || (image.caption && captions[image.caption])
  const alt = own || captions[image.alt]
  return caption || alt ? { ...image, caption: caption || image.caption, alt: alt || image.alt } : image
}

export function buildProjects(
  base: ProjectInfo[],
  additions: ProjectInfo[],
  assets: Record<string, ProjectAssets>,
  copy: ProjectCopyFile = {},
): Project[] {
  const captions = copy.captions || {}
  return [...base, ...additions].map((generated, index) => {
    const { imageCaptions, story, ...overrides } = copy.projects?.[generated.slug] || {}
    const entry: ProjectInfo = {
      ...generated,
      ...overrides,
      story: generated.story.map((item, i) => story?.[i] || item).concat(story?.slice(generated.story.length) || []),
    }
    const asset = assets[entry.slug]
    const images = (asset?.images || []).map((image, i) => translate(image, captions, imageCaptions?.[i]))
    const notice = entry.previewNotice && (copy.notices?.[entry.previewNotice] || entry.previewNotice)
    return {
      ...entry,
      id: entry.slug,
      platform: entry.platform || DEFAULT_PLATFORM,
      featured: index < FEATURED_COUNT,
      order: index + 1,
      status: '作品展示',
      previewNotice: notice || DEFAULT_NOTICE,
      cover: asset?.cover && translate(asset.cover, captions),
      images,
      imageCount: images.length,
      peek: images[Math.min(3, images.length - 1)],
    }
  })
}

export function toSummary(project: Project): ProjectSummary {
  const summary: ProjectSummary = {
    id: project.id,
    slug: project.slug,
    name: project.name,
    english: project.english,
    category: project.category,
    platform: project.platform,
    summary: project.summary,
    color: project.color,
    keywords: project.keywords,
    tags: project.tags,
    featured: project.featured,
    order: project.order,
    price: project.price,
    updatedAt: project.updatedAt,
    demoUrl: project.demoUrl,
    cover: project.cover,
    imageCount: project.imageCount,
    peek: project.peek,
  }
  // 去掉 undefined 字段，缩小打包体积
  return Object.fromEntries(Object.entries(summary).filter(([, v]) => v !== undefined)) as ProjectSummary
}
