<script setup lang="ts">
import { ref, watch } from 'vue'
import Modal from './Modal.vue'
import Icon from './Icon.vue'
import { author } from '../content/author'
import { contactOpen, notify } from '../composables/ui'
import { safeUrl } from '../utils/projects'
const copyError = ref(false)
const copied = ref(false)
watch(contactOpen, () => {
  copyError.value = false
  copied.value = false
})
async function copy(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    notify('已复制到剪贴板')
    copyError.value = false
    copied.value = true
  } catch {
    copyError.value = true
    copied.value = false
  }
}
</script>
<template>
  <Modal :open="contactOpen" title="咨询项目与报价" @close="contactOpen = false"
    ><div class="contact-body">
      <div class="contact-symbol"><Icon name="mail" :size="32" /></div>
      <p class="contact-intro">请准备项目名称、功能清单与技术要求。<br />沟通价格、运行环境和交付范围。</p>
      <div v-if="author.email || author.wechat || author.github" class="contact-options">
        <div v-if="author.email" class="contact-option">
          <Icon name="mail" />
          <div>
            <small>邮箱</small><a :href="`mailto:${author.email}`">{{ author.email }}</a>
          </div>
          <button class="icon-button" aria-label="复制邮箱" @click="copy(author.email)">
            <Icon name="copy" />
          </button>
        </div>
        <div v-if="author.wechat" class="contact-option">
          <Icon name="phone" />
          <div>
            <small>微信号</small><span class="selectable">{{ author.wechat }}</span>
          </div>
          <button class="icon-button" aria-label="复制微信号" @click="copy(author.wechat)">
            <Icon name="copy" />
          </button>
        </div>
        <a
          v-if="safeUrl(author.github)"
          class="contact-option"
          :href="safeUrl(author.github)"
          target="_blank"
          rel="noopener noreferrer"
          ><Icon name="github" />
          <div><small>也可以在这里找到我</small><span>GitHub</span></div>
          <Icon name="arrow"
        /></a>
      </div>
      <div v-else class="contact-pending">
        <span class="status-dot"></span>
        <div>
          <strong>联系方式即将补充</strong>
          <p>店主尚未公开联系渠道，暂时无法在线咨询或下单。<br />可先浏览项目的技术规格与界面。</p>
        </div>
      </div>
      <p v-if="copied" role="status" class="copy-success">已复制到剪贴板。</p>
      <p v-if="copyError" role="alert" class="copy-error">复制未成功，请选中上方联系方式手动复制。</p>
      <RouterLink to="/projects" class="button contact-cta" @click="contactOpen = false"
        >浏览全部项目 <Icon name="right" :size="17"
      /></RouterLink>
      <p class="modal-footnote">源码、安装包、部署支持与使用授权，以购买前确认为准。</p>
    </div></Modal
  >
</template>
