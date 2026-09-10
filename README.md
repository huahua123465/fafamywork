# 我的作品 · 个人项目展示站

面向大学生的浅色作品展厅，使用 TypeScript、Vue 3、Vue Router、Vite 与原生 CSS。已接入 13 个应用项目、13 张页面总览和 200 张详细截图。

## 运行

已验证环境：Windows、Node.js 20.19.0、npm 10.8.2。

```sh
npm install
npm run dev -- --port 5173 --strictPort
```

预览地址：<http://127.0.0.1:5173/>。

```sh
npm run test     # 搜索、排序、数据与链接规则
npm run build    # TypeScript 检查与生产构建
npm run preview # 预览生产产物
npm run format  # 格式化源代码与文档
```

## 页面与交互

- 首页精选、统一总览封面与用途分类。
- 全部项目：搜索、分类、排序、URL 状态、空状态与加载更多。
- 13 个详情页：总览、详细截图、功能、技术与实现说明、相关作品。
- 图片预览：缩略图、展开全部、高清放大、原图、方向键、Escape 和焦点恢复。
- 关于我、联系弹窗、404、移动导航、响应式布局与图片失败兜底。

## 内容与维护

作品范围限定为 `D:/project/项目截图` 的 13 个独立项目。合集与花店重复发布包不重复展示。介绍依据 `D:/project/a` 中的对应文档和源码模块整理；未加入该目录中的其他项目。

截图先加载轻量 WebP，放大后使用原始 PNG/JPEG。源文件保持原样。部分是项目自带截图，部分是已有静态预览；本次未运行这些 Android 应用或后端。

- `src/content/projects.ts`：项目介绍、分类、功能与实现说明。
- `src/content/project-assets.json`：自动生成的总览、详细图与原图地址。
- `src/content/site.ts` / `author.ts`：站点与个人资料。
- `scripts/import-project-images.py`：按目录映射重新导入截图，需要 Python 和 Pillow。
- `public/images/projects/`：项目图片。

参见 [内容维护指南](docs/内容维护指南.md)、[项目资料对应](docs/项目资料对应.md) 和 [验收记录](docs/验收记录.md)。

尚未提供演示链接和公开联系方式，因此显示界面预览和联系渠道待补充。填写真实地址后相应入口自动出现。

## 发布

本次为本地前端交付。构建输出到 `dist/`；history 路由需将非静态资源路径回退至 `index.html`。`public/_redirects` 提供兼容平台的回退规则。纯客户端渲染不保证所有爬虫获得各项目独立分享卡片，需要时可增加预渲染。
