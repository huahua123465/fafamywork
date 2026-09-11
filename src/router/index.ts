import { createRouter, type RouterHistory } from 'vue-router'
import Home from '../pages/Home.vue'

export const routes = [
  { path: '/', component: Home, meta: { title: '项目作品集' } },
  { path: '/projects', component: () => import('../pages/Projects.vue'), meta: { title: '全部项目' } },
  { path: '/projects/:slug', component: () => import('../pages/ProjectDetail.vue') },
  { path: '/about', component: () => import('../pages/About.vue'), meta: { title: '关于我' } },
  { path: '/buying-guide', component: () => import('../pages/BuyingGuide.vue'), meta: { title: '购买说明' } },
  { path: '/insights', component: () => import('../pages/Insights.vue'), meta: { title: '访问统计', noindex: true } },
  {
    path: '/admin',
    component: () => import('../pages/Admin.vue'),
    meta: { title: '个人主页设置', noindex: true },
  },
  {
    path: '/:pathMatch(.*)*',
    component: () => import('../pages/NotFound.vue'),
    meta: { title: '页面未找到', noindex: true },
  },
]

/** 浏览器端用 web history，构建时预渲染用 memory history。 */
export function createAppRouter(history: RouterHistory) {
  return createRouter({
    history,
    routes,
    scrollBehavior(to, from, savedPosition) {
      if (savedPosition) return savedPosition
      if (to.path === from.path) return false
      return { top: 0 }
    },
  })
}
