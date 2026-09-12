<script setup lang="ts">
import { computed, ref } from 'vue'
import { categories, projects } from '../content/projects'
import Icon from '../components/Icon.vue'
import ProjectCard from '../components/ProjectCard.vue'
import AssetImage from '../components/AssetImage.vue'
import { site } from '../content/site'
const category = ref('全部')
const mainProject = computed(() => projects.find((p) => p.featured) || projects[0])
const leftProject = computed(() => projects.find((p) => p.id !== mainProject.value?.id))
const rightProject = computed(() =>
  projects.find((p) => p.id !== mainProject.value?.id && p.id !== leftProject.value?.id),
)
const HOME_LIMIT = 6
const matched = computed(() =>
  projects.filter((p) => (category.value === '全部' ? p.featured : p.category === category.value)),
)
const visible = computed(() => matched.value.slice(0, HOME_LIMIT))
const totalScreens = computed(() =>
  projects.reduce((count, project) => count + project.imageCount, 0),
)
</script>
<template>
  <section class="home-hero">
    <div class="hero-copy">
      <p class="eyebrow">{{ site.heroEyebrow }}</p>
      <h1>
        {{ site.heroTitle[0] }}<br /><span>{{ site.heroTitle[1] }}</span>
      </h1>
      <p class="hero-description">{{ site.heroDescription }}</p>
      <div class="hero-proof" aria-label="作品数据">
        <span
          ><strong>{{ projects.length }}</strong> 个项目</span
        ><i></i>
        <span
          ><strong>{{ totalScreens }}</strong> 张界面截图</span
        ><i></i>
        <span><strong>{{ categories.length }}</strong> 类应用场景</span>
      </div>
      <div class="hero-actions">
        <RouterLink to="/projects" class="button">探索全部项目 <Icon name="right" :size="17" /></RouterLink
        ><RouterLink to="/about" class="text-link">关于我 <Icon name="chevron" :size="17" /></RouterLink>
      </div>
    </div>
    <div class="hero-stage" :class="{ 'real-project-stage': mainProject }">
      <div class="stage-glow"></div>
      <RouterLink
        v-if="leftProject"
        class="stage-window stage-left"
        :to="`/projects/${leftProject.slug}`"
        :aria-label="`了解${leftProject.name}`"
        ><AssetImage
          v-if="leftProject.cover"
          class="hero-cover"
          :src="leftProject.cover.src"
          :alt="leftProject.cover.alt"
        /><span
          v-else
          class="image-fallback hero-cover"
          >项目截图待补充</span
        ></RouterLink
      ><RouterLink
        v-if="mainProject"
        class="stage-window stage-main"
        :to="`/projects/${mainProject.slug}`"
        :aria-label="`了解${mainProject.name}`"
        ><AssetImage
          v-if="mainProject.cover"
          class="hero-cover"
          :src="mainProject.cover.src"
          :alt="mainProject.cover.alt"
          eager
          priority
        /><span
          v-else
          class="image-fallback hero-cover"
          >项目截图待补充</span
        ></RouterLink
      ><RouterLink
        v-if="rightProject"
        class="stage-window stage-right"
        :to="`/projects/${rightProject.slug}`"
        :aria-label="`了解${rightProject.name}`"
        ><AssetImage
          v-if="rightProject.cover"
          class="hero-cover"
          :src="rightProject.cover.src"
          :alt="rightProject.cover.alt"
        /><span
          v-else
          class="image-fallback hero-cover"
          >项目截图待补充</span
        ></RouterLink
      >
      <div class="stage-caption">
        <span class="status-dot"></span> 一些小作品，一点新可能 <span class="caption-divider">/</span>
        精选作品
      </div>
    </div>
  </section>
  <section class="discovery section-pad">
    <div class="container">
      <div class="section-heading">
        <div>
          <p class="eyebrow">精选项目</p>
          <h2>从感兴趣的方向逛起</h2>
        </div>
        <RouterLink to="/projects" class="text-link"
          >查看全部项目 <Icon name="chevron" :size="17"
        /></RouterLink>
      </div>
      <div class="category-tabs" aria-label="项目分类">
        <button
          v-for="item in ['全部', ...categories]"
          :key="item"
          :class="{ active: category === item }"
          :aria-pressed="category === item"
          @click="category = item"
        >
          {{ item }}
        </button>
      </div>
      <div v-if="visible.length" class="project-grid">
        <ProjectCard v-for="project in visible" :key="project.id" :project="project" />
      </div>
      <div v-else class="empty-state">
        <Icon name="sparkles" :size="32" />
        <h3>新的作品，正在路上。</h3>
        <p>稍后再来，发现新的想法。</p>
      </div>
      <div v-if="category !== '全部' && matched.length > HOME_LIMIT" class="load-more home-more">
        <RouterLink :to="{ path: '/projects', query: { category } }" class="button secondary"
          >查看全部 {{ matched.length }} 个{{ category }}项目 <Icon name="right" :size="16"
        /></RouterLink>
      </div>
      <RouterLink to="/about" class="creator-strip"
        ><div class="creator-icon"><Icon name="sparkles" :size="34" /></div>
        <div>
          <h3>一个开发者，一些认真做的作品。</h3>
          <p>从生活里的小需求出发，把想法一点点做出来。</p>
        </div>
        <span class="text-link">了解我的创作故事 <Icon name="chevron" :size="17" /></span
      ></RouterLink>
    </div>
  </section>
</template>
