---
title: "PLV Studio"
summary: "个人技术作品集站点，以作品为中心完整呈现项目目标、设计文档、开发进度与技术实现，坚持静态站点与真实内容原则。"
type: "developer-tool"
status: "completed"
cover: "/images/works/plv-studio/cover.png"
coverKind: "screenshot"
icon: "/logo.png"
startedAt: "2026-10-01"
updatedAt: "2026-11-04"
techStack: ["Astro", "Tailwind CSS v4", "TypeScript", "Netlify"]
published: true
featured: true
demoUrl: "https://plvstudio.netlify.app"
sourceUrl: "https://github.com/plvLY/PLV-Studio"
videoUrl: ""
story:
  pain: "项目资料散落在博客、笔记与本地文档里，访客只能看到零散截图，看不到一个项目是怎么被做出来的。"
  solution: "以作品为中心组织内容：需求文档、架构与 UI 设计、开发进度与验收记录共用一套内容模型；纯静态构建，链接不到的内容不展示。"
  value: "访客可以沿「需求 → 设计 → 进度 → 验收」走完整条链路，每个结论都能点回原始文档。"
---

## 1. 项目背景

个人项目资料此前分散在博客、笔记与本地文档中，难以形成连续、可展示的项目档案。PLV Studio 以作品为中心，把每个项目的目标、设计文档、开发进度和阶段产物组织成可持续维护的内容体系。

## 2. 核心目标

- 建立统一的视觉系统（Editorial Tech Portfolio 方向：克制、专业、以真实内容为视觉中心）
- 完整呈现项目生命周期：需求、设计、开发进度、文档与阶段产物
- 保持纯静态站点路线：Astro 静态生成 + Netlify 部署，不引入后端与数据库

## 3. 已实现功能

- 首页：Live Stats 数据胶囊、终端风格作品预览、按身份分流入口、精选作品（主案例 + 横向作品带）、能力与证据标签页、发布日志式开发记录，以及带真实实例链接的六阶段流程
- 作品列表与详情：状态徽标、技术栈标签、项目事实、设计文档入口、开发进度时间线、验收与上线记录、外部入口；详情页提供桌面与移动端目录
- 文档系统：文档列表按开发节点排序；阅读页提供桌面固定目录、移动端可展开目录、上一篇/下一篇与同作品文档导航
- 设计令牌体系：CSS 变量单一数据源，浅色/暗色主题一键切换且无首帧闪烁，文字与状态颜色按 WCAG AA 校准
- 基础 SEO 与无障碍：页面级 title/description/canonical/OG、sitemap.xml、robots.txt、404 noindex、跳过链接、键盘可操作导航、reduced-motion 支持

## 4. 技术实现

- Astro 7 静态生成：全站零客户端框架，自有脚本仅主题切换、移动菜单与能力标签页三段原生 JS；站点统计接入 Cloudflare Web Analytics
- Tailwind CSS v4：经 @tailwindcss/vite 接入，设计令牌映射到 CSS 变量，透明度修饰符由 color-mix 支持
- TypeScript：共享类型定义（状态枚举、进度模型、能力证据、发布日志），astro check 类型检查零错误
- 内容与样式分离：作品与文档为 Markdown 文件（Content Collections + Zod 构建期校验），进度与技术方向为 TS 数据模块
- 静态图表：文档中的 Mermaid 代码块由 Sätteri mdast 插件在构建期渲染为静态 SVG，不引入客户端图表库
- 静态 SEO：sitemap.xml 由静态端点按作品/文档集合生成，robots.txt 指向 sitemap；页面 canonical 与 OG 图片使用站点正式域名

## 5. 当前状态与限制

站点建设完毕：2026-10-24 经 Netlify 部署至 https://plvstudio.netlify.app 上线，随后完成多尺寸响应式与无障碍验收、全部路由与静态资源检查，试运行于 2026-10-25 结束，目前处于正式运行状态。2026-10-25 完成全站信息层级、能力证据、文档阅读、SEO 与可访问性集中优化，astro check 零错误且生产构建通过。2026-11-04 完成视觉与信息架构升级：首屏 Live Stats 与终端风格预览、访客分流、能力标签页、作品 STAR 叙事、发布日志与构建期静态架构图。作品介绍附真实运行截图，详情提供在线演示与源码入口；外部链接不存在时不显示空按钮。当前没有自动化测试，验收依赖人工清单（类型检查、构建、多尺寸响应式、axe 可访问性检查、链接与静态资源检查）。后续以内容维护与小幅迭代为主。

## 6. 阶段产物

以下为 2026-10-25 全站优化后重新拍摄的真实运行截图（浅色主题，本地生产构建预览），非设计稿或合成图：

**首页**

![首页运行截图](/images/works/plv-studio/cover.png)

**作品详情页**

![作品详情页运行截图](/images/works/plv-studio/detail.svg)
