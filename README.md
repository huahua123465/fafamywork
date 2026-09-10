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

截图先加载轻量 WebP 缩略图，放大后加载同名的高清 WebP。原始 PNG/JPEG 已移出 `public/`，归档在根目录 `originals/`（已加入 .gitignore，只留在本机；git 历史里也仍保有这批文件，可用 `git show <旧commit>:<路径>` 取回）。需要重新导出更高质量的图时从那里取。部分是项目自带截图，部分是已有静态预览；本次未运行这些 Android 应用或后端。

- `src/content/projects.ts`：项目介绍、分类、功能与实现说明。
- `src/content/project-assets.json`：自动生成的总览、详细图与原图地址。
- `src/content/site.ts` / `author.ts`：站点与个人资料。
- `scripts/import-project-images.py`：按目录映射重新导入截图，需要 Python 和 Pillow。
- `public/images/projects/`：项目图片（缩略图 `*-preview.webp` + 高清 `*.webp`）。
- `originals/`：未压缩的 PNG/JPEG 原件，仅本机留档，不提交。

参见 [内容维护指南](docs/内容维护指南.md)、[项目资料对应](docs/项目资料对应.md) 和 [验收记录](docs/验收记录.md)。

## 个人资料与联系方式

姓名、联系方式、站点名称等不再写死在代码里，改为访问 `/admin` 在网页上填写，保存后全站立即生效，访客也能看到。

- 前端：`src/pages/Admin.vue` 是编辑界面，`src/utils/profile.ts` 负责启动时拉取并合并到 `author` / `site`。
  `src/content/author.ts` 与 `site.ts` 里保留的是「默认值」，只在对应字段留空时生效。
- 后端：`deploy/api/server.js`，零依赖 Node 服务，把资料存成一个 JSON 文件；
  字段走白名单校验，URL 只接受 http/https 或站内相对路径，登录失败会逐步限速。
- 管理密码在 `deploy/.env` 里（`ADMIN_PASSWORD`），照着 `deploy/.env.example` 建即可；改完在 `deploy/` 下执行 `docker compose up -d api` 生效。
  `.env` 与 `data/`（存放资料本体）都不提交到 git。

`/admin` 已在 `robots.txt` 里 `Disallow`，路由也带 `noindex`。

演示链接仍未提供，界面预览入口保持待补充状态。

## 发布

构建输出到 `dist/`；history 路由需将非静态资源路径回退至 `index.html`。`public/_redirects` 提供兼容平台的回退规则。

`sitemap.xml` 与 `robots.txt` 由 `vite.config.ts` 里的 `seoFiles` 插件在构建时按 `projects.ts` 的真实 slug 生成，不用手工维护。分享卡片图是 `public/og-cover.png`。

站点对外地址写在 `.env.production` 的 `VITE_SITE_URL`，它决定 `og:image`、`canonical` 与 `sitemap` 里的绝对链接。**换域名后必须改这里并重新构建**，否则分享卡片仍指向旧地址。

当前部署在自有服务器：`deploy/compose.yml`，nginx 托管 `dist/` 并把 `/api/` 反代到资料服务。

```sh
npm run build            # 先出产物
cd deploy && docker compose up -d
```

注意：`dist/` 是 nginx 的 bind mount，**不要 `rm -rf dist`**，否则容器会指向已删除的目录导致全站 404；`npm run build` 自己会清空目录内容，是安全的。

纯客户端渲染不保证所有爬虫获得各项目独立分享卡片，需要时可增加预渲染。
