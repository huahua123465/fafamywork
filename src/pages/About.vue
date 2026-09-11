<script setup lang="ts">
import { author } from '../content/author'
import { projects } from '../content/projects'
import Icon from '../components/Icon.vue'
import AssetImage from '../components/AssetImage.vue'
import ProjectCard from '../components/ProjectCard.vue'
import { openContact } from '../composables/ui'
import { safeUrl } from '../utils/projects'
const steps = [
  { title: '先问，为什么', text: '理解使用场景，找到真正值得解决的小问题。', icon: 'search' },
  { title: '让想法看得见', text: '从草图和交互开始，把抽象的点子变得具体。', icon: 'pen' },
  { title: '认真做好细节', text: '写下代码，检查体验，让每一个操作都自然。', icon: 'code' },
  { title: '保持一点好奇', text: '听取反馈，持续改进，也期待下一个新想法。', icon: 'sparkles' },
]
</script>
<template>
  <section class="about-hero container">
    <div class="about-copy">
      <p class="eyebrow">很高兴在这里遇见你</p>
      <h1>你好，<span>来看看我做的项目。</span></h1>
      <p class="about-role">{{ author.role }}</p>
      <p class="about-description">{{ author.introduction }}</p>
      <div class="hero-actions">
        <RouterLink to="/projects" class="button">看看我的作品 <Icon name="right" :size="17" /></RouterLink
        ><button class="text-link" @click="openContact">联系我 <Icon name="chevron" :size="17" /></button>
      </div>
      <p v-if="author.sample" class="about-sample">
        <span class="status-dot"></span> 个人介绍示例 · 等待你的故事
      </p>
    </div>
    <div class="about-photo">
      <AssetImage
        :src="author.avatar || '/images/studio.webp'"
        :alt="author.avatar ? author.name : '阳光下的简洁创作桌面，AI 生成场景示例'"
        eager
      />
      <div class="photo-caption">
        <span>日常里的开发时光</span><span>把一个个想法，慢慢做成作品。</span>
      </div>
      <span class="photo-note">写代码，也记录灵感</span>
    </div>
  </section>
  <section class="about-story section-pad">
    <div class="container about-story-grid">
      <div>
        <p class="eyebrow">A LITTLE ABOUT ME</p>
        <h2>好奇心，<br />是最好的起点。</h2>
      </div>
      <div>
        <p v-for="story in author.stories" :key="story">{{ story }}</p>
        <div class="story-sign"><span>保持热爱，认真创造。</span><Icon name="sparkles" :size="22" /></div>
      </div>
    </div>
  </section>
  <section class="ability-section section-pad">
    <div class="container">
      <div class="section-heading">
        <div>
          <p class="eyebrow">WHAT I CARE ABOUT</p>
          <h2>想得清楚，也做得细致。</h2>
        </div>
        <span v-if="author.sample" class="subtle-label">能力方向 · 示例内容</span>
      </div>
      <div class="feature-grid">
        <article v-for="(skill, i) in author.skills" :key="skill.title">
          <div class="feature-top">
            <span class="feature-icon" :class="['blue', 'peach', 'mint'][i]"
              ><Icon :name="skill.icon" :size="26" /></span
            ><span class="feature-number">0{{ i + 1 }}</span>
          </div>
          <h3>{{ skill.title }}</h3>
          <p>{{ skill.text }}</p>
          <RouterLink :to="`/projects/${projects[i]?.slug}`" class="text-link"
            >看看相关作品 <Icon name="chevron" :size="16"
          /></RouterLink>
        </article>
      </div>
    </div>
  </section>
  <section class="process-section section-pad">
    <div class="container">
      <div class="section-heading">
        <div>
          <p class="eyebrow">FROM IDEA TO REALITY</p>
          <h2>一个作品，是这样开始的。</h2>
        </div>
      </div>
      <div class="process-grid">
        <article v-for="(step, i) in steps" :key="step.title">
          <div class="process-line">
            <span>0{{ i + 1 }}</span
            ><Icon :name="step.icon" :size="20" />
          </div>
          <h3>{{ step.title }}</h3>
          <p>{{ step.text }}</p>
        </article>
      </div>
      <p v-if="author.sample" class="sample-note process-note">
        创作过程为示例介绍，后续可替换为你的真实工作方式。
      </p>
    </div>
  </section>
  <section v-if="author.timeline.length" class="container timeline-section">
    <h2>一路走来的小脚印。</h2>
    <article v-for="event in author.timeline" :key="event.date + event.title">
      <span>{{ event.date }}</span>
      <div>
        <h3>{{ event.title }}</h3>
        <p>{{ event.text }}</p>
      </div>
    </article>
  </section>
  <section class="about-projects section-pad">
    <div class="container">
      <div class="section-heading">
        <div>
          <p class="eyebrow">LET THE WORK SPEAK</p>
          <h2>更多的我，藏在作品里。</h2>
        </div>
        <RouterLink to="/projects" class="text-link">全部作品 <Icon name="chevron" :size="17" /></RouterLink>
      </div>
      <div class="project-grid">
        <ProjectCard
          v-for="project in projects.filter((p) => p.featured).slice(0, 3)"
          :key="project.id"
          :project="project"
        />
      </div>
    </div>
  </section>
  <section class="about-contact container">
    <p class="eyebrow">SAY HELLO</p>
    <h2>下一个好点子，<br /><span>也许从一句你好开始。</span></h2>
    <p>作品交流、有趣的想法，或只是打个招呼。</p>
    <div class="hero-actions">
      <button class="button" @click="openContact">来聊聊 <Icon name="arrow" :size="18" /></button
      ><a
        v-if="safeUrl(author.github)"
        :href="safeUrl(author.github)"
        class="text-link"
        target="_blank"
        rel="noopener noreferrer"
        >GitHub <Icon name="arrow" :size="17" /></a
      ><a
        v-if="author.resume && (author.resume.startsWith('/') || safeUrl(author.resume))"
        :href="author.resume"
        class="text-link"
        download
        >下载简历 <Icon name="chevron" :size="17"
      /></a>
    </div>
  </section>
</template>
