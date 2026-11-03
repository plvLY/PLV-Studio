import type {
  ChangeKind,
  ProgressChange,
  ProgressEntry,
  ProgressStatus,
} from "../types";

export interface ProgressWorkRef {
  slug: string;
  title: string;
  published: boolean;
}

export interface RecentProgressItem extends ProgressEntry {
  workSlug: string;
  workTitle: string;
}

/**
 * 首页「最近更新」数据：
 * - 只取已发布作品的进度记录；
 * - 只保留真正有变更（changes / completedItems）的阶段，规划中的空阶段不占首页；
 * - 按日期倒序；同一天内按原数据顺序倒序，保证更靠后的阶段优先；
 * - 不做「每个作品只取一条」的聚合，避免把多条真实更新压缩成一条。
 */
export function getRecentProgress(
  progress: Record<string, ProgressEntry[]>,
  works: ProgressWorkRef[],
  limit = 3,
): RecentProgressItem[] {
  const published = new Map(
    works.filter((work) => work.published).map((work) => [work.slug, work]),
  );

  return Object.entries(progress)
    .flatMap(([slug, entries]) =>
      entries.map((entry, index) => ({ slug, entry, index })),
    )
    .filter(({ slug }) => published.has(slug))
    .filter(({ entry }) => entryChanges(entry).length > 0)
    .sort(
      (a, b) =>
        b.entry.updatedAt.localeCompare(a.entry.updatedAt) || b.index - a.index,
    )
    .slice(0, limit)
    .map(({ slug, entry }) => ({
      ...entry,
      workSlug: slug,
      workTitle: published.get(slug)!.title,
    }));
}

/** 发布日志的变更分类：文字 + 符号 + 语义色（颜色不能是唯一信息） */
export interface ChangeKindMeta {
  label: string;
  emoji: string;
  /** 语义色标记，组件负责映射到具体 class */
  tone: "feature" | "fix" | "perf" | "docs" | "chore";
}

export const CHANGE_KIND_META: Record<ChangeKind, ChangeKindMeta> = {
  feature: { label: "新功能", emoji: "✨", tone: "feature" },
  fix: { label: "修复", emoji: "🐛", tone: "fix" },
  perf: { label: "性能", emoji: "⚡", tone: "perf" },
  docs: { label: "文档", emoji: "📝", tone: "docs" },
  chore: { label: "工程", emoji: "🔧", tone: "chore" },
};

export const CHANGE_KIND_ORDER: ChangeKind[] = [
  "feature",
  "fix",
  "perf",
  "docs",
  "chore",
];

/**
 * 统一读取一个阶段的变更项。
 * 新数据用 changes；旧数据（只有 completedItems）按「工程」归类，不丢内容。
 */
export function entryChanges(entry: ProgressEntry): ProgressChange[] {
  if (entry.changes && entry.changes.length > 0) return entry.changes;
  return (entry.completedItems ?? []).map((text) => ({ kind: "chore", text }));
}

export interface ChangeGroup {
  kind: ChangeKind;
  meta: ChangeKindMeta;
  items: string[];
}

/** 按类型分组（新功能 → 修复 → 性能 → 文档 → 工程），组内保持原始顺序 */
export function groupChanges(changes: ProgressChange[]): ChangeGroup[] {
  return CHANGE_KIND_ORDER.map((kind) => ({
    kind,
    meta: CHANGE_KIND_META[kind],
    items: changes.filter((change) => change.kind === kind).map((change) => change.text),
  })).filter((group) => group.items.length > 0);
}

/** 发布日志状态：把进度状态翻译成「发布」语境下的标签 */
export interface ReleaseStateMeta {
  label: string;
  english: string;
  tone: "released" | "trial" | "progress" | "planned" | "blocked" | "archived";
}

const RELEASE_STATES: Record<ProgressStatus, ReleaseStateMeta> = {
  completed: { label: "已发布", english: "Released", tone: "released" },
  "trial-run": { label: "试运行", english: "Trial Run", tone: "trial" },
  "in-progress": { label: "进行中", english: "In Progress", tone: "progress" },
  planned: { label: "计划中", english: "Planned", tone: "planned" },
  blocked: { label: "受阻", english: "Blocked", tone: "blocked" },
  archived: { label: "已归档", english: "Archived", tone: "archived" },
};

export function releaseState(status: ProgressStatus): ReleaseStateMeta {
  return RELEASE_STATES[status] ?? RELEASE_STATES.planned;
}
