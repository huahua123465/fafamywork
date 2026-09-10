import { defineConfig, loadEnv, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFileSync } from 'node:fs'

/** 构建时按 projects.ts 里的真实 slug 生成 sitemap.xml 与 robots.txt，避免手工维护走样。 */
function seoFiles(siteUrl: string): Plugin {
  return {
    name: 'seo-files',
    apply: 'build',
    generateBundle() {
      // projects.ts 里的 13 条基础数据 + new-projects.json 里的 47 条增补，合起来才是全部项目。
      const source = readFileSync('src/content/projects.ts', 'utf8')
      const inline = [...source.matchAll(/slug:\s*'([a-z0-9-]+)'/g)].map((m) => m[1])
      const additions = (
        JSON.parse(readFileSync('src/content/new-projects.json', 'utf8')) as { slug?: string }[]
      )
        .map((item) => item.slug)
        .filter((slug): slug is string => Boolean(slug))
      // 详情页要靠 project-assets.json 取图，没有图片资产的 slug 不该进 sitemap
      const assets = JSON.parse(readFileSync('src/content/project-assets.json', 'utf8')) as Record<string, unknown>
      const unique = [...new Set([...inline, ...additions])].filter((slug) => slug in assets)
      if (!unique.length) this.warn('没有解析到任何项目 slug，sitemap 只会包含静态页面')
      else this.info(`sitemap 收录 ${unique.length} 个项目详情页`)

      const base = siteUrl.replace(/\/$/, '')
      const today = new Date().toISOString().slice(0, 10)
      const urls = [
        { loc: '/', priority: '1.0' },
        { loc: '/projects', priority: '0.9' },
        { loc: '/about', priority: '0.7' },
        ...unique.map((slug) => ({ loc: `/projects/${slug}`, priority: '0.8' })),
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

      // /admin 与 /insights 不需要被收录
      const robots =
        `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /insights\n\nSitemap: ${base}/sitemap.xml\n`

      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap })
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const siteUrl = env.VITE_SITE_URL || 'http://localhost:5173'
  return { plugins: [vue(), seoFiles(siteUrl)] }
})
