import type { SkillDirection } from "../types";

// 技术主线（首页"个人技术实力"与关于页"技术方向"共用，避免两处重复维护）：
// 全栈开发 · Java 系列 · 后端工程专注 · 前端 AI 编程+人工审核 · 持续探索 AI 应用集成
// 前端工具只列本站可证实的技术（Astro / Tailwind），编码模式单列一条
// workSlug 仅在存在真实对应作品时填写；无对应作品时不显示"查看关联作品"入口
export const skillDirections: SkillDirection[] = [
  {
    name: "后端工程",
    note: "核心方向",
    items: ["Java", "Spring Boot", "API 设计", "领域建模"],
  },
  {
    name: "前端工程",
    note: "AI 编程 + 人工审核",
    items: ["Astro", "Tailwind CSS", "AI 辅助编码", "代码人工审核"],
    workSlug: "plv-studio",
  },
  {
    name: "AI 应用集成",
    note: "探索方向",
    items: ["模型 API 接入", "上游服务适配", "异常处理", "应用集成"],
  },
  {
    name: "工程实践",
    note: "全生命周期",
    items: ["需求分析", "架构设计", "测试验收", "部署与问题排查"],
    workSlug: "plv-studio",
  },
];
