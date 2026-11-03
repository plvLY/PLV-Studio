import type { SkillDirection } from "../types";

// 技术主线（首页「能力与证据」与关于页「能力与公开证据」共用，避免两处重复维护）：
// - 只写可被站内文档/作品或已核验的外部仓库支撑的内容；
// - maturity 区分「已实践 / 探索中 / 专业方向」，不使用技能百分比；
// - milestones 是「站内深度」：把能力展开成可读的实现脉络，访客不必先跳外链；
// - 外部仓库均已核验，并明确标注「外部证据 / 非本站作品」。
export const skillDirections: SkillDirection[] = [
  {
    name: "后端工程",
    note: "核心方向",
    maturity: "professional",
    summary:
      "以 Java 21 + Spring Boot 3.x 为主的后端工程方向。站内已有 PLV PermMap（权限核心）与 PLV Codeatomy（代码分析）两个正在建设的作品，代码与设计文档均可追溯。",
    items: ["Java 21", "Spring Boot 3.x", "Spring Security", "API 设计", "领域建模"],
    milestones: [
      {
        title: "分层与边界",
        detail:
          "PermMap 采用 core / application / infrastructure 分层，权限核心不依赖具体数据库、前端框架或业务用户表。",
      },
      {
        title: "授权即安全边界",
        detail:
          "Spring Security 作为统一授权入口；API 资源按 HTTP 方法 + 路径模式匹配，前端隐藏菜单不能代替服务端校验。",
      },
      {
        title: "代码结构与依赖",
        detail:
          "Codeatomy 用 Spoon 建立带类型的 Java 模型，解析 Maven 多模块与 classpath，把类型、Bean、入口与调用边写入索引。",
      },
      {
        title: "本地交付形态",
        detail:
          "Maven 多模块 + thin jar：本地零基础设施运行，不要求 Docker、数据库服务或网络账号。",
      },
    ],
    evidence: [
      {
        label: "PLV PermMap",
        meta: "站内作品 · 权限核心与 Starter",
        href: "/works/permmap/",
      },
      {
        label: "PLV Codeatomy",
        meta: "站内作品 · Java 代码分析",
        href: "/works/codeatomy/",
      },
      {
        label: "Agentic Dashboard",
        meta: "外部仓库 · Java / Spring Boot",
        href: "https://gitee.com/plv-coding/agentic-dashboard",
        external: true,
      },
    ],
  },
  {
    name: "前端工程",
    note: "AI 编程 + 人工审核",
    maturity: "practiced",
    summary:
      "本站的界面、设计令牌与响应式适配由 Astro + Tailwind CSS v4 实现，采用 AI 辅助生成、人工审核的编码方式。",
    items: ["Astro", "Tailwind CSS v4", "TypeScript", "AI 辅助编码", "人工审核"],
    milestones: [
      {
        title: "设计令牌单一数据源",
        detail:
          "语义色板以 RGB 三元组存进 CSS 变量，经 @theme inline 映射为工具类；浅色与暗色共用一套类名。",
      },
      {
        title: "响应式与无障碍",
        detail:
          "覆盖 360px 起的视口；跳过链接、键盘可操作导航、状态不只靠颜色表达，reduced-motion 下关闭动效。",
      },
      {
        title: "零客户端框架",
        detail:
          "Astro 静态生成，站点自有脚本只有主题切换、移动导航与能力标签页；禁用 JS 时正文与文档仍可完整阅读。",
      },
      {
        title: "构建期校验",
        detail:
          "内容集合由 Zod 在构建期校验，astro check 类型检查与生产构建是每次变更的门槛。",
      },
    ],
    evidence: [
      {
        label: "PLV Studio 作品档案",
        meta: "本站",
        href: "/works/plv-studio/",
      },
      {
        label: "UI 设计文档",
        meta: "本站文档",
        href: "/works/plv-studio/documents/ui-design/",
      },
      {
        label: "技术架构",
        meta: "本站文档 · 分层与渲染",
        href: "/works/plv-studio/documents/architecture/",
      },
      {
        label: "源码仓库",
        meta: "GitHub",
        href: "https://github.com/plvLY/PLV-Studio",
        external: true,
      },
    ],
  },
  {
    name: "AI 应用集成",
    note: "探索方向",
    maturity: "exploring",
    summary:
      "围绕模型 API 接入、上游服务适配与统一错误处理持续探索。Codeatomy 的 MCP Server 是站内可核查的集成产物；外部网关仓库仍在迭代，尚未收录为作品。",
    items: ["MCP Server", "模型 API 接入", "上下文裁剪", "异常处理"],
    milestones: [
      {
        title: "MCP 接入",
        detail:
          "Codeatomy 基于 MCP SDK 以 stdio 传输暴露 flow / impact 查询，供 Claude Code、Cursor 等工具调用。",
      },
      {
        title: "上下文包",
        detail:
          "按 token 预算裁剪 Markdown 证据集合，优先保留能回到 file:line 的内容，而不是整段源码。",
      },
      {
        title: "网关探索",
        detail:
          "PLV AI Hub 仍在迭代：模型 API 接入、上游服务适配与统一错误处理；未纳入本站作品前不标为已完成能力。",
      },
    ],
    evidence: [
      {
        label: "Codeatomy 技术方案",
        meta: "站内文档 · MCP 与查询",
        href: "/works/codeatomy/documents/technical-spec/",
      },
      {
        label: "PLV AI Hub",
        meta: "外部仓库 · AI 网关探索",
        href: "https://gitee.com/plv-coding/plv-ai-hub",
        external: true,
      },
      {
        label: "Agentic Dashboard",
        meta: "外部仓库 · LangChain4j",
        href: "https://gitee.com/plv-coding/agentic-dashboard",
        external: true,
      },
    ],
  },
  {
    name: "工程实践",
    note: "全生命周期",
    maturity: "practiced",
    summary:
      "在本站与 Codeatomy 完整走过需求、设计、架构、实现、测试验收与发布，阶段记录、设计取舍与验收事项均可在站内追溯。",
    items: ["需求分析", "架构设计", "进度记录", "测试验收", "部署与排查"],
    milestones: [
      {
        title: "先写需求与验收",
        detail:
          "需求文档先定义目标、边界与可验证的验收标准，再进入实现；验收标准不事后补写。",
      },
      {
        title: "架构取舍留痕",
        detail:
          "技术选型与关键取舍写进架构文档：为什么纯静态、为什么不用 MDX、为什么自研图表渲染。",
      },
      {
        title: "阶段可追溯",
        detail:
          "每个开发阶段记录完成事项、当前问题与下一步，状态按真实进度更新，规划不写成已完成。",
      },
      {
        title: "验收后发布",
        detail:
          "按响应式、无障碍、链接与静态资源清单验收，发布结果写回开发进度，形成发布日志。",
      },
    ],
    evidence: [
      {
        label: "需求分析",
        meta: "Codeatomy 文档",
        href: "/works/codeatomy/documents/requirements/",
      },
      {
        label: "技术架构",
        meta: "站点架构文档",
        href: "/works/plv-studio/documents/architecture/",
      },
      {
        label: "开发与验收记录",
        meta: "发布日志",
        href: "/works/plv-studio/#progress",
      },
    ],
  },
];
