import { createApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createMemoryHistory } from 'vue-router'
import App from './App.vue'
import { createAppRouter } from './router'
import { applyProfile, type Profile } from './utils/profile'
import { pageMeta, renderHead } from './utils/seo'
import { site } from './content/site'
import { projects } from './content/projects'

// 仅供 scripts/prerender.mjs 在构建后调用，不会打进浏览器包。

export { renderHead }
export const projectSlugs = projects.filter((p) => p.imageCount > 0).map((p) => p.slug)

export function useProfile(profile: Partial<Profile> | null) {
  applyProfile(profile)
}

/** 只解析路由得到 head 信息，不渲染组件（管理页依赖浏览器存储，不能在构建时渲染）。 */
export function metaFor(url: string) {
  const router = createAppRouter(createMemoryHistory())
  return pageMeta(router.resolve(url), site.name, projects)
}

export async function render(url: string) {
  const router = createAppRouter(createMemoryHistory())
  const app = createApp(App).use(router)
  await router.push(url)
  await router.isReady()
  // Teleport（弹窗）内容会进 ctx.teleports，这里不输出，挂载后由客户端生成
  const html = await renderToString(app, {})
  return { html, meta: pageMeta(router.currentRoute.value, site.name, projects) }
}
