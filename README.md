# PLV Studio

个人技术作品集站点：以作品为中心，完整呈现项目从 0 到 1 的全生命周期（需求、设计、开发、测试、文档与复盘）。

**技术栈**：Astro（静态输出） + Tailwind CSS v4 + TypeScript · 通过 Netlify 部署

**当前内容**：1 个真实作品（站点自身，自举记录）+ 3 份设计文档（需求 / 架构 / UI 设计）+ 2026-10 起的开发时间线。所有内容以实际实现为准，不编造链接、日期与成果。

## 常用命令

| 命令 | 说明 |
| :-- | :-- |
| `npm install` | 安装依赖 |
| `npm run dev` | 启动开发服务器（`localhost:4321`） |
| `npm run build` | 构建生产站点至 `./dist/` |
| `npm run preview` | 本地预览构建产物 |
| `npm run check` | 运行 Astro 类型检查 |

> Node 版本要求：>= 22.22（见 `package.json` 的 `engines` 与 `.nvmrc`）。

## 路由总览

| 路由 | 页面 | 说明 |
| :-- | :-- | :-- |
| `/` | 首页 | 品牌主张、站点速览（实时统计）、精选作品、技术实力、最近进度、开发理念 |
| `/works/` | 作品列表 | 作品卡片（内嵌圆角截图、状态徽标叠图、胶囊标签、时钟页脚） |
| `/works/{slug}/` | 作品详情 | 项目介绍正文、设计文档入口、开发进度时间线、项目信息侧栏 |
| `/works/{slug}/documents/` | 作品文档列表 | 该作品全部设计文档，按开发节点自动排序 |
| `/works/{slug}/documents/{doc}/` | 文档阅读页 | 统一正文排版 + 同作品文档导航 |
| `/about/` | 关于 | 技术主线：Java 后端专注 · AI 编程 + 人力审核 · AI 应用集成探索 |
| `404` | 未找到 | 静态 404 页 |

## 项目结构

```text
/
├── public/                 # 静态资源（logo.png 站点/作品图标、plv.png 品牌书法 logo、favicon）
│   └── images/works/{slug}/   # 作品真实截图（cover.png 16:9 封面、detail.png 等正文配图）
├── netlify.toml            # Netlify 构建与部署配置（Node 22）
├── src/
│   ├── components/         # Astro 组件（页头页脚、作品卡、状态徽标、时间线、文档卡等）
│   ├── content/            # Markdown 内容集合（works 作品、documents/{slug}/ 设计文档）
│   ├── content.config.ts   # 集合 schema（Zod 校验 frontmatter 的单一来源）
│   ├── data/               # TS 结构化数据（progress 开发进度、skills 技术方向）
│   ├── lib/documents.ts    # 文档排序（按开发节点）与中文类型标签
│   ├── layouts/            # 全站布局（meta、主题内联脚本、页头页脚）
│   ├── pages/              # 路由页面（见「路由总览」）
│   ├── styles/global.css   # 设计令牌单一数据源（CSS 变量 + Tailwind v4 @theme）
│   └── types.ts            # 共享类型（状态枚举、进度与技能数据类型）
└── astro.config.mjs        # Astro 配置（Tailwind v4 经 @tailwindcss/vite 接入）
```

## 内容维护

内容采用**混合方案**：长文走 Markdown 内容集合（构建期 Zod 校验），结构化数据保留 TS 模块。

- **新增作品**：创建 `src/content/works/{slug}.md`——frontmatter 填 title/summary/type/status/cover/icon/startedAt/updatedAt/techStack 等（完整 schema 见 `src/content.config.ts`，写错构建会直接报错），文件名即 URL slug，正文（Markdown）为项目介绍。封面 `cover` 指向 `public/` 下的**真实截图**（`cover.png`，16:9 居中裁切），可选 `icon` 为卡片/详情页小图标；demoUrl/sourceUrl/videoUrl 不存在时留空，页面不会渲染空按钮。
- **新增设计文档**：创建 `src/content/documents/{作品slug}/{文档id}.md`，frontmatter 含 title/type/version/updatedAt/summary；访问路径自动推导为 `/works/{作品slug}/documents/{文档id}/`。`type` 取值 `requirements | architecture | ui | api | test | review`，文档按开发节点顺序自动排列、同类型按 updatedAt 正序（见 `src/lib/documents.ts`），中文类型标签同处维护，无需手动排序。
- **更新开发进度**：编辑 `src/data/progress.ts`，每个阶段状态取值 `planned | in-progress | completed | archived | blocked`（与作品状态共用 `types.ts` 的单一枚举）。
- **技术方向卡片**：编辑 `src/data/skills.ts`（首页与关于页共用），`note` 为可选定位标签（如"核心方向""探索方向"）；`workSlug` 仅在 `src/content/works/` 存在对应作品时填写。
- **关于页主线文案**：个人简介、技术主线三卡与编码模式说明直接维护在 `src/pages/about.astro`。

## 设计系统与约定

- 语义色令牌（背景/表面/文字/边框）与品牌色定义在 `src/styles/global.css` 的 CSS 变量中，经 `@theme inline` 映射给 Tailwind；**不要另行硬编码色值**。语义令牌随主题切换，品牌令牌两种模式下保持一致。
- 暗色模式通过 `<html class="dark">` 控制（`@custom-variant dark`），首帧前由 `Layout.astro` 的内联脚本恢复用户偏好，避免闪烁。
- 作品卡片视觉基线：截图内嵌圆角置于卡片上部（与内容区约 1:1）、状态徽标以中性胶囊叠在截图右上角（`WorkStatusBadge` 的 `variant="overlay"`）、技术标签为圆角胶囊、页脚为时钟图标 + 点分日期（`2026.10.23`）+ 查看详情入口。
- 站点统一使用尾斜杠（`trailingSlash: 'always'`），新增内部链接请以 `/` 结尾。

## 部署

- **已上线**：https://plvstudio.netlify.app （2026-10-24 部署）。
- Netlify 构建：`npm run build` → 发布 `dist/`，Node 22（见 `netlify.toml`）。
- `astro.config.mjs` 的 `site` 已配置为正式域名 `https://plvstudio.netlify.app`（影响 canonical / OG 元信息）。
- 作品 frontmatter 的 `demoUrl` / `sourceUrl` / `videoUrl` 存在时，详情页自动展示对应入口；不存在则不渲染空按钮。
