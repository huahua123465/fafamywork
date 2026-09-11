<script setup lang="ts">
import { computed } from 'vue'
import type { Project } from '../types'
import { purchaseInfo } from '../content/purchase'
import { openContact } from '../composables/ui'
import { site } from '../content/site'
const props = defineProps<{ project: Project }>()
const specs = computed(() => purchaseInfo(props.project))
const price = computed(() => props.project.price || site.priceNote)
</script>
<template>
  <aside class="buying-summary" aria-label="购买前速览">
    <div class="section-heading"><h2>这个项目适合你吗？</h2><span>购买前速览</span></div>
    <dl class="buying-facts">
      <div><dt>技术平台</dt><dd>{{ project.platform || '待确认' }}</dd></div>
      <div><dt>技术栈</dt><dd>{{ project.tags.join(' / ') || '待确认' }}</dd></div>
      <div><dt>数据存储</dt><dd>{{ specs.cards[1]?.title }}</dd></div>
      <div><dt>运行条件</dt><dd>{{ specs.cards[2]?.title }}</dd></div>
      <div><dt>后端交付</dt><dd>是否包含源码与部署支持，需确认</dd></div>
      <div><dt>展示状态</dt><dd>界面预览 · 运行效果购买前确认</dd></div>
    </dl>
    <p>主要功能：{{ specs.modules }}</p>
    <div class="buying-actions"><span>{{ price ? `参考价格：${price}` : '价格与交付范围请咨询' }}</span><button class="button" @click="openContact">咨询这个项目 ↗</button><RouterLink to="/buying-guide" class="text-link">查看购买说明</RouterLink></div>
  </aside>
</template>
