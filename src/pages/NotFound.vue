<script setup lang="ts">
import Icon from '../components/Icon.vue'
</script>
<template>
  <section class="not-found container">
    <div class="error-number">404<span>·</span></div>
    <p class="eyebrow">A LITTLE DETOUR</p>
    <h1>这个页面，暂时找不到。</h1>
    <p>可能是地址有误，也可能作品搬了新家。<br />回到展厅，继续发现吧。</p>
    <div class="hero-actions">
      <RouterLink to="/" class="button">回到首页 <Icon name="right" :size="17" /></RouterLink
      ><RouterLink to="/projects" class="text-link">浏览项目 <Icon name="chevron" :size="17" /></RouterLink>
    </div>
  </section>
</template>
