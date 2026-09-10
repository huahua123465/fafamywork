<script setup lang="ts">
import type { PreviewKind } from '../types'
import Icon from './Icon.vue'
import AssetImage from './AssetImage.vue'
withDefaults(defineProps<{ kind: PreviewKind; variation?: number }>(), { variation: 0 })
const courses = [
  { name: '高等数学', room: '教学楼 201', col: 1, row: 1, color: 'blue' },
  { name: '英语', room: '外语楼 305', col: 2, row: 1, color: 'peach' },
  { name: '线性代数', room: '教学楼 202', col: 4, row: 1, color: 'mint' },
  { name: '大学物理', room: '理科楼 102', col: 3, row: 2, color: 'lavender' },
  { name: '英语', room: '外语楼 305', col: 5, row: 2, color: 'peach' },
  { name: '程序设计', room: '信息楼 401', col: 1, row: 3, color: 'blue' },
  { name: '自习', room: '图书馆 3F', col: 2, row: 4, color: 'lavender' },
  { name: '体育', room: '操场', col: 4, row: 3, color: 'mint' },
  { name: '自由时间', room: '留一点空白', col: 5, row: 4, color: 'cream' },
]
</script>
<template>
  <div
    class="app-preview"
    :class="[`preview-${kind}`, { 'preview-alt': variation === 1 }]"
    role="img"
    :aria-label="`${{ schedule: '轻课表课程表', campus: '校园搭子活动', board: '灵感收集夹', focus: '专注计时器', notes: '纸间笔记', palette: '拾色实验室' }[kind]}界面示例`"
  >
    <div class="window-top">
      <span class="window-dots"><i></i><i></i><i></i></span
      ><span class="window-title">{{
        {
          schedule: '轻课表',
          campus: '校园搭子',
          board: '灵感收集夹',
          focus: '专注此刻',
          notes: '纸间笔记',
          palette: '拾色实验室',
        }[kind]
      }}</span
      ><Icon name="more" :size="16" />
    </div>
    <template v-if="kind === 'schedule'">
      <div class="schedule-toolbar">
        <span>〈　 第 {{ variation ? '12' : '11' }} 周　 〉</span><span class="muted">五月 · 一周好时光</span
        ><span class="tiny-circle">+</span>
      </div>
      <div class="weekdays">
        <span></span><span v-for="day in ['一', '二', '三', '四', '五']" :key="day">周{{ day }}</span>
      </div>
      <div class="schedule-body">
        <div class="time-column">
          <span v-for="time in ['08:00', '10:00', '14:00', '16:00']" :key="time">{{ time }}</span>
        </div>
        <div class="course-grid">
          <div
            v-for="(course, i) in courses"
            :key="i"
            class="course"
            :class="course.color"
            :style="{ gridColumn: course.col, gridRow: course.row }"
          >
            <b>{{ course.name }}</b
            ><small>{{ course.room }}</small>
          </div>
        </div>
      </div>
      <div class="preview-bottom"><span class="status-dot"></span> 给忙碌的一周，留一点从容。</div>
    </template>
    <template v-else-if="kind === 'focus'">
      <p class="focus-caption">{{ variation ? '慢下来，也很好' : '现在，只做这一件事' }}</p>
      <div class="timer-ring">
        <strong>{{ variation ? '05:00' : '25:00' }}</strong
        ><span>● {{ variation ? '休息时间' : '专注时刻' }}</span>
      </div>
      <span class="mock-button">开始专注</span>
      <div class="focus-stats">
        <span><b>02</b>今日专注</span
        ><span
          ><b>50 <small>min</small></b
          >专注时长</span
        >
      </div>
    </template>
    <template v-else-if="kind === 'campus'">
      <div class="mini-heading">
        <strong>{{ variation ? '身边的新鲜事' : '一起，把日常过得有趣' }}</strong
        ><Icon name="search" :size="16" />
      </div>
      <div class="campus-photo">
        <AssetImage src="/images/campus.webp" alt="" />
        <div><span>校园漫步</span><b>好天气，一起出门吧。</b><small>周六 16:00 · 图书馆前</small></div>
      </div>
      <div class="mini-filters"><b>全部</b><span>运动</span><span>学习</span><span>生活</span></div>
      <div class="activity-row">
        <span class="activity-icon blue"><Icon name="book" /></span>
        <div><b>图书馆自习搭子</b><small>一起把计划变成完成</small></div>
        <span>周六</span>
      </div>
      <div class="activity-row">
        <span class="activity-icon peach"><Icon name="sun" /></span>
        <div><b>傍晚，在校园走走</b><small>发现熟悉地方的小美好</small></div>
        <span>17:30</span>
      </div>
    </template>
    <template v-else-if="kind === 'board'">
      <div class="mini-heading">
        <strong>{{ variation ? '换个角度，发现新灵感。' : '收集一点，喜欢的日常。' }}</strong
        ><Icon name="plus" :size="17" />
      </div>
      <div class="moodboard">
        <div class="mood-photo"><AssetImage src="/images/campus.webp" alt="" /><span>一片绿意</span></div>
        <div class="mood-quote peach">“少即是多。”<small>LESS, BUT BETTER</small></div>
        <div class="mood-quote mint">Keep it<br />simple.<small>给灵感一点空间</small></div>
        <div class="mood-photo"><AssetImage src="/images/studio.webp" alt="" /><span>光落在桌上</span></div>
        <div class="color-strip"><i></i><i></i><i></i><i></i></div>
        <div class="mood-note">下一次创作：<br />去海边看日出 ↗</div>
      </div>
    </template>
    <template v-else-if="kind === 'notes'">
      <div class="notes-layout">
        <div class="notes-sidebar">
          <b>我的笔记</b><span class="selected">一周的小记录</span><span>阅读与思考</span><span>灵感备忘</span
          ><span>课程笔记</span>
        </div>
        <div class="notes-paper">
          <small>日常 · 记录</small>
          <h4>{{ variation ? '新的一周，新的小目标。' : '慢慢来，也没关系。' }}</h4>
          <p>记下今天的一点收获，<br />给明天的自己一点启发。</p>
          <h5>这周想做的事</h5>
          <p>☑ 读完喜欢的那一章</p>
          <p>☐ 给想法画一张草图</p>
          <p>☐ 留一个下午去散步</p>
          <blockquote>认真生活，也认真记录。</blockquote>
        </div>
      </div>
    </template>
    <template v-else>
      <div class="mini-heading"><strong>今天，喜欢哪种颜色？</strong><Icon name="palette" :size="17" /></div>
      <div class="palette-swatches">
        <div
          v-for="(color, i) in variation
            ? ['#93B7BE', '#D5E5CC', '#F2D6A2', '#B4A7D6', '#D69D91']
            : ['#B7D5ED', '#DFEADD', '#F5E1C9', '#D7CFE5', '#F1BEB3']"
          :key="color"
          :style="{ background: color }"
        >
          <span>{{ ['天空', '新叶', '日光', '暮色', '桃子'][i] }}</span
          ><small>{{ color }}</small>
        </div>
      </div>
      <div class="palette-footer">
        <b>柔和的日常</b><span>一组让心情放轻的颜色。</span><span class="palette-chip">5 COLORS</span>
      </div>
    </template>
  </div>
</template>
