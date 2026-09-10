<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { readAnalytics } from '../utils/analytics'
import { projects } from '../content/projects'
import Icon from '../components/Icon.vue'
const data = ref(readAnalytics())
const refresh = () => (data.value = readAnalytics())
onMounted(() => window.addEventListener('portfolio-analytics-update', refresh))
onBeforeUnmount(() => window.removeEventListener('portfolio-analytics-update', refresh))
const pages = computed(() => Object.values(data.value.pages).sort((a, b) => b.views - a.views))
const maxViews = computed(() => Math.max(1, ...pages.value.map((page) => page.views)))
const projectViews = computed(() => pages.value.filter((page) => page.path.startsWith('/projects/')))
const deviceTotal = computed(() => Math.max(1, data.value.desktopViews + data.value.mobileViews))
const pageName = (path: string, title: string) =>
  projects.find((project) => path === `/projects/${project.slug}`)?.name || title
</script>
<template>
  <section class="insights-page">
    <div class="container">
      <header class="insights-heading">
        <div>
          <p class="eyebrow">LOCAL INSIGHTS</p>
          <h1>浏览情况，<br /><span>清楚呈现。</span></h1>
        </div>
        <div class="data-scope">
          <Icon name="info" :size="18" />
          <p><strong>本机预览数据</strong><br />当前统计保存在这个浏览器中，用于预览数据页面的结构与效果。</p>
        </div>
      </header>
      <div class="metric-grid">
        <article>
          <small>累计浏览</small><strong>{{ data.totalViews }}</strong
          ><span>次页面访问</span>
        </article>
        <article>
          <small>浏览会话</small><strong>{{ data.sessions }}</strong
          ><span>次本机会话</span>
        </article>
        <article>
          <small>已浏览页面</small><strong>{{ pages.length }}</strong
          ><span>个不同页面</span>
        </article>
        <article>
          <small>项目详情</small><strong>{{ projectViews.length }}</strong
          ><span>个项目被打开</span>
        </article>
      </div>
      <div class="insights-grid">
        <section class="insight-card page-ranking">
          <div class="insight-title">
            <div>
              <p class="eyebrow">TOP PAGES</p>
              <h2>页面浏览排行</h2>
            </div>
            <span>{{ data.totalViews }} 次</span>
          </div>
          <div v-if="pages.length" class="ranking-list">
            <article v-for="(page, i) in pages.slice(0, 8)" :key="page.path">
              <span class="rank">{{ String(i + 1).padStart(2, '0') }}</span>
              <div>
                <strong>{{ pageName(page.path, page.title) }}</strong
                ><small>{{ page.path }}</small
                ><i><b :style="{ width: `${(page.views / maxViews) * 100}%` }"></b></i>
              </div>
              <strong>{{ page.views }}</strong>
            </article>
          </div>
          <div v-else class="insights-empty">
            <Icon name="chart" :size="28" />
            <p>浏览几个页面后，这里会自动生成排行。</p>
          </div>
        </section>
        <section class="insight-card">
          <div class="insight-title">
            <div>
              <p class="eyebrow">DEVICES</p>
              <h2>设备分布</h2>
            </div>
          </div>
          <div class="device-ring" :style="{ '--mobile': `${(data.mobileViews / deviceTotal) * 100}%` }">
            <span
              ><strong>{{ Math.round((data.desktopViews / deviceTotal) * 100) }}%</strong>桌面端</span
            >
          </div>
          <div class="device-legend">
            <span
              ><i class="desktop"></i>桌面端 <strong>{{ data.desktopViews }}</strong></span
            ><span
              ><i class="mobile"></i>移动端 <strong>{{ data.mobileViews }}</strong></span
            >
          </div>
        </section>
      </div>
      <p class="analytics-note">
        发布后如需汇总所有访客，应接入服务器统计或专业分析服务；当前页面不会上传浏览记录。
      </p>
    </div>
  </section>
</template>
