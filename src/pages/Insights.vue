<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { fetchStats, type StatsSummary } from '../utils/analytics'
import { readToken } from '../utils/admin-session'
import { projects } from '../content/projects'
import Icon from '../components/Icon.vue'

const RANGES = [7, 30, 90]
const token = ref('')
const days = ref(30)
const stats = ref<StatsSummary>()
const loading = ref(false)
const error = ref('')
const hovered = ref<number | null>(null)

async function load() {
  if (!token.value) return
  loading.value = true
  error.value = ''
  try {
    stats.value = await fetchStats(token.value, days.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '读取统计失败'
    if ((e as { status?: number }).status === 401) token.value = ''
  } finally {
    loading.value = false
  }
}
onMounted(() => {
  token.value = readToken()
  load()
})
watch(days, load)

const nameOf = (slug: string) => projects.find((p) => p.slug === slug)?.name || slug
const pageName = (path: string) => {
  const slug = path.match(/^\/projects\/([a-z0-9-]+)$/)?.[1]
  if (slug) return nameOf(slug)
  return { '/': '首页', '/projects': '全部项目', '/about': '关于我', '/buying-guide': '购买说明' }[path] || path
}
const format = (n: number) => n.toLocaleString('zh-CN')
const shortDate = (date: string) => `${Number(date.slice(5, 7))}月${Number(date.slice(8, 10))}日`

// 纵轴取整到好读的刻度：1、2、5 × 10ⁿ
const niceMax = computed(() => {
  const max = Math.max(0, ...(stats.value?.daily.map((d) => d.views) || []))
  if (max <= 4) return 4
  const step = 10 ** Math.floor(Math.log10(max))
  return ([1, 2, 5, 10].map((m) => m * step).find((v) => v >= max) || max)
})
const peakIndex = computed(() => {
  const daily = stats.value?.daily || []
  let best = -1
  daily.forEach((d, i) => {
    if (d.views > 0 && (best < 0 || d.views >= daily[best]!.views)) best = i
  })
  return best
})
const axisDates = computed(() => {
  const daily = stats.value?.daily || []
  if (!daily.length) return []
  return [daily[0]!, daily[Math.floor((daily.length - 1) / 2)]!, daily[daily.length - 1]!].map((d) => shortDate(d.date))
})
const mobileShare = computed(() => {
  const t = stats.value?.total
  const sum = (t?.mobile || 0) + (t?.desktop || 0)
  return sum ? Math.round(((t?.mobile || 0) / sum) * 100) : 0
})
const maxProjectViews = computed(() => Math.max(1, ...(stats.value?.projects.map((p) => p.views) || [])))
const maxPageViews = computed(() => Math.max(1, ...(stats.value?.pages.map((p) => p.count) || [])))
const tip = computed(() => (hovered.value === null ? undefined : stats.value?.daily[hovered.value]))
</script>

<template>
  <section class="insights-page">
    <div class="container">
      <header class="insights-heading">
        <div>
          <p class="eyebrow">INSIGHTS</p>
          <h1>访问统计<span>.</span></h1>
        </div>
        <div class="data-scope">
          <Icon name="info" :size="18" />
          <p>
            <strong>全部访客的汇总数据</strong><br />按北京时间每天统计，不保存访客 IP；已过滤搜索引擎爬虫，
            登录过后台的浏览器（站长本人）不计入。<template v-if="stats?.firstDate"
              >从 {{ stats.firstDate }} 开始记录。</template
            >
          </p>
        </div>
      </header>

      <div v-if="!token" class="insight-card insights-login">
        <Icon name="chart" :size="28" />
        <p>{{ error || '访问统计只有站长可以查看，请先登录后台。' }}</p>
        <RouterLink to="/admin" class="button">去登录 <Icon name="right" :size="17" /></RouterLink>
      </div>

      <template v-else>
        <div class="stats-filter category-tabs" role="group" aria-label="统计时间范围">
          <button
            v-for="range in RANGES"
            :key="range"
            :class="{ active: days === range }"
            :aria-pressed="days === range"
            @click="days = range"
          >
            近 {{ range }} 天
          </button>
        </div>
        <p v-if="error" class="admin-error" role="alert">{{ error }}</p>

        <div v-if="stats" class="stats-body" :class="{ refreshing: loading }">
          <div class="metric-grid">
            <article>
              <small>浏览量</small><strong>{{ format(stats.total.views) }}</strong><span>次页面打开</span>
            </article>
            <article>
              <small>访客</small><strong>{{ format(stats.total.visitors) }}</strong><span>人次（按天去重）</span>
            </article>
            <article>
              <small>打开咨询</small><strong>{{ format(stats.total.contacts) }}</strong><span>次点开「联系我」</span>
            </article>
            <article>
              <small>复制联系方式</small><strong>{{ format(stats.total.copies) }}</strong><span>次复制微信 / 邮箱等</span>
            </article>
          </div>

          <div class="insights-grid">
            <section class="insight-card">
              <div class="insight-title">
                <div>
                  <p class="eyebrow">DAILY</p>
                  <h2>每日浏览量</h2>
                </div>
                <span>近 {{ stats.days }} 天</span>
              </div>
              <div v-if="stats.total.views" class="daily-chart">
                <div class="daily-grid" aria-hidden="true">
                  <span :style="{ top: '0%' }" :data-label="format(niceMax)"></span>
                  <span :style="{ top: '50%' }" :data-label="format(niceMax / 2)"></span>
                  <span :style="{ top: '100%' }" data-label="0"></span>
                </div>
                <div class="daily-bars" @pointerleave="hovered = null">
                  <button
                    v-for="(day, i) in stats.daily"
                    :key="day.date"
                    class="daily-bar"
                    :aria-label="`${shortDate(day.date)}：${day.views} 次浏览，${day.visitors} 位访客，${day.contacts} 次咨询`"
                    @pointerenter="hovered = i"
                    @focus="hovered = i"
                    @blur="hovered = null"
                  >
                    <i :style="{ height: `${(day.views / niceMax) * 100}%` }"
                      ><b v-if="i === peakIndex">{{ format(day.views) }}</b></i
                    >
                  </button>
                  <div
                    v-if="tip && hovered !== null"
                    class="daily-tip"
                    role="status"
                    :style="{ left: `${((hovered + 0.5) / stats.daily.length) * 100}%` }"
                  >
                    <strong>{{ format(tip.views) }} 次浏览</strong>
                    <span>{{ shortDate(tip.date) }}</span>
                    <span>访客 {{ format(tip.visitors) }} · 咨询 {{ format(tip.contacts) }}</span>
                  </div>
                </div>
                <div class="daily-axis" aria-hidden="true">
                  <span v-for="(label, i) in axisDates" :key="i">{{ label }}</span>
                </div>
                <details class="daily-table">
                  <summary>查看每日明细</summary>
                  <div class="stats-table-wrap">
                    <table>
                      <thead>
                        <tr><th>日期</th><th>浏览量</th><th>访客</th><th>咨询</th></tr>
                      </thead>
                      <tbody>
                        <tr v-for="day in [...stats.daily].reverse()" :key="day.date">
                          <td>{{ day.date }}</td><td>{{ day.views }}</td><td>{{ day.visitors }}</td><td>{{ day.contacts }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </details>
              </div>
              <div v-else class="insights-empty">
                <Icon name="chart" :size="28" />
                <p>这段时间还没有访问记录。访客浏览网站后，数据会自动出现在这里。</p>
              </div>
            </section>

            <section class="insight-card">
              <div class="insight-title">
                <div>
                  <p class="eyebrow">DEVICES</p>
                  <h2>设备分布</h2>
                </div>
              </div>
              <p class="device-share"><strong>{{ mobileShare }}%</strong> 的浏览来自手机</p>
              <div
                class="device-meter"
                role="meter"
                aria-label="手机浏览占比"
                :aria-valuenow="mobileShare"
                aria-valuemin="0"
                aria-valuemax="100"
              >
                <i :style="{ width: `${mobileShare}%` }"></i>
              </div>
              <dl class="device-numbers">
                <div><dt>手机</dt><dd>{{ format(stats.total.mobile) }}</dd></div>
                <div><dt>电脑 / 平板</dt><dd>{{ format(stats.total.desktop) }}</dd></div>
              </dl>

              <div class="insight-title referrer-title">
                <div>
                  <p class="eyebrow">REFERRERS</p>
                  <h2>从哪里来</h2>
                </div>
              </div>
              <ol v-if="stats.referrers.length" class="plain-ranking">
                <li v-for="item in stats.referrers" :key="item.key">
                  <span>{{ item.key }}</span><strong>{{ format(item.count) }}</strong>
                </li>
              </ol>
              <p v-else class="insights-note">暂无外部来源，访客多为直接打开链接（如微信、QQ 聊天里点开）。</p>
            </section>
          </div>

          <div class="insights-grid">
            <section class="insight-card">
              <div class="insight-title">
                <div>
                  <p class="eyebrow">PROJECTS</p>
                  <h2>热门项目</h2>
                </div>
                <span>按浏览量排序</span>
              </div>
              <div v-if="stats.projects.length" class="stats-table-wrap">
                <table class="project-stats">
                  <thead>
                    <tr><th>项目</th><th>浏览</th><th>咨询</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in stats.projects" :key="item.slug">
                      <td>
                        <RouterLink :to="`/projects/${item.slug}`">{{ nameOf(item.slug) }}</RouterLink>
                        <i class="stat-bar"><b :style="{ width: `${(item.views / maxProjectViews) * 100}%` }"></b></i>
                      </td>
                      <td>{{ format(item.views) }}</td>
                      <td>{{ format(item.contacts) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p v-else class="insights-note">这段时间还没有项目详情被打开。</p>
            </section>

            <section class="insight-card">
              <div class="insight-title">
                <div>
                  <p class="eyebrow">PAGES</p>
                  <h2>页面排行</h2>
                </div>
              </div>
              <ol v-if="stats.pages.length" class="plain-ranking">
                <li v-for="item in stats.pages.slice(0, 10)" :key="item.key">
                  <span
                    >{{ pageName(item.key) }}
                    <i class="stat-bar"><b :style="{ width: `${(item.count / maxPageViews) * 100}%` }"></b></i
                  ></span>
                  <strong>{{ format(item.count) }}</strong>
                </li>
              </ol>
              <p v-else class="insights-note">暂无数据。</p>
            </section>
          </div>
        </div>
        <p v-else-if="loading" class="insights-note">正在读取统计…</p>
      </template>
    </div>
  </section>
</template>
