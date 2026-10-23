// 设计文档排序：按开发节点（生命周期）顺序
// 类型体系 requirements → architecture → ui → api → test → review 本身即项目阶段序列，
// 新文档只要 frontmatter 的 type 填对即可自动落位，无需手动维护顺序字段。
// 时间信息（版本 · 更新日期）在卡片上展示，不驱动排版主序。
const DOC_TYPE_ORDER: Record<string, number> = {
  requirements: 1,
  architecture: 2,
  ui: 3,
  api: 4,
  test: 5,
  review: 6,
};

/** 未知类型排在已知类型之后 */
const FALLBACK_ORDER = 99;

export interface DocumentSortable {
  type: string;
  updatedAt: string;
}

/**
 * 返回按开发节点顺序排序的新数组（不修改入参）。
 * 同类型按 updatedAt 正序（原版在前、修订版在后），引擎的稳定排序保证其余情况保持相对顺序。
 */
export function sortByLifecycle<T extends DocumentSortable>(docs: T[]): T[] {
  return [...docs].sort((a, b) => {
    const orderA = DOC_TYPE_ORDER[a.type] ?? FALLBACK_ORDER;
    const orderB = DOC_TYPE_ORDER[b.type] ?? FALLBACK_ORDER;
    if (orderA !== orderB) return orderA - orderB;
    if (a.updatedAt !== b.updatedAt) return a.updatedAt < b.updatedAt ? -1 : 1;
    return 0;
  });
}

// 文档类型 → 中文展示标签（与排序映射同处维护，单一来源）
// UI / API 为通用专有名词，保留原文，其余尽量使用中文
export const DOC_TYPE_LABELS: Record<string, string> = {
  requirements: "需求",
  architecture: "架构",
  ui: "UI 设计",
  api: "API 文档",
  test: "测试",
  review: "复盘",
};

/** 未知类型回退为原始值，不隐藏信息 */
export function docTypeLabel(type: string): string {
  return DOC_TYPE_LABELS[type] ?? type;
}
