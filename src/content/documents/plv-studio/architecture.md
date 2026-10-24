---
title: "技术架构"
type: "architecture"
version: "v1.0"
updatedAt: "2026-10-24"
summary: "技术选型理由、系统分层、设计令牌体系、路由渲染与构建部署方案"
---

## 1. 技术选型与理由

### 1.1 运行时栈

| 领域 | 选型 | 版本 | 理由 |
| --- | --- | --- | --- |
| 静态站点框架 | Astro | ^7.4.0 | 静态生成优先、默认零客户端 JS、内建 Content Collections；是全站唯一的运行时依赖 |
| 样式方案 | Tailwind CSS | ^4.3.3 | 经 `@tailwindcss/vite` 以 Vite 插件方式接入；`@astrojs/tailwind` 集成包已停止维护且不支持 Astro 7（peer 冲突），因此不使用 |
| 语言 | TypeScript | ^5.9.3 | 配合 `astro check` 做全站类型检查（当前零错误） |
| 部署 | Netlify | — | 纯静态产物 `dist/`，`netlify.toml` 锁定 Node 22 |

### 1.2 关键取舍

- **纯静态、无后端**：站点没有需要服务端处理的用户操作，静态生成即可满足，避免引入数据库与服务端复杂度。
- **零客户端框架**：不引入 React / Vue 等客户端框架；自有页面脚本仅主题切换与移动菜单两段原生 JS，另有 Cloudflare Web Analytics 统计 beacon（生产构建注入，非功能依赖），页面在无 JS 环境下完整可用。
- **纯 Markdown 而非 MDX**：文档只需排版展示、无需在正文嵌入交互组件，因此不引入 `@astrojs/mdx` 依赖与编译成本。
- **混合内容方案**：长文内容（作品、设计文档）走 Content Collections，构建期用 Zod 校验 frontmatter；跨文件引用的结构化数据（开发进度、技术方向）保留 TS 模块，维持类型检查能力。

## 2. 系统分层与数据流

```text
内容层
  ├─ Content Collections（src/content.config.ts 定义 Zod schema，构建期校验）
  │    ├─ works/*.md              作品（frontmatter 元数据 + Markdown 正文）
  │    └─ documents/{slug}/*.md   设计文档（entry.id 形如 plv-studio/requirements）
  └─ TS 数据模块（src/data/）
       ├─ progress.ts             开发进度时间线
       └─ skills.ts               技术方向（可选关联作品 slug）

路由层（src/pages/，全部静态生成）
  ├─ index.astro                     首页
  ├─ works.astro                     作品列表
  ├─ works/[slug].astro              作品详情（render(entry) 渲染 Markdown）
  ├─ works/[slug]/documents/         文档列表与文档阅读页
  ├─ about.astro                     关于
  └─ 404.astro                       404 页

展示层（src/layouts/ + src/components/）
  Layout（meta、主题内联脚本、页头页脚）+
  WorkCard / DocumentCard / ProgressTimeline / WorkStatusBadge / TechStackTags / PageHeader
```

数据流：构建时 `getCollection()` 查询集合，页面将其映射为视图模型后交给组件渲染为静态 HTML；运行时没有任何 JS 数据请求。状态徽标、日期与作品名称全部来自统一数据源，页面之间不会各自维护一份数据。

## 3. 设计令牌系统

单一数据源位于 `src/styles/global.css`：

- 原始色值以 RGB 三元组存入 CSS 变量（如 `--c-primary: 37 99 235`）。
- 语义令牌（背景 / 表面 / 次级背景 / 文字 / 边框）在 `.dark` 类下覆盖，随主题切换；品牌令牌（primary / accent / success / warning）在两种模式下保持一致。
- `@theme inline` 将变量映射为 Tailwind 工具类，透明度修饰符（如 `bg-primary/10`）由 `color-mix` 计算，无需为暗色模式维护第二套值。
- 暗色模式经 `@custom-variant dark` 基于 `<html class="dark">` 控制；首帧前的内联脚本读取本地存储恢复用户偏好，避免主题闪烁。
- 组件中不允许散落色值，新增颜色必须先进令牌表。

## 4. 路由与内容渲染

- `trailingSlash: 'always'`：全部内部链接以 `/` 结尾，与构建产物目录结构一致。
- 路由由集合驱动：`getStaticPaths()` 从 `getCollection()` 生成；作品 URL 由文件名决定，文档 URL 由「作品目录 / 文档文件名」决定，避免数据与路由漂移。
- Markdown 正文经 `render(entry)` 得到 `<Content />` 组件，包裹在 `.content-body` 中统一排版；标题自动生成 `id` 锚点。
- 状态枚举单一来源：`src/types.ts` 的 `WORK_STATUSES` 同时被 Zod schema 与组件复用。

## 5. 构建与部署

- `npm run build`：`astro build` 生成纯静态产物到 `dist/`（当前 7 个路由 + 404 页）。
- `npm run check`：`@astrojs/check` 全站类型检查，作为变更前的验证门槛。
- Netlify：`netlify.toml` 指定构建命令与产物目录，`NODE_VERSION = 22`；`package.json` 的 `engines` 要求 Node ≥ 22.22，保证本地与构建环境一致。
- 正式域名：`site` 配置为 `https://plvstudio.netlify.app`，canonical / OG 元信息按此生成绝对地址。
- 上线状态：2026-10-24 部署至 Netlify 并发布，站点可访问。

## 6. 已知限制

- **无自动化测试**：测试验收处于试运行阶段，依赖人工验收清单（响应式、链接、无障碍）。
