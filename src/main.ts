import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { loadProfile } from './utils/profile'
import './assets/main.css'
import './assets/screenshots.css'
import './assets/insights.css'
import './assets/ui-system.css'
import './assets/warm-theme.css'
import './assets/admin.css'

// 先取个人资料再挂载，避免"作品创作者"等默认文案先闪出来再被替换。
// loadProfile 内部有超时兜底，接口不可用时不会卡住首屏。
loadProfile().finally(() => {
  createApp(App).use(router).mount('#app')
})
