<script setup lang="ts">
import { computed, ref } from 'vue'
import Icon from './Icon.vue'
import { authOpen, currentUser } from '../utils/user-session'
import { pendingInvite } from '../utils/sharing'
import { openInviteRegistration } from '../utils/invite'

// 被邀请人关掉注册框后，右下角留一个小入口，随时可以回来注册
const dismissed = ref(false)
const show = computed(() => !!pendingInvite.value && !currentUser.value && !authOpen.value && !dismissed.value)
</script>

<template>
  <Transition name="toast">
    <aside v-if="show && pendingInvite" class="invite-badge" role="complementary" aria-label="注册邀请">
      <div class="invite-badge-body">
        <strong>「{{ pendingInvite.nickname }}」邀请你注册</strong>
        <p>注册后 TA 获得 {{ pendingInvite.pointsPerInvite }} 积分，浏览项目不受影响。</p>
        <button class="button small" type="button" @click="openInviteRegistration">去注册</button>
      </div>
      <button class="invite-badge-close" type="button" aria-label="收起" @click="dismissed = true"><Icon name="close" :size="15" /></button>
    </aside>
  </Transition>
</template>
