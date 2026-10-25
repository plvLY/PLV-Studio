import type { ProgressEntry } from "../types";

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
 * 首页「最近开发记录」数据：
 * - 只取已发布作品的进度记录；
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
