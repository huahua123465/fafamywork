<script setup lang="ts">
import { computed } from 'vue'
import type { Project } from '../types'
import { purchaseInfo } from '../content/purchase'
import { openContact } from '../composables/ui'
defineOptions({ inheritAttrs: false })
const props = defineProps<{ project: Project }>()
const info = computed(() => purchaseInfo(props.project))
</script>
<template>
  <section id="project-specs" class="purchase-section section-pad">
    <div class="container">
      <div class="section-heading">
        <div>
          <p class="eyebrow">PROJECT SPECIFICATIONS</p>
          <h2>先看技术，再选项目。</h2>
        </div>
        <p class="section-intro">开发方式、运行条件与功能范围，购买前一次看清。</p>
      </div>
      <div class="purchase-grid">
        <article v-for="(card, i) in info.cards" :key="card.label">
          <div class="spec-label">
            <span>{{ card.label }}</span
            ><span>0{{ i + 1 }}</span>
          </div>
          <h3>{{ card.title }}</h3>
          <p>{{ card.text }}</p>
        </article>
      </div>
      <div class="purchase-summary">
        <div>
          <p class="eyebrow">功能范围</p>
          <h3>{{ info.modules }}</h3>
          <p>{{ project.description }}</p>
        </div>
        <div>
          <p class="eyebrow">购买与交付</p>
          <h3>确认适合，再联系购买。</h3>
          <p>
            请提供课程要求与希望实现的功能，确认价格、源码范围、APK、数据库脚本、部署文档及售后支持。具体交付内容以沟通确认为准。
          </p>
          <button class="button" @click="openContact">咨询项目与报价 ↗</button>
        </div>
      </div>
    </div>
  </section>
</template>
