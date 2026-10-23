// 全站共享类型（单一数据源，消除各组件各自定义 status 枚举导致的不一致）
// 注意：作品与设计文档的内容模型由 src/content.config.ts 的 Zod schema 定义与校验，
// 这里只保留跨模块共享的状态枚举与 TS 侧结构化数据类型。
export const WORK_STATUSES = [
  "planned",
  "in-progress",
  "completed",
  "archived",
  "blocked",
] as const;

export type WorkStatus = (typeof WORK_STATUSES)[number];

// 进度阶段状态与作品状态共用同一枚举（progress.ts 中实际使用 planned/in-progress/completed）
export type ProgressStatus = WorkStatus;

export interface ProgressEntry {
  stage: string;
  status: ProgressStatus;
  updatedAt: string;
  completedItems: string[];
  currentIssues: string[];
  nextSteps: string[];
}

export interface SkillDirection {
  name: string;
  /** 定位标签（可选）：如"核心方向""探索方向"，用于突出技术主线 */
  note?: string;
  items: string[];
  /** 关联的真实作品 slug（可选）；填写时必须在 src/content/works/ 中存在同名作品文件 */
  workSlug?: string;
}
