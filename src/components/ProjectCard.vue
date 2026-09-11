<script setup lang="ts">
import type { ProjectSummary } from '../types'
import Icon from './Icon.vue'
import AssetImage from './AssetImage.vue'
import { safeUrl } from '../utils/projects'
defineProps<{ project: ProjectSummary }>()
</script>
<template>
  <article class="project-card" :class="[project.color, 'real-project-card']">
    <div class="card-copy">
      <span class="eyebrow category-label">{{ project.category }}</span>
      <span v-if="project.imageCount" class="card-screen-count">{{ project.imageCount }} 张界面</span>
      <h3>
        <RouterLink :to="`/projects/${project.slug}`">{{ project.name }}</RouterLink>
      </h3>
      <p>{{ project.summary }}</p>
      <div class="card-tech" aria-label="项目技术">
        <span v-for="tag in project.tags.slice(0, 3)" :key="tag">{{ tag }}</span>
      </div>
    </div>
    <RouterLink class="card-art" :to="`/projects/${project.slug}`" :aria-label="`了解${project.name}`"
      ><AssetImage
        v-if="project.cover"
        :src="project.cover.src"
        :fallback-src="project.cover.fullSrc"
        :alt="project.cover.alt"
        class="cover-img"
      /><span v-else class="image-fallback"
        ><Icon name="image" :size="32" /><span>项目截图待补充</span></span
      ><span v-if="project.cover" class="cover-hint"
        ><Icon name="expand" :size="15" /> 查看页面总览</span
      ><span v-if="project.peek" class="card-peek" aria-hidden="true">
        <AssetImage :src="project.peek.src" :fallback-src="project.peek.fullSrc" alt="" />
        <small>代表界面</small>
      </span>
      ></RouterLink
    >
    <div class="card-actions">
      <RouterLink :to="`/projects/${project.slug}`" class="text-link"
        >了解项目 <Icon name="chevron" :size="16" /></RouterLink
      ><a
        v-if="safeUrl(project.demoUrl)"
        :href="safeUrl(project.demoUrl)"
        target="_blank"
        rel="noopener noreferrer"
        class="button small"
        >在线体验 <Icon name="arrow" :size="15" /></a
      ><RouterLink v-else class="button small secondary" :to="`/projects/${project.slug}?view=preview`"
        >界面预览 <Icon name="arrow" :size="15"
      /></RouterLink>
    </div>
  </article>
</template>
