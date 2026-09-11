// 构建后预渲染：给每个公开页面生成带独立标题、描述、分享卡片和正文内容的静态 HTML。
// 用法：node scripts/prerender.mjs [输出目录，默认 dist]
//
// - 搜索引擎和微信 / QQ 的链接预览不执行 JS，只认 HTML 里现成的内容；
// - 浏览器打开时先看到这份静态内容，JS 加载完成后整体替换为可交互的页面。
// 个人资料在构建时从 PRERENDER_PROFILE_URL（默认 ${VITE_SITE_URL}/api/profile）读取，读不到就用默认文案。
import { createServer, loadEnv } from 'vite'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const outDir = resolve(process.argv[2] || 'dist')
const env = loadEnv('production', process.cwd(), '')
const siteUrl = (env.VITE_SITE_URL || 'http://localhost:5173').replace(/\/$/, '')
const template = readFileSync(join(outDir, 'index.html'), 'utf8')

async function fetchProfile() {
  const url = env.PRERENDER_PROFILE_URL || `${siteUrl}/api/profile`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) })
    if (res.ok) return await res.json()
    console.warn(`[prerender] 读取个人资料失败（HTTP ${res.status}），使用默认文案`)
  } catch (error) {
    console.warn(`[prerender] 读取个人资料失败（${error.cause?.code || error.message}），使用默认文案`)
  }
  return null
}

const vite = await createServer({
  mode: 'production',
  logLevel: 'error',
  appType: 'custom',
  server: { middlewareMode: true, hmr: false, watch: null },
})
try {
  const entry = await vite.ssrLoadModule('/src/entry-server.ts')
  entry.useProfile(await fetchProfile())

  const pages = [
    ['/', 'index.html'],
    ['/projects', 'projects/index.html'],
    ['/about', 'about/index.html'],
    ['/buying-guide', 'buying-guide/index.html'],
    ...entry.projectSlugs.map((slug) => [`/projects/${slug}`, `projects/${slug}/index.html`]),
    ['/__not-found__', '404.html'],
  ]
  for (const [url, file] of pages) {
    const { html, meta } = await entry.render(url)
    const page = entry
      .renderHead(template, meta, siteUrl)
      .replace('<div id="app"></div>', () => `<div id="app">${html}</div>`)
    if (page === template || !page.includes(`<div id="app">${html.slice(0, 40)}`)) throw new Error(`${url} 没有写入内容`)
    writeHtml(file, page)
  }
  // 管理页和统计页只需要正确的 head（noindex），内容依赖登录态，不预渲染
  for (const [url, file] of [
    ['/admin', 'admin/index.html'],
    ['/insights', 'insights/index.html'],
  ]) {
    writeHtml(file, entry.renderHead(template, entry.metaFor(url), siteUrl))
  }
  console.log(`[prerender] 生成 ${pages.length + 2} 个静态页面 → ${outDir}`)
} finally {
  await vite.close()
}

function writeHtml(file, content) {
  const target = join(outDir, file)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, content)
}
