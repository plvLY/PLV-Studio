# PLV Studio

个人技术作品集站点：以作品为中心，完整呈现项目从 0 到 1 的全生命周期（需求、设计、开发、测试、文档与复盘）。

**技术栈**：Astro 7（静态输出，Sätteri Markdown 处理器） + Tailwind CSS v4 + TypeScript · 通过 Netlify 部署

**当前内容**：3 个公开作品（PLV Studio 站点自身、PLV Codeatomy、PLV PermMap）+ 5 份设计文档（需求 / 架构 / UI 设计 / 技术方案）+ 2026-10 起的开发与发布记录。所有内容以实际实现为准，不编造链接、日期与成果。

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
| `/` | 首页 | 品牌主张、Live Stats、按身份分流、精选作品（主案例 + 更多作品横滑）、能力与证据标签页、发布日志式最近更新、六阶段工作流程 |
| `/works/` | 作品列表 | 作品卡片（封面、状态徽标叠图、技术标签、最近更新与详情入口） |
| `/works/{slug}/` | 作品详情 | STAR 叙事、架构速览（有技术方案时）、项目介绍正文、设计文档入口、开发与发布记录、验收与上线、项目信息侧栏 |
| `/works/{slug}/documents/` | 作品文档列表 | 该作品全部设计文档，按开发节点自动排序；没有文档的作品不生成此路由 |
| `/works/{slug}/documents/{doc}/` | 文档阅读页 | 统一正文排版 + 构建期渲染的 Mermaid 图 + 同作品文档导航 |
| `/about/` | 关于 | 技术主线：Java 后端专注 · AI 编程 + 人工审核 · AI 应用集成探索；能力与公开证据 |
| `404` | 未找到 | 静态 404 页 |

## 项目结构

```text
/
├── public/                 # 静态资源（logo.png 站点/作品图标、plv.png 品牌书法 logo、favicon）
│   └── images/works/{slug}/   # 作品封面（cover.svg / cover.png）与正文配图；coverKind 标注是否为真实截图
├── netlify.toml            # Netlify 构建与部署配置（Node 22）
├── src/
│   ├── components/         # Astro 组件（首屏终端框、Live Stats、能力标签页、作品卡、发布日志、STAR 叙事等）
│   ├── content/            # Markdown 内容集合（works 作品、documents/{slug}/ 设计文档）
│   ├── content.config.ts   # 集合 schema（Zod 校验 frontmatter 的单一来源）
│   ├── data/               # TS 结构化数据（progress 开发与发布记录、skills 技术方向）
│   ├── lib/
│   │   ├── documents.ts    # 文档排序（按开发节点）、类型标签与文档地址
│   │   ├── progress.ts     # 最近更新、变更分组、发布状态
│   │   ├── mermaid.ts      # 构建期 Mermaid 子集渲染器（flowchart / erDiagram → 静态 HTML/SVG）
│   │   └── markdown-mermaid.ts  # Sätteri mdast 插件：把 ```mermaid 代码块替换为静态图
│   ├── layouts/            # 全站布局（meta、主题内联脚本、页头页脚）
│   ├── pages/              # 路由页面（见「路由总览」）
│   ├── styles/global.css   # 设计令牌单一数据源（CSS 变量 + Tailwind v4 @theme）
│   └── types.ts            # 共享类型（状态枚举、进度/变更、技能、作品叙事）
└── astro.config.mjs        # Astro 配置（Tailwind v4 经 @tailwindcss/vite 接入，Markdown 使用 Sätteri 处理器）
```

## 内容维护

内容采用**混合方案**：长文走 Markdown 内容集合（构建期 Zod 校验），结构化数据保留 TS 模块。

- **新增作品**：创建 `src/content/works/{slug}.md`——frontmatter 填 title/summary/type/status/cover/coverKind/icon/startedAt/updatedAt/techStack/story 等（完整 schema 见 `src/content.config.ts`，写错构建会直接报错），文件名即 URL slug，正文（Markdown）为项目介绍。`cover` 指向 `public/` 下的封面；`coverKind: "screenshot"` 表示真实运行截图，默认 `cover` 表示设计封面，页面文案据此区分。`story`（痛点 / 方案 / 价值）可选，填写后详情页展示 STAR 叙事。demoUrl/sourceUrl/videoUrl 不存在时留空，页面不会渲染空按钮。
- **新增设计文档**：创建 `src/content/documents/{作品slug}/{文档id}.md`，frontmatter 含 title/type/version/updatedAt/summary；访问路径自动推导为 `/works/{作品slug}/documents/{文档id}/`。`type` 取值 `requirements | architecture | ui | api | test | review`，文档按开发节点顺序自动排列、同类型按 updatedAt 正序（见 `src/lib/documents.ts`），中文类型标签同处维护，无需手动排序。正文中的 Mermaid 代码块会在构建期渲染为静态图（flowchart / erDiagram 子集）。
- **更新开发与发布记录**：编辑 `src/data/progress.ts`，每个阶段状态取值 `planned | in-progress | trial-run | completed | archived | blocked`（与作品状态共用 `types.ts` 的单一枚举）。`changes` 按 `feature / fix / perf / docs / chore` 分类，首页与详情页据此渲染发布日志；只写真实发生的事项。
- **技术方向卡片**：编辑 `src/data/skills.ts`（首页与关于页共用），`note` 为可选定位标签（如「核心方向」「探索方向」），`milestones` 为站内实现脉络，`evidence` 只填写真实存在的站内文档、作品或已核验外部仓库。
- **关于页主线文案**：个人简介、技术主线三卡与编码模式说明直接维护在 `src/pages/about.astro`。

## 设计系统与约定

- 语义色令牌（背景/表面/文字/边框）与品牌色定义在 `src/styles/global.css` 的 CSS 变量中，经 `@theme inline` 映射给 Tailwind；**不要另行硬编码色值**。语义令牌随主题切换，品牌令牌两种模式下保持一致。
- 暗色模式通过 `<html class="dark">` 控制（`@custom-variant dark`），首帧前由 `Layout.astro` 的内联脚本恢复用户偏好，避免闪烁。
- 作品卡片视觉基线：截图内嵌圆角置于卡片上部（与内容区约 1:1）、状态徽标以中性胶囊叠在截图右上角（`WorkStatusBadge` 的 `variant="overlay"`）、技术标签为圆角胶囊、页脚为时钟图标 + 点分日期（`2026.10.23`）+ 查看详情入口。
- 首屏：终端风格作品预览（`.hero-window`，悬停上浮 + 截图微缩放大）+ Live Stats 数据胶囊；数字来自内容集合与进度数据，不手工维护。
- 能力与证据：`CapabilityExplorer` 标签页先展示站内实现脉络，再给出外部证据出口；脚本就绪后才升级为 tabs，无 JS 时是一组锚点链接 + 全部展开的面板。
- 发布日志：`ChangeList` 按新功能 / 修复 / 性能 / 文档 / 工程分组，`ReleaseBadge` 标注 `[Released]` / `[In Progress]` / `[Planned]`。
- 静态图表：Mermaid 在构建期渲染为 HTML/SVG，移动端宽图只在图内横向滚动，不产生整页横向溢出。
- 站点统一使用尾斜杠（`trailingSlash: 'always'`），新增内部链接请以 `/` 结尾。

## 部署

- **已上线**：https://plvstudio.netlify.app （2026-10-24 部署）。
- 站点统计：已接入 Cloudflare Web Analytics（beacon 代码位于 `src/layouts/Layout.astro`，仅生产构建注入）。
- Netlify 构建：`npm run build` → 发布 `dist/`，Node 22（见 `netlify.toml`）。
- `astro.config.mjs` 的 `site` 已配置为正式域名 `https://plvstudio.netlify.app`（影响 canonical / OG 元信息）。
- 作品 frontmatter 的 `demoUrl` / `sourceUrl` / `videoUrl` 存在时，详情页自动展示对应入口；不存在则不渲染空按钮。
