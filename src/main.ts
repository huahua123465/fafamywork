import { createApp } from 'vue'
import { createWebHistory } from 'vue-router'
import App from './App.vue'
import { createAppRouter } from './router'
import { loadProfile } from './utils/profile'
import { applyHead, pageMeta, siteOrigin } from './utils/seo'
import { trackView } from './utils/analytics'
import { site } from './content/site'
import { projects } from './content/projects'
import './assets/main.css'
import './assets/screenshots.css'
import './assets/insights.css'
import './assets/ui-system.css'
import './assets/warm-theme.css'
import './assets/admin.css'

const router = createAppRouter(createWebHistory())
router.afterEach((to) => {
  const meta = pageMeta(to, site.name, projects)
  applyHead(meta, siteOrigin())
  trackView(to.path)
})

// 先取个人资料再挂载，避免"作品创作者"等默认文案先闪出来再被替换。
// 页面已由构建时预渲染出静态内容，等待期间访客看到的就是同样的界面；
// loadProfile 内部有超时兜底，接口不可用时不会卡住。
// 这里用 createApp 而非 hydrate：挂载时整体替换预渲染内容，避免资料更新后出现水合不一致。
loadProfile().finally(() => {
  createApp(App).use(router).mount('#app')
})
