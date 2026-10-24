---
title: "PLV Studio"
summary: "个人技术作品集站点，以作品为中心完整呈现项目目标、设计文档、开发进度与技术实现，坚持静态站点与真实内容原则。"
type: "developer-tool"
status: "in-progress"
cover: "/images/works/plv-studio/cover.png"
icon: "/logo.png"
startedAt: "2026-10-01"
updatedAt: "2026-10-24"
techStack: ["Astro", "Tailwind CSS v4", "TypeScript", "Netlify"]
published: true
featured: true
demoUrl: "https://plvstudio.netlify.app"
sourceUrl: ""
videoUrl: ""
---

## 1. 项目背景

个人项目资料此前分散在博客、笔记与本地文档中，难以形成连续、可展示的项目档案。PLV Studio 以作品为中心，把每个项目的目标、设计文档、开发进度和阶段产物组织成可持续维护的内容体系。

## 2. 核心目标

- 建立统一的视觉系统（Editorial Tech Portfolio 方向：克制、专业、以真实内容为视觉中心）
- 完整呈现项目生命周期：需求、设计、开发进度、文档与阶段产物
- 保持纯静态站点路线：Astro 静态生成 + Netlify 部署，不引入后端与数据库

## 3. 已实现功能

- 首页：定位介绍、精选作品、技术能力（关联真实作品）、最近开发进度
- 作品列表与详情：状态徽标、技术栈标签、设计文档入口、开发进度时间线、项目信息侧栏
- 文档系统：文档列表页与长文阅读页，统一正文排版与同作品文档导航
- 设计令牌体系：CSS 变量单一数据源，浅色/暗色主题一键切换且无首帧闪烁
- 基础 SEO 与无障碍：canonical/OG 元信息、404 页、跳过链接、键盘可操作导航、reduced-motion 支持

## 4. 技术实现

- Astro 7 静态生成：全站零客户端框架，自有脚本仅主题切换与移动菜单两段原生 JS；站点统计接入 Cloudflare Web Analytics
- Tailwind CSS v4：经 @tailwindcss/vite 接入，设计令牌映射到 CSS 变量，透明度修饰符由 color-mix 支持
- TypeScript：共享类型定义（状态枚举与进度模型），astro check 类型检查零错误
- 内容与样式分离：作品与文档为 Markdown 文件（Content Collections + Zod 构建期校验），进度与技术方向为 TS 数据模块

## 5. 当前状态与限制

站点已上线，当前处于试运行测试阶段：核心页面与视觉系统完成，2026-10-24 经 Netlify 部署至 https://plvstudio.netlify.app 并进入测试验收。作品介绍附真实运行截图，详情提供在线演示入口；外部链接不存在时不显示空按钮。

## 6. 阶段产物

以下为站点真实运行截图（2026-10-23 拍摄，浅色主题，本地预览环境），非设计稿或合成图：

**首页**

![首页运行截图](/images/works/plv-studio/cover.png)

**作品详情页**

![作品详情页运行截图](/images/works/plv-studio/detail.png)
