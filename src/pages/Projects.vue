<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { categories, projects } from '../content/projects'
import { platforms as platformEntries } from '../content/platforms'
import { filterProjects } from '../utils/projects'
import ProjectCard from '../components/ProjectCard.vue'
import Icon from '../components/Icon.vue'
const route = useRoute(),
  router = useRouter()
const input = ref<HTMLInputElement>()
const queryString = (value: unknown) => (typeof value === 'string' ? value : '')
const search = ref(queryString(route.query.q))
const category = computed(() =>
  categories.includes(queryString(route.query.category) as any) ? queryString(route.query.category) : '全部',
)
const results = computed(() =>
  filterProjects(projects.filter(p => !route.query.platform || p.platform === route.query.platform), queryString(route.query.q), category.value, 'featured'),
)
const platforms = computed(() => [...new Set([...platformEntries, ...projects.map((p) => p.platform)])])
const emptyPlatform = computed(() => Boolean(route.query.platform) && !projects.some(p => p.platform === route.query.platform))
let timer: ReturnType<typeof setTimeout>
function update(values: Record<string, string | undefined>, replace = false) {
  const q = { ...route.query, ...values }
  delete q.focus
  delete q.limit
  return replace ? router.replace({ query: q }) : router.push({ query: q })
}
function apply() {
  clearTimeout(timer)
  update({ q: search.value.trim() || undefined }, true)
}
function onInput() {
  clearTimeout(timer)
  timer = setTimeout(apply, 200)
}
function clearSearch() {
  search.value = ''
  apply()
}
function reset() {
  clearTimeout(timer)
  search.value = ''
  router.push({ path: '/projects' })
}
watch(
  () => route.query.q,
  (q) => {
    search.value = queryString(q)
  },
)
watch(
  () => route.query.focus,
  async (focus) => {
    if (focus === 'search') {
      await nextTick()
      input.value?.focus()
    }
  },
  { immediate: true },
)
onBeforeUnmount(() => clearTimeout(timer))
</script>
<template>
  <section class="catalog-page">
    <div class="container">
      <header class="page-heading">
        <p class="eyebrow">ALL PROJECTS</p>
        <h1>每个想法，都有自己的样子。</h1>
        <p>从校园学习到电商与管理系统，浏览项目全貌，也看看实现细节。</p>
      </header>
      <div class="catalog-toolbar">
        <form class="search-field" role="search" @submit.prevent="apply">
          <Icon name="search" :size="20" /><input
            ref="input"
            v-model="search"
            type="search"
            aria-label="搜索项目"
            placeholder="搜索项目、功能或技术，如 Java、SQLite"
            @input="onInput"
          /><button
            v-if="search"
            class="icon-button"
            type="button"
            aria-label="清空搜索"
            @click="clearSearch"
          >
            <Icon name="close" :size="17" />
          </button>
        </form>
        <span class="catalog-summary">{{ projects.length }} 个项目 · 按推荐顺序浏览</span>
      </div>
      <div class="platform-filter">
        <p>技术平台</p>
        <div class="category-tabs" aria-label="技术平台">
          <button :aria-pressed="!route.query.platform" :class="{ active: !route.query.platform }" @click="update({ platform: undefined })">全部平台</button>
          <button v-for="item in platforms" :key="item" :aria-pressed="route.query.platform === item" :class="{ active: route.query.platform === item }" @click="update({ platform: item })">{{ item }}</button>
        </div>
      </div>
      <div class="catalog-filters">
        <div class="category-tabs" aria-label="项目分类">
          <button
            v-for="item in ['全部', ...categories]"
            :key="item"
            :aria-pressed="category === item"
            :class="{ active: category === item }"
            @click="update({ category: item === '全部' ? undefined : item })"
          >
            {{ item }}
          </button>
        </div>
        <span class="results-count" aria-live="polite">{{ results.length }} 个项目</span>
      </div>
      <div v-if="results.length" class="project-grid">
        <ProjectCard v-for="project in results" :key="project.id" :project="project" />
      </div>
      <div v-else class="empty-state">
        <div class="empty-icon"><Icon name="search" :size="35" /></div>
        <h2>{{ emptyPlatform ? `${route.query.platform} 项目即将上架` : '暂时没有找到相关项目' }}</h2>
        <p>{{ emptyPlatform ? '这里还没有作品，后续会陆续添加。可以先看看其他平台的项目。' : '换一个关键词，或看看其他分类吧。' }}</p>
        <button v-if="projects.length" class="button" @click="reset">
          清除筛选 <Icon name="right" :size="16" />
        </button>
      </div>
      <p v-if="results.length" class="catalog-end">
        <span></span>
        {{ search || category !== '全部' ? '这些就是全部匹配的作品了' : '暂时到这里，新的想法正在发生' }}
        <span></span>
      </p>
    </div>
  </section>
</template>
