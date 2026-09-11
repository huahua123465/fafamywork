import { createRouter, createWebHistory } from 'vue-router'
import Home from '../pages/Home.vue'
import { site } from '../content/site'
import { projects } from '../content/projects'
import { recordPageView } from '../utils/analytics'
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home, meta: { title: '项目作品集' } },
    { path: '/projects', component: () => import('../pages/Projects.vue'), meta: { title: '全部项目' } },
    { path: '/projects/:slug', component: () => import('../pages/ProjectDetail.vue') },
    { path: '/about', component: () => import('../pages/About.vue'), meta: { title: '关于我' } },
    { path: '/insights', component: () => import('../pages/Insights.vue'), meta: { title: '浏览数据' } },
    {
      path: '/admin',
      component: () => import('../pages/Admin.vue'),
      meta: { title: '个人主页设置', noindex: true },
    },
    {
      path: '/:pathMatch(.*)*',
      component: () => import('../pages/NotFound.vue'),
      meta: { title: '页面未找到' },
    },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.path === from.path) return false
    return { top: 0 }
  },
})
router.afterEach((to) => {
  const project = to.params.slug ? projects.find((p) => p.slug === to.params.slug) : undefined
  const title = to.params.slug ? project?.name || '页面未找到' : to.meta.title
  document.title = `${title} · ${site.name}`
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute(
      'content',
      project?.summary ||
        (to.path === '/about'
          ? '一个喜欢创造的人，一些认真做的作品。了解作品背后的思考与创作过程。'
          : '浏览项目作品，查看界面截图、功能说明与技术要求，咨询源码与交付。'),
    )
  const robots = document.querySelector('meta[name="robots"]')
  robots?.setAttribute('content', to.meta.noindex ? 'noindex, nofollow' : 'index, follow')
  recordPageView(to.path, String(title || site.name))
})
export default router
