import { reactive } from 'vue'

// 这里是「默认值」。站点启动时会拉取 /api/profile，
// 把你在 /admin 个人主页里填写的内容覆盖上来（见 src/utils/profile.ts）。
export const author = reactive({
  name: '作品创作者',
  role: '软件开发 · 项目实践',
  introduction:
    '从校园闲置到鲜花选购，从旅行计划到仓库管理。这里收录我的应用项目，也记录每一个想法落到界面的过程。',
  avatar: '',
  email: '',
  wechat: '',
  wechatQr: '',
  qq: '',
  phone: '',
  location: '',
  github: '',
  blog: '',
  resume: '',
  stories: [
    '这些作品围绕校园学习、日常购物、社交沟通与业务管理展开。每个项目都从具体的使用场景出发，把需求拆成页面，再用清晰的流程连接起来。',
    '在这里，你可以先通过页面总览了解项目全貌，再逐张查看界面与功能细节。项目介绍同时记录对应的功能模块、技术选择和实现方式。',
  ] as string[],
  skills: [
    { title: '理解需求', text: '先弄清楚一个真实的问题，再决定需要怎样的功能。', icon: 'sparkles' },
    { title: '界面与交互', text: '用清晰的布局和自然的操作，让想法变得容易使用。', icon: 'palette' },
    {
      title: '应用开发',
      text: '以 Java 与 Android 为基础，结合本地数据存储或后端接口实现不同场景。',
      icon: 'code',
    },
  ],
  timeline: [] as { date: string; title: string; text: string }[],
})
