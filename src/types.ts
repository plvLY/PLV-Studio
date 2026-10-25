// 全站共享类型（单一数据源，消除各组件各自定义 status 枚举导致的不一致）
// 注意：作品与设计文档的内容模型由 src/content.config.ts 的 Zod schema 定义与校验，
// 这里只保留跨模块共享的状态枚举与 TS 侧结构化数据类型。
export const WORK_STATUSES = [
  "planned",
  "in-progress",
  "trial-run",
  "completed",
  "archived",
  "blocked",
] as const;

export type WorkStatus = (typeof WORK_STATUSES)[number];

// 进度阶段状态与作品状态共用同一枚举（progress.ts 中实际使用 planned/in-progress/trial-run/completed）
export type ProgressStatus = WorkStatus;

export interface ProgressEntry {
  stage: string;
  status: ProgressStatus;
  updatedAt: string;
  completedItems: string[];
  currentIssues: string[];
  nextSteps: string[];
}

/** 能力成熟度：已实践 / 探索中 / 专业方向（避免用百分比表达技能熟练度） */
export type SkillMaturity = "practiced" | "exploring" | "professional";

/** 能力证据：站内文档、作品页或经过核验的外部仓库 */
export interface SkillEvidence {
  label: string;
  href: string;
  /** 证据来源说明，例如「站内文档」「外部仓库 · 开发中」 */
  meta?: string;
  external?: boolean;
}

export interface SkillDirection {
  name: string;
  /** 定位标签（可选）：如「核心方向」「探索方向」 */
  note?: string;
  maturity: SkillMaturity;
  /** 一句可核验的实践说明，不写无法证明的成果 */
  summary: string;
  items: string[];
  evidence: SkillEvidence[];
}
