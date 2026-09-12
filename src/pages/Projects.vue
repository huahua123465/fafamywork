<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { categories, projects } from '../content/projects'
import { platforms as platformEntries } from '../content/platforms'
import { filterProjects, type ProjectSort } from '../utils/projects'
import ProjectCard from '../components/ProjectCard.vue'
import Icon from '../components/Icon.vue'

const route = useRoute(),
  router = useRouter()
const input = ref<HTMLInputElement>()
const showTech = ref(false)
const queryString = (value: unknown) => (typeof value === 'string' ? value : '')
const queryList = (value: unknown) => queryString(value).split(',').filter(Boolean)
const search = ref(queryString(route.query.q))

const SORTS: { value: ProjectSort; label: string }[] = [
  { value: 'featured', label: '按推荐顺序' },
  { value: 'screens', label: '按界面数量' },
]
/** 买家最常按这些条件挑项目；只列出数据里真实出现过的标签 */
const TECH_FILTERS = ['Java', 'Kotlin', 'SQLite', 'Room', 'MySQL', 'PHP', 'Retrofit', 'Jetpack Compose']
const NEEDS = [
  { value: 'admin', label: '带管理端' },
  { value: 'backend', label: '带后端' },
]

const category = computed(() =>
  categories.includes(queryString(route.query.category) as never) ? queryString(route.query.category) : '全部',
)
const platform = computed(() => queryString(route.query.platform))
const tags = computed(() => queryList(route.query.tags))
const needs = computed(() => queryList(route.query.needs))
const sort = computed<ProjectSort>(() =>
  SORTS.some((s) => s.value === route.query.sort) ? (route.query.sort as ProjectSort) : 'featured',
)
const results = computed(() =>
  filterProjects(projects, {
    query: queryString(route.query.q),
    category: category.value,
    platform: platform.value,
    tags: tags.value,
    needs: needs.value,
    sort: sort.value,
  }),
)
const platformList = computed(() => [...new Set([...platformEntries, ...projects.map((p) => p.platform)])])
const techList = computed(() => TECH_FILTERS.filter((tag) => projects.some((p) => p.tags.includes(tag))))
const emptyPlatform = computed(() => Boolean(platform.value) && !projects.some((p) => p.platform === platform.value))
const activeCount = computed(
  () =>
    tags.value.length +
    needs.value.length +
    (category.value !== '全部' ? 1 : 0) +
    (platform.value ? 1 : 0) +
    (route.query.q ? 1 : 0),
)

let timer: ReturnType<typeof setTimeout>
function update(values: Record<string, string | undefined>, replace = false) {
  const q = { ...route.query, ...values }
  delete q.focus
  delete q.limit
  return replace ? router.replace({ query: q }) : router.push({ query: q })
}
/** 技术标签与交付要求可多选，点一下加入、再点一下去掉 */
function toggleIn(key: 'tags' | 'needs', value: string) {
  const current = key === 'tags' ? tags.value : needs.value
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
  update({ [key]: next.join(',') || undefined })
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
watch(
  () => tags.value.length + needs.value.length,
  (count) => {
    if (count) showTech.value = true
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

      <div class="catalog-controls">
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
        <select class="sort-select" aria-label="排序方式" :value="sort" @change="update({ sort: ($event.target as HTMLSelectElement).value })">
          <option v-for="item in SORTS" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
      </div>

      <div class="filter-rows">
        <div class="category-tabs" aria-label="技术平台">
          <button :aria-pressed="!platform" :class="{ active: !platform }" @click="update({ platform: undefined })">
            全部平台
          </button>
          <button
            v-for="item in platformList"
            :key="item"
            :aria-pressed="platform === item"
            :class="{ active: platform === item }"
            @click="update({ platform: item })"
          >
            {{ item }}
          </button>
        </div>
        <span class="filter-divider" aria-hidden="true"></span>
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
        <button
          class="filter-toggle"
          :class="{ 'has-active': tags.length + needs.length > 0 }"
          :aria-expanded="showTech"
          @click="showTech = !showTech"
        >
          <Icon name="filter" :size="16" />按技术筛选<template v-if="tags.length + needs.length"
            >（{{ tags.length + needs.length }}）</template
          >
        </button>
      </div>

      <div v-if="showTech" class="tech-filter">
        <span>技术栈</span>
        <button
          v-for="tag in techList"
          :key="tag"
          :class="{ active: tags.includes(tag) }"
          :aria-pressed="tags.includes(tag)"
          @click="toggleIn('tags', tag)"
        >
          {{ tag }}
        </button>
        <span class="filter-divider" aria-hidden="true"></span>
        <button
          v-for="item in NEEDS"
          :key="item.value"
          :class="{ active: needs.includes(item.value) }"
          :aria-pressed="needs.includes(item.value)"
          @click="toggleIn('needs', item.value)"
        >
          {{ item.label }}
        </button>
      </div>

      <p class="active-filters">
        <span aria-live="polite">{{ results.length }} 个项目</span>
        <button v-if="activeCount" type="button" @click="reset">清除全部筛选</button>
      </p>

      <div v-if="results.length" class="project-grid">
        <ProjectCard v-for="project in results" :key="project.id" :project="project" />
      </div>
      <div v-else class="empty-state">
        <div class="empty-icon"><Icon name="search" :size="35" /></div>
        <h2>{{ emptyPlatform ? `${platform} 项目即将上架` : '暂时没有找到相关项目' }}</h2>
        <p>
          {{
            emptyPlatform
              ? '这里还没有作品，后续会陆续添加。可以先看看其他平台的项目。'
              : '换一个关键词，或者少选几个筛选条件试试。'
          }}
        </p>
        <button v-if="projects.length" class="button" @click="reset">
          清除筛选 <Icon name="right" :size="16" />
        </button>
      </div>
      <p v-if="results.length" class="catalog-end">
        <span></span>
        {{ activeCount ? '这些就是全部匹配的作品了' : '暂时到这里，新的想法正在发生' }}
        <span></span>
      </p>
    </div>
  </section>
</template>
