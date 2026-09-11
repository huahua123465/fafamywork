<script setup lang="ts">
import { openContact } from '../composables/ui'
import { site } from '../content/site'
const items = [
  ['先确认适不适合', '把项目链接、所需技术和功能清单发给我。确认语言、框架、数据库、运行环境，以及是否需要后端或管理员端。'],
  ['看清效果再决定', '截图用于了解界面，不代表所有业务已经运行验证。购买前可咨询对应版本的运行演示、安装包或视频，以及截图与源码是否一致。'],
  ['逐项确认交付内容', '源码、数据库初始化脚本、部署说明、安装包或构建产物，请逐项确认是否包含。第三方接口、账号与服务费用也需提前确认。'],
  ['确认报价和支持范围', '价格根据项目版本、交付内容和额外需求确认。环境配置帮助、问题处理期限、功能修改及额外收费范围，应在付款前明确。'],
  ['约定使用与验收方式', '提前约定源码的学习、二次开发和商业使用范围，是否允许转售，以及验收标准和退款处理条件。具体以双方确认的内容为准。'],
]
</script>
<template>
  <section class="container buying-guide section-pad">
    <header class="page-heading"><p class="eyebrow">购买说明</p><h1>先了解清楚，再安心选择</h1><p>从选项目到拿到源码，每一步都提前沟通。</p></header>
    <div class="purchase-grid"><article v-for="(item, index) in items" :key="item[0]"><p class="eyebrow">0{{ index + 1 }}</p><h2>{{ item[0] }}</h2><p>{{ item[1] }}</p></article></div>
    <p v-if="site.priceNote" class="purchase-price">参考价格：{{ site.priceNote }}</p>
    <div class="buying-actions"><RouterLink to="/projects" class="button">去选项目</RouterLink><button class="text-link" @click="openContact">咨询交付与报价 ↗</button></div>
  </section>
</template>
