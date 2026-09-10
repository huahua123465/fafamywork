<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { projects } from '../content/projects'
import Icon from '../components/Icon.vue'
import ProjectCard from '../components/ProjectCard.vue'
import ProjectGallery from '../components/ScreenshotGallery.vue'
import NotFound from './NotFound.vue'
import { openContact } from '../composables/ui'
import { safeUrl } from '../utils/projects'
import { describeTechnology } from '../content/technology'
import PurchaseGuide from '../components/PurchaseGuide.vue'
const route = useRoute(),
  router = useRouter()
const project = computed(() => projects.find((p) => p.slug === route.params.slug))
const related = computed(() =>
  projects
    .filter((p) => p.id !== project.value?.id)
    .sort(
      (a, b) =>
        Number(b.category === project.value?.category) - Number(a.category === project.value?.category) ||
        a.order - b.order,
    )
    .slice(0, 3),
)
function preview() {
  router.replace({ query: { ...route.query, view: 'preview' } })
}
function closePreview() {
  if (route.query.view) {
    const query = { ...route.query }
    delete query.view
    router.replace({ query })
  }
}
</script>
<template>
  <template v-if="project"
    ><section class="detail-intro container">
      <nav class="breadcrumb" aria-label="面包屑">
        <RouterLink to="/projects">全部项目</RouterLink><Icon name="chevron" :size="14" /><span>{{
          project.name
        }}</span>
      </nav>
      <div class="detail-heading">
        <p class="eyebrow">{{ project.english.toUpperCase() }}</p>
        <h1>{{ project.name }}<span class="detail-dot">.</span></h1>
        <p class="detail-tagline">{{ project.tagline }}</p>
        <div class="detail-actions">
          <a
            v-if="safeUrl(project.demoUrl)"
            :href="safeUrl(project.demoUrl)"
            class="button"
            target="_blank"
            rel="noopener noreferrer"
            >在线体验 <Icon name="arrow" :size="17" /></a
          ><button v-else class="button" @click="preview">
            查看界面预览 <Icon name="expand" :size="17" /></button
          ><a
            v-if="safeUrl(project.sourceUrl)"
            :href="safeUrl(project.sourceUrl)"
            class="text-link"
            target="_blank"
            rel="noopener noreferrer"
            ><Icon name="github" :size="17" /> 查看源码 <Icon name="arrow" :size="15" /></a
          ><button v-else class="text-link" @click="openContact">
            咨询购买 <Icon name="chevron" :size="16" />
          </button>
        </div>
        <p class="detail-meta">
          <span>{{ project.category }}</span
          ><span>{{ project.platform || '应用项目' }}</span
          ><span v-if="project.sample" class="sample-label">示例项目</span
          ><span v-else>{{ project.status }}</span>
        </p>
        <div class="detail-brief">
          <p>{{ project.description }}</p>
          <div class="detail-tech" aria-label="项目技术">
            <span v-for="tag in project.tags" :key="tag">{{ tag }}</span>
          </div>
        </div>
        <a href="#project-specs" class="text-link">查看技术规格与购买说明 ↓</a>
      </div>
      <ProjectGallery
        :project="project"
        :initial-open="route.query.view === 'preview'"
        @close="closePreview"
      />
    </section>
    <section class="project-overview section-pad">
      <div class="container overview-grid">
        <div>
          <p class="eyebrow">THE IDEA</p>
          <h2>项目档案，<br />一目了然。</h2>
        </div>
        <div>
          <div class="project-facts">
            <div>
              <small>项目类型</small><strong>{{ project.sample ? '界面概念示例' : project.category }}</strong>
            </div>
            <div>
              <small>适用平台</small><strong>{{ project.platform || '应用项目' }}</strong>
            </div>
            <div v-if="project.images?.length">
              <small>界面展示</small><strong>{{ project.images.length }} 张详细页面</strong>
            </div>
            <div v-if="project.updatedAt">
              <small>最近更新</small><strong>{{ project.updatedAt }}</strong>
            </div>
            <div>
              <small>体验状态</small
              ><strong>{{ safeUrl(project.demoUrl) ? '可在线体验' : '演示暂未开放' }}</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
    <PurchaseGuide :project="project" />
    <section class="technology-section section-pad">
      <div class="container">
        <div class="section-heading">
          <div>
            <p class="eyebrow">TECHNOLOGY</p>
            <h2>这个项目，使用哪些技术？</h2>
          </div>
          <p class="section-intro">按项目源码与依赖整理，帮助你对照课程的技术要求。</p>
        </div>
        <div class="technology-grid">
          <article v-for="(tag, i) in project.tags" :key="tag">
            <span>0{{ i + 1 }}</span>
            <h3>{{ tag }}</h3>
            <p>{{ describeTechnology(tag) }}</p>
          </article>
        </div>
      </div>
    </section>
    <section class="feature-section section-pad">
      <div class="container">
        <div class="section-heading">
          <div>
            <p class="eyebrow">MADE FOR THE EVERYDAY</p>
            <h2>把常用的事，做得顺手。</h2>
          </div>
        </div>
        <div class="feature-grid">
          <article v-for="(feature, i) in project.features" :key="feature.title">
            <div class="feature-top">
              <span class="feature-icon" :class="project.color"><Icon :name="feature.icon" :size="26" /></span
              ><span class="feature-number">0{{ i + 1 }}</span>
            </div>
            <h3>{{ feature.title }}</h3>
            <p>{{ feature.text }}</p>
          </article>
        </div>
      </div>
    </section>
    <section class="project-story section-pad">
      <div class="container story-grid">
        <div class="story-side">
          <p class="eyebrow">BEHIND THE PROJECT</p>
          <h2>从想法，<br />到一点点成形。</h2>
          <div class="tech-tags">
            <span v-for="tag in project.tags" :key="tag">{{ tag }}</span>
          </div>
          <p v-if="project.sample" class="sample-note">
            以下为设计示例的思路说明，<br />真实项目经历将在替换内容时补充。
          </p>
        </div>
        <div class="story-content">
          <article v-for="(item, i) in project.story" :key="item.title">
            <span>0{{ i + 1 }}</span>
            <div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.text }}</p>
            </div>
          </article>
          <details class="usage-details">
            <summary>关于使用与演示 <Icon name="plus" :size="18" /></summary>
            <p>
              {{
                safeUrl(project.demoUrl)
                  ? '点击在线体验将在新标签页打开项目，实际可用功能以演示站说明为准。'
                  : '目前可以查看界面设计、阅读项目介绍。业务演示尚未开放，预览中的控件用于展示设计，不会提交数据或创建记录。'
              }}
            </p>
            <p v-if="project.sample">本项目为展示示例，截图和场景图片用于呈现设计方向。</p>
          </details>
        </div>
      </div>
    </section>
    <section class="detail-cta container">
      <div>
        <p class="eyebrow">TAKE A CLOSER LOOK</p>
        <h2>找到适合你的项目了吗？</h2>
        <p>带上功能与技术要求，确认交付范围和报价。</p>
      </div>
      <div>
        <a
          v-if="safeUrl(project.demoUrl)"
          :href="safeUrl(project.demoUrl)"
          target="_blank"
          rel="noopener noreferrer"
          class="button"
          >在线体验 <Icon name="arrow" :size="17" /></a
        ><button v-else class="button" @click="preview">看看界面 <Icon name="expand" :size="17" /></button
        ><button class="text-link" @click="openContact">咨询购买 <Icon name="chevron" :size="17" /></button>
      </div>
    </section>
    <section class="related-section section-pad">
      <div class="container">
        <div class="section-heading">
          <div>
            <p class="eyebrow">KEEP EXPLORING</p>
            <h2>还有这些，也许你会喜欢。</h2>
          </div>
          <RouterLink to="/projects" class="text-link"
            >全部项目 <Icon name="chevron" :size="17"
          /></RouterLink>
        </div>
        <div class="project-grid"><ProjectCard v-for="item in related" :key="item.id" :project="item" /></div>
      </div></section></template
  ><NotFound v-else />
</template>
