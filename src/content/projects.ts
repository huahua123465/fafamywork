import type { Category, ProjectSummary } from '../types'
import summaries from 'virtual:projects/summaries'

// 首屏只带列表字段；完整介绍、截图清单在 project-details.ts，随详情页按需加载。
// 数据来源与合并规则见 vite.config.ts 的 projectData 插件和 ./catalog.ts。
export const categories: Category[] = ['电商购物', '校园学习', '旅行生活', '社交聊天', '管理系统']
export const projects: ProjectSummary[] = summaries
