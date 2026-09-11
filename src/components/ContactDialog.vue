<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Modal from './Modal.vue'
import Icon from './Icon.vue'
import { author } from '../content/author'
import { contactOpen, notify } from '../composables/ui'
import { safeUrl } from '../utils/projects'
import { siteOrigin } from '../utils/seo'
import { dialable } from '../utils/profile'
import { trackEvent } from '../utils/analytics'
import { useRoute } from 'vue-router'
import { projects } from '../content/projects'
const route = useRoute()
const selected = computed(() => projects.find(p => p.slug === route.params.slug))
const requirements = ref('')
const inquiry = computed(() => selected.value ? `你好，我想咨询：${selected.value.name}\n项目编号：${selected.value.slug}\n项目链接：${siteOrigin()}/projects/${selected.value.slug}\n技术：${selected.value.tags.join('、')}\n我的需求：${requirements.value || '希望确认价格、交付内容和运行环境。'}` : '')
const hasContact = computed(() =>
  Boolean(author.email || author.wechat || author.qq || author.phone || safeUrl(author.github) || safeUrl(author.blog)),
)
const copyError = ref(false)
const copied = ref(false)
watch(contactOpen, (open) => {
  if (open) trackEvent('contact', selected.value?.slug)
  requirements.value = ''
  copyError.value = false
  copied.value = false
})
async function copy(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    trackEvent('copy', selected.value?.slug)
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
      <div v-if="selected" class="inquiry-box">
        <h3>{{ selected.name }}</h3>
        <label for="inquiry-needs">你的技术或功能要求（选填）</label>
        <textarea id="inquiry-needs" v-model="requirements" rows="2" placeholder="例如：需要 MySQL、管理员端，是否支持协助部署？"></textarea>
        <label for="inquiry-message">咨询内容</label>
        <textarea id="inquiry-message" :value="inquiry" readonly rows="6"></textarea>
        <button class="button secondary" @click="copy(inquiry)">复制项目与需求</button>
      </div>
      <div v-if="hasContact" class="contact-options">
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
        <div v-if="author.qq" class="contact-option">
          <Icon name="phone" />
          <div>
            <small>QQ</small><span class="selectable">{{ author.qq }}</span>
          </div>
          <button class="icon-button" aria-label="复制 QQ" @click="copy(author.qq)">
            <Icon name="copy" />
          </button>
        </div>
        <div v-if="author.phone" class="contact-option">
          <Icon name="phone" />
          <div>
            <small>手机</small><a v-if="dialable(author.phone)" :href="`tel:${author.phone.replace(/[\s-]/g, '')}`">{{ author.phone }}</a
            ><span v-else class="selectable">{{ author.phone }}</span>
          </div>
          <button class="icon-button" aria-label="复制手机号" @click="copy(author.phone)">
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
        <a
          v-if="safeUrl(author.blog)"
          class="contact-option"
          :href="safeUrl(author.blog)"
          target="_blank"
          rel="noopener noreferrer"
          ><Icon name="external" />
          <div><small>个人主页</small><span>博客 / 主页</span></div>
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
