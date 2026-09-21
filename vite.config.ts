import { defineConfig, loadEnv, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildProjects, toSummary, type ProjectAssets, type ProjectCopyFile } from './src/content/catalog'
import type { ProjectInfo } from './src/types'

const DATA_FILES = {
  base: 'src/content/base-projects.json', // 首批 13 个项目，手工维护
  additions: 'src/content/new-projects.json', // scripts/sync-project-content.py 生成，勿手改
  assets: 'src/content/project-assets.json', // scripts/import-project-images.py 生成，勿手改
  copy: 'src/content/project-copy.json', // 人工润色的文案覆盖，重新生成数据时不会丢
}
const readJson = <T>(file: string): T => JSON.parse(readFileSync(resolve(__dirname, file), 'utf8')) as T

export function loadProjects() {
  return buildProjects(
    readJson<ProjectInfo[]>(DATA_FILES.base),
    readJson<ProjectInfo[]>(DATA_FILES.additions),
    readJson<Record<string, ProjectAssets>>(DATA_FILES.assets),
    readJson<ProjectCopyFile>(DATA_FILES.copy),
  )
}

/**
 * 把几份项目数据合并成两个虚拟模块：
 * - virtual:projects/summaries  列表字段，进首屏包
 * - virtual:projects/details    完整数据，只被详情页引用，单独成块
 */
function projectData(): Plugin {
  const ids = ['virtual:projects/summaries', 'virtual:projects/details']
  const files = Object.values(DATA_FILES).map((file) => resolve(__dirname, file))
  return {
    name: 'project-data',
    resolveId(id) {
      return ids.includes(id) ? `\0${id}` : undefined
    },
    load(id) {
      if (!ids.includes(id.slice(1))) return
      files.forEach((file) => this.addWatchFile(file))
      const projects = loadProjects()
      const data = id.endsWith('summaries') ? projects.map(toSummary) : projects
      return `export default ${JSON.stringify(data)}`
    },
    configureServer(server) {
      server.watcher.add(files)
      server.watcher.on('change', (file) => {
        if (!files.includes(resolve(file))) return
        for (const id of ids) {
          const mod = server.moduleGraph.getModuleById(`\0${id}`)
          if (mod) server.moduleGraph.invalidateModule(mod)
        }
        server.ws.send({ type: 'full-reload' })
      })
    },
  }
}

/** 构建时按真实项目数据生成 sitemap.xml 与 robots.txt，避免手工维护走样。 */
function seoFiles(siteUrl: string): Plugin {
  return {
    name: 'seo-files',
    apply: 'build',
    generateBundle() {
      // 详情页要靠截图资产展示，没有图片的项目不进 sitemap
      const slugs = loadProjects()
        .filter((project) => project.imageCount > 0)
        .map((project) => project.slug)
      if (!slugs.length) this.warn('没有解析到任何项目 slug，sitemap 只会包含静态页面')
      else this.info(`sitemap 收录 ${slugs.length} 个项目详情页`)

      const base = siteUrl.replace(/\/$/, '')
      const today = new Date().toISOString().slice(0, 10)
      const urls = [
        { loc: '/', priority: '1.0' },
        { loc: '/projects', priority: '0.9' },
        { loc: '/about', priority: '0.7' },
        ...slugs.map((slug) => ({ loc: `/projects/${slug}`, priority: '0.8' })),
      ]
      const sitemap =
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
        urls
          .map(
            (u) =>
              `  <url>\n    <loc>${base}${u.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${u.priority}</priority>\n  </url>`,
          )
          .join('\n') +
        `\n</urlset>\n`

      // 登录态页面不需要被收录
      const robots =
        `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /insights\nDisallow: /account\n\nSitemap: ${base}/sitemap.xml\n`

      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap })
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const siteUrl = env.VITE_SITE_URL || 'http://localhost:5173'
  return {
    plugins: [vue(), projectData(), seoFiles(siteUrl)],
    server: { proxy: { '/api': 'http://127.0.0.1:3000' } },
  }
})
