import type { Category, Project } from '../types'
import assets from './project-assets.json'
import additions from './new-projects.json'

export const categories: Category[] = ['电商购物', '校园学习', '旅行生活', '社交聊天', '管理系统']
type ProjectInfo = Pick<
  Project,
  | 'slug'
  | 'name'
  | 'english'
  | 'category'
  | 'summary'
  | 'tagline'
  | 'description'
  | 'color'
  | 'keywords'
  | 'tags'
  | 'features'
  | 'story'
>
const entries: ProjectInfo[] = [
  {
    slug: 'flower-shop',
    name: '花开半夏',
    english: 'Flower Shop',
    category: '电商购物',
    color: 'peach',
    summary: '从一束鲜花，到一份心意。',
    tagline: '把花开的美好，带进日常。',
    description:
      '一款围绕鲜花选购设计的 Android 花店应用。将商品浏览、花束详情、购物车与订单记录串成完整的购物流程，同时提供商品编辑、店铺介绍和个人资料管理。',
    keywords: ['aflowershop', '花店', '鲜花', '购物车', '订单'],
    tags: ['Android', 'Java', 'SQLite', 'Glide'],
    features: [
      { title: '鲜花选购', text: '浏览花卉商品，查看图片、介绍与价格，从详情页衔接购物车。', icon: 'heart' },
      { title: '购物与订单', text: '管理购物车商品与数量，填写收货地址，查看自己的订单记录。', icon: 'grid' },
      {
        title: '店铺管理',
        text: '提供商品列表、添加与编辑入口，将日常选购和商品维护分别组织。',
        icon: 'layers',
      },
    ],
    story: [
      {
        title: '围绕花店场景组织功能',
        text: '以鲜花商品为核心，将选购、下单与订单查询串联起来。欢迎页和个人中心使用花卉视觉，让业务场景贯穿界面。',
      },
      {
        title: '本地数据与模块化页面',
        text: '项目使用 Java、Activity 与 Fragment 构建界面，通过 SQLite 管理用户、商品、购物车和订单数据，图片展示由 Glide 支持。',
      },
    ],
  },
  {
    slug: 'campus-swap',
    name: 'CampusSwap 校园闲置',
    english: 'CampusSwap',
    category: '校园学习',
    color: 'mint',
    summary: '让闲置流转，让校园生活更轻一点。',
    tagline: '闲置的下一站，就在校园里。',
    description:
      '面向校园闲置交易的 Android 项目。围绕教材、数码和生活用品的发布与浏览，整合分类搜索、商品详情、消息沟通和个人交易管理，为买卖双方提供清晰的使用路径。',
    keywords: ['CampusSwap', '校园', '二手', '闲置', '交易', '聊天'],
    tags: ['Android', 'Java', 'Room', 'MVVM'],
    features: [
      {
        title: '发现校园闲置',
        text: '通过首页、分类与商品列表发现物品，在详情页了解商品与卖家信息。',
        icon: 'search',
      },
      {
        title: '发布与沟通',
        text: '发布闲置商品，管理自己的发布，通过消息列表与聊天页面交流。',
        icon: 'pen',
      },
      {
        title: '交易记录与收藏',
        text: '将收藏、订单状态、交易记录与个人资料放入独立入口，便于回看。',
        icon: 'heart',
      },
    ],
    story: [
      {
        title: '从校园闲置需求出发',
        text: '把商品发布、查找与沟通放在一个校园场景中，让物品流转的每一步都有明确的页面承接。',
      },
      {
        title: '分层组织数据与界面',
        text: '项目文档采用 MVVM 与 Repository 的分层方式，结合 Room、LiveData 和 ViewModel 管理数据。图库保留项目自带图片与静态补充页面的原有内容。',
      },
    ],
  },
  {
    slug: 'travel',
    name: '行旅 · 智慧旅行',
    english: 'Travel Companion',
    category: '旅行生活',
    color: 'blue',
    summary: '目的地、旅行计划和音乐，一起出发。',
    tagline: '下一段旅程，从这里开始。',
    description:
      '一个将目的地探索、行程规划、收藏与音乐播放结合的 Android 旅行应用。除旅行者使用的前台页面外，还包含目的地、轮播图、音乐和用户管理界面。',
    keywords: ['Android_app', '行旅', '旅游', '旅行', '目的地', '音乐', '规划'],
    tags: ['Android', 'Java', 'Room', 'Retrofit', 'Spring Boot'],
    features: [
      {
        title: '发现想去的地方',
        text: '通过首页、搜索与目的地详情浏览旅行内容，并收藏感兴趣的目的地。',
        icon: 'pin',
      },
      {
        title: '安排一段行程',
        text: '通过旅行规划页面整理出行安排，在个人中心回到收藏与相关信息。',
        icon: 'calendar',
      },
      {
        title: '音乐与内容管理',
        text: '提供音乐列表与播放器，并包含目的地、轮播图、音乐和用户的管理入口。',
        icon: 'layers',
      },
    ],
    story: [
      {
        title: '把旅行场景串起来',
        text: '项目不只展示目的地，也将计划、收藏和音乐融入整体流程，让探索与整理各有位置。',
      },
      {
        title: '原生客户端与后端服务',
        text: '客户端使用 Java、Room、Retrofit、Glide 与 ExoPlayer。配套后端文档采用 Spring Boot、Spring Data JPA 和 MySQL，承担内容与数据服务。',
      },
    ],
  },
  {
    slug: 'boxuegu',
    name: '博学谷 · 学习助手',
    english: 'BoXueGu75',
    category: '校园学习',
    color: 'lavender',
    summary: '课程、习题和笔记，让学习有迹可循。',
    tagline: '把每一点进步，认真留下。',
    description:
      '一款围绕课程学习展开的 Android 应用，包含课程列表与详情、视频学习、章节习题、学习笔记和计划管理，并提供 AI 解答、新闻和播放记录等入口。',
    keywords: ['BoXueGu75', '博学谷', '课程', '视频', '笔记', '学习计划', 'AI'],
    tags: ['Android', 'Java', 'SQLite', 'XML Layout'],
    features: [
      { title: '课程与练习', text: '按章节浏览课程，进入课程介绍、视频播放与习题页面。', icon: 'book' },
      {
        title: '笔记与学习计划',
        text: '添加学习笔记、制定学习计划，通过独立列表回看记录与安排。',
        icon: 'pen',
      },
      {
        title: '延伸学习入口',
        text: '包含 AI 解答、新闻和播放记录；截图保留网络内容未加载时的空状态。',
        icon: 'sparkles',
      },
    ],
    story: [
      {
        title: '围绕学习流程设计入口',
        text: '把课程内容、练习和个人记录分别组织，既能从课程开始，也能从笔记与计划回到自己的进度。',
      },
      {
        title: '原生页面与本地记录',
        text: '源码包含课程详情、视频播放、笔记、学习计划等独立 Activity，使用 SQLiteHelper 管理本地数据，界面以 XML 布局实现。',
      },
    ],
  },
  {
    slug: 'computer-sales',
    name: '电脑与配件商城',
    english: 'Computer Sales',
    category: '电商购物',
    color: 'blue',
    summary: '商品参数看清楚，选购流程更完整。',
    tagline: '为下一台好设备，做好每一步。',
    description:
      '专注电脑及配件选购的 Android 电商系统，配套 PHP 后端与 MySQL 数据库。覆盖商品搜索、参数详情、购物车、地址选择和订单管理，同时提供独立管理员入口。',
    keywords: ['ComputerSales', '电脑', '配件', '数码', '商城', '订单'],
    tags: ['Android', 'Java', 'PHP', 'MySQL', 'Retrofit'],
    features: [
      {
        title: '商品浏览与参数',
        text: '提供分类搜索、商品列表与详情，集中呈现电脑配置、价格和商品信息。',
        icon: 'search',
      },
      {
        title: '完整选购流程',
        text: '从购物车到地址选择、确认订单和订单详情，逐步承接用户操作。',
        icon: 'grid',
      },
      {
        title: '独立管理端',
        text: '管理员通过专属入口维护商品、订单与用户，区分购物和运营任务。',
        icon: 'layers',
      },
    ],
    story: [
      {
        title: '面向数码商品的信息结构',
        text: '商品详情突出配置参数，将库存、价格与描述放在同一条阅读路径中，便于理解不同设备。',
      },
      {
        title: '前后端职责分离',
        text: 'Android 处理页面交互，PHP 提供业务 API，MySQL 存储商品、购物车、订单和地址等信息，网络请求通过 Retrofit 与 OkHttp 组织。',
      },
    ],
  },
  {
    slug: 'student-attendance',
    name: '学生考勤管理',
    english: 'Student Attendance',
    category: '管理系统',
    color: 'mint',
    summary: '学生、教师与管理员，各有清楚的工作台。',
    tagline: '让每一次出勤，都有清晰记录。',
    description:
      '面向课堂考勤的 Android 管理系统。围绕学生签到、课程列表、请假申请和考勤统计展开，同时提供教师快速考勤、请假审批以及管理员统计管理页面。',
    keywords: ['StudentAttendance', '考勤', '学生', '签到', '教师', '请假', '统计'],
    tags: ['Android', 'Java', 'PHP', 'MySQL', 'Retrofit'],
    features: [
      {
        title: '学生端日常考勤',
        text: '查看课程，完成考勤签到，浏览考勤记录、统计与公告。',
        icon: 'calendar',
      },
      {
        title: '教师端审批与记录',
        text: '通过快速考勤、考勤记录和请假审批处理教学管理事项。',
        icon: 'check',
      },
      { title: '管理员工作台', text: '汇总考勤与统计信息，并提供学生、教师、课程等管理模块。', icon: 'grid' },
    ],
    story: [
      {
        title: '同一业务，不同角色',
        text: '以学生、教师和管理员的任务区分入口。学生关注自己的课程与记录，教师关注审批与考勤，管理端关注全局数据。',
      },
      {
        title: '接口与原生界面配合',
        text: '客户端通过 Retrofit、OkHttp 与 PHP API 通信，后台采用 MySQL。源码将签到、记录、统计和审批拆分成独立 Activity。',
      },
    ],
  },
  {
    slug: 'community-share',
    name: '社区共享物品',
    english: 'Community Share',
    category: '旅行生活',
    color: 'cream',
    summary: '让闲置物品，成为邻里间的好帮手。',
    tagline: '有些东西，共享比拥有更好。',
    description:
      '面向社区物品共享的 Android 项目，连接物品发布者与借用者。系统覆盖物品分类浏览、发布编辑、收藏、借用申请、审批以及归还记录，并配置后台管理模块。',
    keywords: ['CommunitySharedItemsSystem', '社区', '共享', '借用', '归还', '物品'],
    tags: ['Android', 'Java', 'PHP', 'MySQL', 'OkHttp'],
    features: [
      {
        title: '发布与发现物品',
        text: '分类浏览与搜索物品，查看详细介绍，发布和维护自己的闲置物品。',
        icon: 'search',
      },
      { title: '借用有始有终', text: '将申请、审批、借用中与归还确认串成可追踪的记录流程。', icon: 'check' },
      {
        title: '个人记录与收藏',
        text: '分别查看借入、借出、我的物品和收藏，区分不同身份的任务。',
        icon: 'heart',
      },
    ],
    story: [
      {
        title: '借用关系是设计核心',
        text: '同一用户既可以是物主，也可以是借用者，因此需要区分物品状态、申请状态与归还状态。',
      },
      {
        title: '围绕记录构建数据模型',
        text: '采用 Android 与 PHP 的前后端分离方式，通过 MySQL 管理用户、物品、分类、借用记录与收藏等数据，使用 OkHttp 和 Gson 处理通信。',
      },
    ],
  },
  {
    slug: 'dessert-shop',
    name: 'Sweet · 甜品小店',
    english: 'Dessert App',
    category: '电商购物',
    color: 'peach',
    summary: '把一点甜，装进日常生活。',
    tagline: '今天，也给自己一点甜。',
    description:
      '围绕甜品浏览与选购设计的 Android 应用。通过首页、分类、购物车与个人中心组织主要流程，将收藏、订单、账户信息、收货地址和客户服务作为独立页面。',
    keywords: ['DessertApp', 'sweet', '甜品', '蛋糕', '商城', '收藏'],
    tags: ['Android', 'Java', 'Fragment', 'XML Layout'],
    features: [
      { title: '首页与分类浏览', text: '从首页发现甜品，通过分类页面聚焦感兴趣的商品。', icon: 'coffee' },
      {
        title: '购物车与订单',
        text: '将选购商品汇集到购物车，在个人中心回看订单列表与收藏。',
        icon: 'heart',
      },
      {
        title: '账户与服务',
        text: '提供账户信息、地址管理、客户服务与设置，补全选购之外的使用环节。',
        icon: 'phone',
      },
    ],
    story: [
      {
        title: '以轻松选购为主线',
        text: '将商品发现与个人管理分开组织，主要导航保持简洁，让常见购物任务更容易找到。',
      },
      {
        title: '基于 Fragment 组织页面',
        text: '源码使用 Java 与 XML 布局，首页、分类、购物车、收藏、地址和账户信息分别由 Fragment 承载。',
      },
    ],
  },
  {
    slug: 'garment-shop',
    name: '服装购物商城',
    english: 'Garment Shopping',
    category: '电商购物',
    color: 'rose',
    summary: '从心动款式，到完整的购物流程。',
    tagline: '让每一次挑选，都更有条理。',
    description:
      '面向服装选购的 Android 电商项目。整合商品分类、详情、购物车、结算、订单、收藏和地址管理，同时提供评价反馈与商品、订单管理界面。',
    keywords: ['GarmentShopping', '服装', '穿搭', '购物', '订单', '评价'],
    tags: ['Android', 'Java', 'PHP', 'Retrofit', 'Glide'],
    features: [
      {
        title: '款式发现与收藏',
        text: '通过首页和分类寻找商品，在详情页了解信息，收藏喜欢的款式。',
        icon: 'heart',
      },
      { title: '订单流程', text: '购物车、结算、支付界面、订单列表和详情形成连贯的页面路径。', icon: 'grid' },
      {
        title: '管理与反馈',
        text: '包含地址编辑、商品评价、用户反馈和管理员商品、订单管理。',
        icon: 'layers',
      },
    ],
    story: [
      {
        title: '从浏览到后续服务',
        text: '围绕商品展开前台流程，通过订单与评价串联后续操作，减少功能入口之间的割裂。',
      },
      {
        title: '原生页面连接业务服务',
        text: '使用 Java 和 AndroidX 构建界面，通过 Retrofit、OkHttp 与 PHP 服务交互，商品图片使用 Glide 加载。',
      },
    ],
  },
  {
    slug: 'e-commerce',
    name: '综合电商应用',
    english: 'E-commerce',
    category: '电商购物',
    color: 'rose',
    summary: '浏览、收藏、选购与服务，一站串联。',
    tagline: '把购物的每一步，都安排明白。',
    description:
      '一个包含用户购物与商品管理模块的 Android 电商项目。覆盖商品首页、详情、评价、购物车、确认支付、订单记录、收藏、店铺信息和客服页面。',
    keywords: ['e-commerce', '电商', '综合商城', '购物车', '支付', '客服'],
    tags: ['Android', 'Java', 'Material Components', 'Glide'],
    features: [
      { title: '商品与评价', text: '通过商品首页进入详情，查看商品信息、评价与收藏相关页面。', icon: 'grid' },
      {
        title: '购物与记录',
        text: '串联购物车、确认支付和订单记录，保留收货地址与个人信息入口。',
        icon: 'check',
      },
      {
        title: '店铺与服务',
        text: '包含店铺信息、客户服务、在线客服，以及商品管理和编辑页面。',
        icon: 'phone',
      },
    ],
    story: [
      {
        title: '覆盖电商常见环节',
        text: '除选购和订单之外，单独设计评价、收藏、店铺与客服入口，便于完整展示页面之间的关系。',
      },
      {
        title: '原生布局与本地素材',
        text: '采用 Java、Activity 和 Fragment，结合 Material Components 与 Glide。图库使用完整的十八页总览，并按原编号排列详细界面。',
      },
    ],
  },
  {
    slug: 'ai-chat',
    name: '聊天应用 · AI 助手版',
    english: 'Chat with AI',
    category: '社交聊天',
    color: 'lavender',
    summary: '日常聊天之外，多一个 AI 对话入口。',
    tagline: '交流之外，也容得下一点好奇。',
    description:
      '在联系人、单聊、群聊与消息搜索的基础上，增加 AI 助手与 AI 聊天页面的 Android 项目。将常规交流和智能对话放在各自明确的入口中。',
    keywords: ['chatapp一个人聊天', 'AI', '聊天', '助手', '群聊', '消息'],
    tags: ['Android', 'Java', 'SQLite', 'OkHttp'],
    features: [
      {
        title: '联系人与消息',
        text: '提供联系人添加、聊天界面与消息搜索，覆盖常见交流入口。',
        icon: 'phone',
      },
      { title: '群组会话', text: '包含创建群聊、群聊列表和群聊界面，区分单人与多人会话。', icon: 'layers' },
      {
        title: 'AI 助手入口',
        text: '提供 AI 助手与 AI 聊天页面，截图展示界面结构，未发起在线 AI 请求。',
        icon: 'sparkles',
      },
    ],
    story: [
      {
        title: '在聊天基础上扩展能力',
        text: '保留联系人与群组流程，用独立入口加入 AI 对话，区分不同类型的会话。',
      },
      {
        title: '本地记录与网络请求',
        text: '源码使用 Java、DatabaseHelper 和 SQLite 管理本地数据，声明 OkHttp 网络依赖，AI 助手由独立 Activity 承载。',
      },
    ],
  },
  {
    slug: 'chat-app',
    name: '轻聊 · 聊天应用',
    english: 'Chat App',
    category: '社交聊天',
    color: 'blue',
    summary: '联系人、单聊与群聊，清楚地放在一起。',
    tagline: '让每一次交流，都有自己的位置。',
    description:
      '一款包含注册登录、联系人、单聊、消息搜索与群聊模块的 Android 聊天应用。以常见的交流流程组织页面，兼顾联系人管理与多人会话。',
    keywords: ['chatapp', '聊天', '联系人', '消息搜索', '群聊'],
    tags: ['Android', 'Java', 'SQLite', 'OkHttp'],
    features: [
      { title: '联系人管理', text: '通过主界面和添加联系人页面，建立日常交流的入口。', icon: 'phone' },
      { title: '会话与消息搜索', text: '独立的聊天和消息搜索界面，覆盖交流与记录查找场景。', icon: 'search' },
      { title: '多人群聊', text: '创建群聊、查看群聊列表，再进入群聊页面，各流程相互衔接。', icon: 'layers' },
    ],
    story: [
      {
        title: '按交流任务划分页面',
        text: '将添加联系人、查看会话、搜索消息和管理群组拆开组织，让每个页面承担清晰的任务。',
      },
      {
        title: '原生开发与数据存储',
        text: '项目使用 Java 与 Android 布局构建界面，DatabaseHelper 采用 SQLite，通过 OkHttp 组织网络相关能力。',
      },
    ],
  },
  {
    slug: 'wims',
    name: 'WIMS 仓库管理',
    english: 'Warehouse Management',
    category: '管理系统',
    color: 'cream',
    summary: '入库、出库与库存，记录得清清楚楚。',
    tagline: '每一次流转，都心中有数。',
    description:
      '围绕仓库日常作业设计的 Android 管理系统。通过库存、入库、出库与库存详情模块组织业务，并配套 PHP API 与数据库脚本。',
    keywords: ['WIMS', '仓库', '库存', '入库', '出库', '管理'],
    tags: ['Android', 'Java', 'PHP', 'MySQL', 'Retrofit'],
    features: [
      { title: '库存浏览', text: '集中展示仓库库存，进入详情了解对应物品和记录。', icon: 'grid' },
      { title: '入库与出库', text: '将入库、出库分别组织成独立业务页面，明确物品流转方向。', icon: 'layers' },
      {
        title: '账户与个人中心',
        text: '提供欢迎、登录、注册和个人中心，形成完整的使用入口。',
        icon: 'phone',
      },
    ],
    story: [
      {
        title: '让库存流程保持清晰',
        text: '以库存为主视图，将入库和出库分别处理，明确每一项记录对应的业务动作。',
      },
      {
        title: '客户端与接口配合',
        text: 'Android 端使用 Java 与 Fragment，结合 Retrofit 和 Gson 进行数据通信，PHP 后端配套 MySQL 数据结构。',
      },
    ],
  },
]
export const projects: Project[] = [...entries, ...(additions as ProjectInfo[])].map((entry, index) => ({
  ...entry,
  ...assets[entry.slug as keyof typeof assets],
  id: entry.slug,
  kind: 'schedule',
  platform: 'Android 应用',
  featured: index < 6,
  order: index + 1,
  sample: false,
  status: '作品展示',
  previewNotice:
    additions.find((item) => item.slug === entry.slug)?.previewNotice ||
    '界面为项目自带图片或依据源码整理的静态预览，实际运行效果以应用为准。',
  caseStudy: {
    background: entry.description,
    audience:
      entry.category === '校园学习'
        ? '面向大学生与校园场景中的日常使用者。'
        : entry.category === '管理系统'
          ? '面向需要处理日常业务记录的学生、教师或管理人员。'
          : entry.category === '社交聊天'
            ? '面向希望完成联系人管理与日常沟通的移动端用户。'
            : entry.category === '旅行生活'
              ? '面向关注日常生活效率、共享或出行规划的移动端用户。'
              : '面向希望在移动端完成商品浏览、选购、购物车与订单管理的用户。',
    responsibility: `负责需求梳理、Android 客户端页面组织与主要业务流程实现，并围绕${entry.features
      .map((item) => item.title)
      .join('、')}完成模块衔接。`,
    cycle: '个人项目 · 持续迭代（原始资料未记录精确起止日期）',
    challenge: entry.story[0]?.text || '在有限页面中组织核心流程，并保持不同功能入口之间的关系清晰。',
    outcome: `已形成 ${assets[entry.slug as keyof typeof assets].images.length} 张详细界面和完整页面总览，覆盖${entry.features
      .map((item) => item.title)
      .join('、')}等核心场景。`,
  },
}))
