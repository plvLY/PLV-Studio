import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";
import { WORK_STATUSES, type WorkStatus } from "./types";

// 状态枚举复用 types.ts 的单一来源
const workStatuses = [...WORK_STATUSES] as [WorkStatus, ...WorkStatus[]];

// 统一的日期格式校验：YYYY-MM-DD 字符串（与 progress.ts 的日期格式保持一致）
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式必须为 YYYY-MM-DD");

// 作品集合：src/content/works/*.md，文件名即 slug
const works = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/works" }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    type: z.string(),
    status: z.enum(workStatuses),
    cover: z.string().default(""),
    /** 封面来源：真实运行截图 或 设计封面（首页/卡片文案据此区分，避免把设计稿写成截图） */
    coverKind: z.enum(["screenshot", "cover"]).default("cover"),
    icon: z.string().default(""),
    startedAt: isoDate,
    updatedAt: isoDate,
    techStack: z.array(z.string()),
    published: z.boolean().default(true),
    featured: z.boolean().default(false),
    demoUrl: z.string().default(""),
    sourceUrl: z.string().default(""),
    videoUrl: z.string().default(""),
    // 作品叙事（STAR）：痛点 → 方案 → 价值；只写能与文档/代码对应的事实
    story: z
      .object({
        pain: z.string(),
        solution: z.string(),
        value: z.string(),
      })
      .optional(),
  }),
});

// 设计文档集合：src/content/documents/{作品slug}/{文档id}.md
const documents = defineCollection({
  loader: glob({ pattern: "*/*.md", base: "./src/content/documents" }),
  schema: z.object({
    title: z.string(),
    type: z.string(),
    version: z.string(),
    updatedAt: isoDate,
    summary: z.string(),
  }),
});

export const collections = { works, documents };
