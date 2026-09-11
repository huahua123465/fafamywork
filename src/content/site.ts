import { reactive } from 'vue'

// name 与 footerText 可在 /admin 个人主页里覆盖。
export const site = reactive({
  name: '我的作品',
  heroEyebrow: '项目作品集 · 持续上新',
  heroTitle: ['选一个喜欢的项目，', '从这里开始。'],
  heroDescription: '浏览界面，了解功能与技术。找到适合自己的方向，再聊聊源码和交付。',
  footerText: '保持好奇，慢慢创造。',
})
