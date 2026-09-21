<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Icon from './components/Icon.vue'
import ContactDialog from './components/ContactDialog.vue'
import AuthDialog from './components/AuthDialog.vue'
import InviteBadge from './components/InviteBadge.vue'
import { site } from './content/site'
import { openContact, toast, toastKind } from './composables/ui'
import { currentUser, openAuth } from './utils/user-session'
import { handleInviteLink } from './utils/invite'
const menu = ref(false)
const route = useRoute()
function contactFromMenu() {
  openContact()
  menu.value = false
}
watch(
  () => route.fullPath,
  () => (menu.value = false),
)
// 分享链接带 ?ref=分享码，任何页面进站都处理
watch(
  () => route.query.ref,
  (ref) => { if (ref) void handleInviteLink(ref, route.path) },
  { immediate: true },
)
</script>
<template>
  <a class="skip-link" href="#main">跳转到主要内容</a>
  <header class="site-header">
    <div class="nav-container">
      <RouterLink to="/" class="brand" :aria-label="`${site.name}首页`"
        ><span class="brand-mark"><i></i><i></i><i></i><i></i></span
        ><span>{{ site.name }}<span class="brand-period">.</span></span></RouterLink
      >
      <nav class="desktop-nav" aria-label="主导航">
        <RouterLink to="/" :class="{ current: route.path === '/' }">首页</RouterLink
        ><RouterLink to="/projects" :class="{ current: route.path.startsWith('/projects') }"
          >全部项目</RouterLink
        ><RouterLink to="/about" :class="{ current: route.path === '/about' }">关于我</RouterLink>
        <RouterLink to="/buying-guide" :class="{ current: route.path === '/buying-guide' }">购买说明</RouterLink>
      </nav>
      <div class="nav-actions">
        <RouterLink class="icon-button" to="/projects?focus=search" aria-label="搜索项目"
          ><Icon name="search" :size="20" /></RouterLink
        ><RouterLink v-if="currentUser" class="account-nav" to="/account"><span>{{ currentUser.points }} 积分</span>{{ currentUser.nickname || currentUser.username }}</RouterLink
        ><button v-else class="account-nav" @click="openAuth()">登录</button
        ><button class="contact-nav" @click="openContact">联系我 <Icon name="arrow" :size="16" /></button
        ><button
          class="icon-button mobile-menu-button"
          @click="menu = !menu"
          :aria-expanded="menu"
          aria-label="展开导航"
        >
          <Icon :name="menu ? 'close' : 'menu'" />
        </button>
      </div>
    </div>
    <nav v-if="menu" class="mobile-nav" aria-label="移动端导航">
      <RouterLink to="/">首页</RouterLink><RouterLink to="/projects">全部项目</RouterLink
      ><RouterLink to="/about">关于我</RouterLink><RouterLink to="/buying-guide">购买说明</RouterLink
      ><button @click="contactFromMenu">联系我 <Icon name="arrow" :size="16" /></button>
      <RouterLink v-if="currentUser" to="/account">我的积分（{{ currentUser.points }}）</RouterLink
      ><button v-else @click="openAuth(); menu = false">登录或注册</button>
    </nav>
  </header>
  <main id="main" tabindex="-1"><RouterView v-slot="{ Component, route: pageRoute }"><Transition name="page" mode="out-in"><div :key="pageRoute.path" class="page-view"><component :is="Component" /></div></Transition></RouterView></main>
  <footer class="site-footer">
    <div class="container">
      <div class="footer-top">
        <RouterLink to="/" class="brand"
          ><span class="brand-mark"><i></i><i></i><i></i><i></i></span>{{ site.name
          }}<span class="brand-period">.</span></RouterLink
        ><span>{{ site.footerText }}</span>
        <div>
          <RouterLink to="/projects">全部项目</RouterLink><RouterLink to="/about">关于我</RouterLink
          ><RouterLink to="/buying-guide">购买说明</RouterLink><button @click="openContact">联系我 ↗</button>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© {{ new Date().getFullYear() }} {{ site.name }}</span
        ><span>用心做好每一个作品</span
        ><a href="#main">回到顶部 ↑</a>
      </div>
    </div>
  </footer>
  <ContactDialog /><AuthDialog /><InviteBadge /><Transition name="toast"
    ><div v-if="toast" class="toast" :role="toastKind === 'error' ? 'alert' : 'status'">
      <Icon :name="toastKind === 'error' ? 'info' : 'success'" :size="18" />{{ toast }}
    </div></Transition
  >
</template>
