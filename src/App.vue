<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Icon from './components/Icon.vue'
import ContactDialog from './components/ContactDialog.vue'
import { site } from './content/site'
import { author } from './content/author'
import { projects } from './content/projects'
import { openContact, toast } from './composables/ui'
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
        <RouterLink to="/" :class="{ current: route.path === '/' }">探索</RouterLink
        ><RouterLink to="/projects" :class="{ current: route.path.startsWith('/projects') }"
          >全部项目</RouterLink
        ><RouterLink to="/about" :class="{ current: route.path === '/about' }">关于我</RouterLink>
        <RouterLink to="/insights" :class="{ current: route.path === '/insights' }">浏览数据</RouterLink>
      </nav>
      <div class="nav-actions">
        <RouterLink class="icon-button" to="/projects?focus=search" aria-label="搜索项目"
          ><Icon name="search" :size="20" /></RouterLink
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
      <RouterLink to="/">探索</RouterLink><RouterLink to="/projects">全部项目</RouterLink
      ><RouterLink to="/about">关于我</RouterLink><RouterLink to="/insights">浏览数据</RouterLink
      ><button @click="contactFromMenu">联系我 <Icon name="arrow" :size="16" /></button>
    </nav>
  </header>
  <main id="main" tabindex="-1"><RouterView /></main>
  <footer class="site-footer">
    <div class="container">
      <div class="footer-top">
        <RouterLink to="/" class="brand"
          ><span class="brand-mark"><i></i><i></i><i></i><i></i></span>{{ site.name
          }}<span class="brand-period">.</span></RouterLink
        ><span>{{ site.footerText }}</span>
        <div>
          <RouterLink to="/projects">全部项目</RouterLink><RouterLink to="/about">关于我</RouterLink
          ><RouterLink to="/insights">浏览数据</RouterLink><button @click="openContact">联系我 ↗</button>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© {{ new Date().getFullYear() }} {{ site.name }}</span
        ><span>{{
          author.sample || projects.some((p) => p.sample)
            ? '项目界面为静态预览 · 个人介绍待补充'
            : '用心做好每一个作品'
        }}</span
        ><a href="#main">回到顶部 ↑</a>
      </div>
    </div>
  </footer>
  <ContactDialog /><Transition name="toast"
    ><div v-if="toast" class="toast" role="status">
      <Icon name="success" :size="18" />{{ toast }}
    </div></Transition
  >
</template>
