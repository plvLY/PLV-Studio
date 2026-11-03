import type { WorkStatus } from "../types";

// 作品类型 → 中文展示标签（作品列表、详情页、首页主作品卡共用）
export const WORK_TYPE_LABELS: Record<string, string> = {
  "ai-application": "AI 应用",
  "developer-tool": "开发者工具",
  "data-visualization": "数据可视化",
  "tech-experiment": "技术实验",
};

/** 未知类型回退为原始值，不隐藏信息 */
export function workTypeLabel(type: string): string {
  return WORK_TYPE_LABELS[type] ?? type;
}

const STATUS_LABELS: Record<WorkStatus, string> = {
  planned: "规划中",
  "in-progress": "开发中",
  "trial-run": "试运行",
  completed: "已完成",
  archived: "已归档",
  blocked: "受阻",
};

/**
 * 首页/作品卡上的对外状态文案。
 * 仅当作品已完成且存在可访问的演示地址时显示「已上线」，
 * 避免把配置了链接但尚未完成的作品误标为上线。
 */
export function publicStatusLabel(status: WorkStatus, demoUrl = ""): string {
  if (status === "completed" && demoUrl) return "已上线";
  return STATUS_LABELS[status] ?? "未知";
}

/** 封面来源标签：设计封面不能被写成「真实运行截图」 */
export function coverAlt(title: string, coverKind = "cover"): string {
  return coverKind === "screenshot" ? `${title} 首页运行截图` : `${title} 项目封面`;
}

export function coverCaption(coverKind = "cover"): string {
  return coverKind === "screenshot" ? "真实运行截图 · 首页" : "项目封面";
}
