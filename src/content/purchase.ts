import type { Project } from '../types'

// SDK values read from each source project's app/build.gradle(.kts).
const sdk: Record<string, [number, number]> = {
  'flower-shop': [21, 34],
  travel: [24, 35],
  boxuegu: [30, 34],
  'campus-swap': [30, 35],
  'ai-chat': [30, 35],
  'chat-app': [30, 35],
  'community-share': [30, 35],
  'computer-sales': [26, 35],
  'dessert-shop': [24, 35],
  'e-commerce': [21, 34],
  'garment-shop': [24, 35],
  'student-attendance': [30, 35],
  wims: [26, 35],
}
const versions: Record<number, string> = { 21: '5.0', 24: '7.0', 26: '8.0', 28: '9', 30: '11' }

/** 各平台的开发工具与运行环境说明；新增平台时在这里补一项。 */
const platformGuides: Record<string, { label: string; defaultLanguage: string; tool: string; audience: string; runtime: string; runtimeText: string }> = {
  'Android 应用': {
    label: 'Android 原生',
    defaultLanguage: 'Java',
    tool: 'Android Studio',
    audience: '希望学习 Android 页面与业务逻辑',
    runtime: '',
    runtimeText: '',
  },
  'Java Web': {
    label: 'Java Web',
    defaultLanguage: 'Java',
    tool: 'IntelliJ IDEA 或 Eclipse',
    audience: '希望学习 Web 后端接口、页面与数据库交互',
    runtime: 'JDK、Web 服务器与数据库',
    runtimeText: '需要准备与工程匹配的 JDK、Tomcat 或 Spring Boot 运行环境，并导入数据库脚本；具体版本以工程配置为准。',
  },
  鸿蒙: {
    label: 'HarmonyOS 应用',
    defaultLanguage: 'ArkTS',
    tool: 'DevEco Studio',
    audience: '希望学习鸿蒙页面组件与应用开发',
    runtime: 'HarmonyOS 设备或模拟器',
    runtimeText: '使用 DevEco Studio 导入工程，按工程的 SDK / API 版本准备模拟器或真机；版本以工程配置为准。',
  },
  小程序: {
    label: '微信小程序',
    defaultLanguage: 'JavaScript',
    tool: '微信开发者工具',
    audience: '希望学习小程序页面、组件与接口调用',
    runtime: '微信开发者工具',
    runtimeText: '使用微信开发者工具导入，需要自己的 AppID；涉及云开发或后端接口时，需确认服务配置是否包含。',
  },
}

export function purchaseInfo(project: Project) {
  const guide = platformGuides[project.platform] || {
    label: project.platform,
    defaultLanguage: '',
    tool: '对应开发工具',
    audience: '希望学习该项目实现方式',
    runtime: '运行环境购买前确认',
    runtimeText: '请在购买前确认开发工具、运行环境与依赖服务的版本要求。',
  }
  const android = project.platform === 'Android 应用'
  const [min, compile] = project.runtime
    ? [project.runtime.minSdk, project.runtime.compileSdk]
    : sdk[project.slug] || [null, null]
  const languages = project.runtime ? project.runtime.languages.join(' / ') : guide.defaultLanguage
  const php = project.tags.includes('PHP')
  const spring = project.tags.includes('Spring Boot')
  const local = project.tags.includes('SQLite') || project.tags.includes('Room')
  return {
    cards: [
      {
        label: '开发方式',
        title: languages ? `${languages} · ${guide.label}` : '开发语言待确认',
        text: languages
          ? `使用 ${guide.tool} 阅读与修改${android ? '客户端' : '项目'}代码，适合有 ${languages} 基础、${guide.audience}的同学。`
          : '已整理项目截图，但当前可读取资料不足以确认开发语言与技术实现，购买前请确认源码和运行要求。',
      },
      {
        label: '数据存储',
        title: project.tags.includes('MySQL')
          ? 'MySQL 服务端数据库'
          : project.tags.includes('Room')
            ? 'Room 本地数据层'
            : local
              ? 'SQLite 本地数据库'
              : project.tags.includes('Preferences') ? 'Preferences 本地偏好存储' : '数据方案购买前确认',
        text: project.tags.includes('MySQL')
          ? android
            ? '需要准备数据库与后端运行环境；客户端通过接口访问数据，不能只安装 APK 就完成服务端部署。'
            : '需要准备 MySQL 并导入数据库脚本，再配置项目里的数据库连接。'
          : project.tags.includes('Room')
            ? '以 SQLite 为基础，通过实体、DAO 与数据库层组织本地数据，适合学习数据持久化与分层。'
            : local
              ? '本地数据库用于保存项目业务记录。不同设备之间的数据同步能力，需要结合接口实现单独确认。'
              : project.tags.includes('Preferences') ? '使用 HarmonyOS Preferences 保存本地数据，不代表已配备多人共享的服务端数据库。' : '当前资料未明确标注完整的数据持久化方案，请在购买前确认存储方式与数据初始化步骤。',
      },
      android
        ? {
            label: '运行环境',
            title: min ? `Android ${versions[min] || `API ${min}`} 及以上` : '构建版本需确认',
            text:
              project.runtime?.note ||
              `源码配置 minSdk ${min}、compileSdk ${compile}。准备兼容的 Android Studio、SDK ${compile} 和真机或模拟器；Gradle / JDK 版本按工程配置匹配。`,
          }
        : {
            label: '运行环境',
            title: guide.runtime,
            text: project.runtime?.note || guide.runtimeText,
          },
      {
        label: '服务依赖',
        title: php
          ? 'PHP 后端需部署'
          : spring
            ? 'Spring Boot 后端'
            : project.slug === 'ai-chat'
              ? 'AI 接口需配置'
              : '本地与联网能力',
        text: php
          ? '需要配置 PHP 服务、接口地址及数据库连接。购买前确认后端代码、数据库脚本和部署说明是否包含。'
          : spring
            ? '后端由 Spring Boot 提供接口，需要匹配 Java 运行环境并配置服务地址；数据库与初始化步骤按工程配置确认。'
            : project.slug === 'ai-chat'
              ? '源码包含 AI 助手入口与网络请求配置。在线对话需可用的服务账号和接口配置，接口额度、费用及实际可用性需另行确认。'
              : '页面展示不等于云端服务已开通。涉及登录、图片或联网业务时，需确认接口地址、账号和服务是否可用。',
      },
    ],
    modules: project.features.map((f) => f.title).join('、'),
  }
}
