# 我的作品 · 个人项目展示站

面向大学生的浅色作品展厅，使用 TypeScript、Vue 3、Vue Router、Vite 与原生 CSS。已接入 60 个应用项目、60 张页面总览和 764 张详细截图。

## 运行

已验证环境：Windows、Node.js 20.19.0、npm 10.8.2。

```sh
npm install
npm run dev -- --port 5173 --strictPort
```

预览地址：<http://127.0.0.1:5173/>。

```sh
npm run test     # 搜索、数据、SEO、资料与统计接口
npm run build    # TypeScript 检查、生产构建、预渲染静态页面
npm run preview # 预览生产产物
npm run format  # 格式化源代码与文档
```

## 页面与交互

- 首页精选、统一总览封面与用途分类，分类超过 6 个项目时可跳到完整列表。
- 全部项目：搜索、技术平台、分类、URL 状态与空状态。
- 60 个详情页：总览、详细截图、购买前速览、技术规格、功能与实现说明、相关作品。
- 图片预览：缩略图、展开全部、高清放大、原图、方向键、Escape 和焦点恢复。
- 关于我、联系弹窗、404、移动导航、响应式布局与图片失败兜底。

## 内容与维护

作品范围限定为 `D:/project/项目截图` 的 13 个独立项目。合集与花店重复发布包不重复展示。介绍依据 `D:/project/a` 中的对应文档和源码模块整理；未加入该目录中的其他项目。

截图先加载轻量 WebP 缩略图，放大后加载同名的高清 WebP。原始 PNG/JPEG 已移出 `public/`，归档在根目录 `originals/`（已加入 .gitignore，只留在本机；git 历史里也仍保有这批文件，可用 `git show <旧commit>:<路径>` 取回）。需要重新导出更高质量的图时从那里取。部分是项目自带截图，部分是已有静态预览；本次未运行这些 Android 应用或后端。

- `src/content/base-projects.json`：首批 13 个项目的介绍，手工维护。
- `src/content/new-projects.json`：`scripts/sync-project-content.py` 生成的其余项目，**不要手改**。
- `src/content/project-copy.json`：人工润色的文案覆盖层（标语、介绍、功能、截图中文名、预览说明），重新运行同步脚本不会丢。
- `src/content/project-assets.json`：自动生成的总览、详细图与原图地址。
- `src/content/catalog.ts`：合并以上数据的规则；`vite.config.ts` 的 `projectData` 插件把结果拆成列表数据（进首屏包）和详情数据（随详情页加载）。
- `src/content/site.ts` / `author.ts`：站点与个人资料。
- `scripts/import-project-images.py`：按目录映射重新导入截图，需要 Python 和 Pillow。
- `public/images/projects/`：项目图片（缩略图 `*-preview.webp` + 高清 `*.webp`）。
- `originals/`：未压缩的 PNG/JPEG 原件，仅本机留档，不提交。

参见 [内容维护指南](docs/内容维护指南.md)、[项目资料对应](docs/项目资料对应.md) 和 [验收记录](docs/验收记录.md)。

## 个人资料与联系方式

姓名、联系方式、站点名称等不再写死在代码里，改为访问 `/admin` 在网页上填写，保存后全站立即生效，访客也能看到。

- 前端：`src/pages/Admin.vue` 是编辑界面，`src/utils/profile.ts` 负责启动时拉取并合并到 `author` / `site`。
  `src/content/author.ts` 与 `site.ts` 里保留的是「默认值」，只在对应字段留空时生效。
- 后端：`deploy/api/server.js`，公开资料保存在 JSON 文件，普通用户与会话保存在 SQLite 数据库；
  字段走白名单校验，邮箱和链接格式不对会返回出错字段，登录失败会逐步限速（15 分钟后清零）。
  手机号一栏不校验格式，可以填微信号等账号，只有电话号码才会生成拨号链接。
- 「参考价格」也在 `/admin` 填写，显示在项目速览与购买说明页；单个项目可在数据里填 `price` 覆盖。
- 管理密码在 `deploy/.env` 里（`ADMIN_PASSWORD`），照着 `deploy/.env.example` 建即可；改完在 `deploy/` 下执行 `docker compose up -d --build api` 生效。
  `.env` 与 `data/`（存放资料本体）都不提交到 git。

`/admin` 已在 `robots.txt` 里 `Disallow`，路由也带 `noindex`。

## 访问统计

前端在页面切换、打开「联系我」、复制联系方式时向 `/api/track` 上报，服务器按北京时间逐日汇总到 `deploy/data/stats.json`（保留 400 天）：
浏览量、按天去重的访客数、设备、页面、项目浏览与咨询次数、外部来源。不保存访客 IP，过滤爬虫，
登录过后台的浏览器（站长本人）和开启「请勿追踪」的访客不计入。登录后台后访问 `/insights` 查看。

演示链接仍未提供，界面预览入口保持待补充状态。

## 发布

构建输出到 `dist/`；history 路由需将非静态资源路径回退至 `index.html`。`public/_redirects` 提供兼容平台的回退规则。

`sitemap.xml` 与 `robots.txt` 由 `vite.config.ts` 里的 `seoFiles` 插件在构建时按真实项目数据生成，不用手工维护。

`npm run build` 最后一步运行 `scripts/prerender.mjs`：为首页、项目列表、关于、购买说明、每个项目详情和 404 页生成带独立标题、描述、canonical、分享图和正文的静态 HTML，
搜索引擎与微信 / QQ 链接预览不执行 JS 也能读到内容。个人资料在构建时从 `${VITE_SITE_URL}/api/profile` 读取（可用 `PRERENDER_PROFILE_URL` 覆盖），
所以在 `/admin` 改了资料后，访客立刻能看到，搜索引擎看到的静态内容要等下次构建才更新。页面 head 信息统一由 `src/utils/seo.ts` 生成。
项目页分享图用项目封面，其他页面用 `public/og-cover.png`。

站点对外地址写在 `.env.production` 的 `VITE_SITE_URL`，它决定 `og:image`、`canonical` 与 `sitemap` 里的绝对链接。**换域名后必须改这里并重新构建**，否则分享卡片仍指向旧地址。

当前部署在自有服务器：`deploy/compose.yml`，nginx 托管 `dist/` 并把 `/api/` 反代到资料服务。

```sh
npm run build            # 先出产物
cd deploy && docker compose up -d
```

注意：`dist/` 是 nginx 的 bind mount，**不要 `rm -rf dist`**，否则容器会指向已删除的目录导致全站 404；`npm run build` 自己会清空目录内容，是安全的。

nginx 按预渲染出的 `<路径>/index.html` 返回页面，找不到文件的地址返回真实 404 状态码；HTML 一律 `no-cache`，`/assets/` 长期缓存。
改了 `deploy/nginx.conf` 需要 `docker compose exec web nginx -s reload`；改了 `deploy/api/` 下的服务代码需要 `docker compose up -d --build api`。
