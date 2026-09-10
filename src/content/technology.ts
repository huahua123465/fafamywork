export const technologyDescriptions: Record<string, string> = {
  Kotlin: 'Android 开发语言，用于编写页面状态、交互与业务逻辑。',
  'Jetpack Compose': '使用 Kotlin 声明界面，按状态变化更新页面；与传统 XML 布局的开发方式不同。',
  PyTorch: '机器学习推理框架。移动端需配套模型文件与图像预处理，识别效果以实际模型运行结果为准。',
  '高德地图 SDK': '地图展示与定位相关组件，使用时需要核对开发者 Key、应用包名、签名及权限配置。',
  ZXing: '条码与二维码识别组件，用于扫码录入或查询场景。',
  'Spring Boot': 'Java 后端框架，用于提供业务接口。运行时需配置后端环境、服务地址及相关数据服务。',
  Android: '移动端应用运行平台，承载页面生命周期、导航和系统能力。',
  Java: '主要开发语言，用于组织页面逻辑、业务模型与数据处理。',
  SQLite: '轻量本地数据库，用于保存账户、记录、收藏或业务数据。',
  Room: 'Android 数据持久化层，为本地数据提供更清晰的模型与查询方式。',
  Glide: '图片加载组件，负责商品图、头像等图片的加载与缓存。',
  Retrofit: '客户端接口通信组件，用于连接 Android 页面与后端服务。',
  OkHttp: '网络请求基础组件，处理接口调用与数据传输。',
  PHP: '项目后端接口实现，用于承接账户、商品、订单等业务请求。',
  MySQL: '服务端关系型数据库，用于保存结构化业务数据。',
  Fragment: '可复用的 Android 页面单元，用于组织底部导航和模块化界面。',
  'XML Layout': 'Android 原生界面布局文件，用于定义页面结构和视觉样式。',
  'Material Components': 'Android 界面组件体系，为表单、按钮与导航提供一致体验。',
  MVVM: '按界面、状态与数据职责分层，降低页面逻辑之间的耦合。',
  Gson: 'JSON 数据转换组件，用于客户端与接口数据模型之间的映射。',
}

export function describeTechnology(name: string) {
  return technologyDescriptions[name] || '用于支持该项目的页面实现与业务流程。'
}
