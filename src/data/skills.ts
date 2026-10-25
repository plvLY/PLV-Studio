import type { SkillDirection } from "../types";

// 技术主线（首页「能力与证据」与关于页「能力与公开证据」共用，避免两处重复维护）：
// - 只写可被站内文档/作品或已核验的外部仓库支撑的内容；
// - maturity 区分「已实践 / 探索中 / 专业方向」，不使用技能百分比；
// - 外部仓库均已在公开平台核验（2026-10-25），并明确标注「非本站作品」。
export const skillDirections: SkillDirection[] = [
  {
    name: "后端工程",
    note: "核心方向",
    maturity: "professional",
    summary:
      "以 Java 系列为主的后端工程方向。公开代码证据来自外部项目仓库，本站暂未收录可公开的后端作品档案。",
    items: ["Java", "Spring Boot", "API 设计", "领域建模"],
    evidence: [
      {
        label: "Agentic Dashboard",
        meta: "外部仓库 · Java / Spring Boot",
        href: "https://gitee.com/plv-coding/agentic-dashboard",
        external: true,
      },
      {
        label: "技术主线说明",
        meta: "关于页",
        href: "/about/#capabilities",
      },
    ],
  },
  {
    name: "前端工程",
    note: "AI 编程 + 人工审核",
    maturity: "practiced",
    summary:
      "本站的界面、设计令牌与响应式适配由 Astro + Tailwind CSS v4 实现，采用 AI 辅助生成、人工审核的编码方式。",
    items: ["Astro", "Tailwind CSS", "AI 辅助编码", "代码人工审核"],
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
      "围绕模型 API、上游服务适配与统一错误处理持续探索。外部仓库仍在迭代，尚未纳入本站公开作品。",
    items: ["模型 API 接入", "上游服务适配", "异常处理", "应用集成"],
    evidence: [
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
      "在本站完整走过需求、设计、架构、实现、测试验收与发布，阶段记录、设计取舍与验收事项均可在站内追溯。",
    items: ["需求分析", "架构设计", "测试验收", "部署与问题排查"],
    evidence: [
      {
        label: "需求分析",
        meta: "本站文档",
        href: "/works/plv-studio/documents/requirements/",
      },
      {
        label: "技术架构",
        meta: "本站文档",
        href: "/works/plv-studio/documents/architecture/",
      },
      {
        label: "开发与验收记录",
        meta: "进度时间线",
        href: "/works/plv-studio/#progress",
      },
    ],
  },
];
