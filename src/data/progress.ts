// 进度内容模型（参考需求文档 9.4 进度模型）
// 状态枚举与 src/types.ts 保持一致：planned | in-progress | completed | archived | blocked
import type { ProgressEntry } from "../types";

export const progress: Record<string, ProgressEntry[]> = {
  "plv-studio": [
    { stage: "需求分析", status: "completed", updatedAt: "2026-10-01", completedItems: ["确定站点定位与内容模型"], currentIssues: [], nextSteps: ["进入技术架构"] },
    { stage: "技术架构", status: "completed", updatedAt: "2026-10-01", completedItems: ["Astro + Tailwind 方案选型"], currentIssues: [], nextSteps: ["开发实现"] },
    {
      stage: "开发实现",
      status: "completed",
      updatedAt: "2026-10-24",
      completedItems: [
        "首页、作品列表、作品详情与文档阅读页",
        "设计令牌系统与暗色模式（首帧无闪烁切换）",
        "Tailwind v4 迁移与 TypeScript 类型检查接入（astro check 零错误）",
        "canonical/OG 元信息、404 页与基础无障碍支持（跳过链接、键盘导航、reduced-motion）",
      ],
      currentIssues: [],
      nextSteps: ["试运行与测试验收"],
    },
    {
      stage: "测试验收",
      status: "in-progress",
      updatedAt: "2026-10-24",
      completedItems: [],
      currentIssues: [],
      nextSteps: ["多尺寸响应式与无障碍验收", "全部路由、外链与静态资源检查"],
    },
    {
      stage: "发布部署",
      status: "completed",
      updatedAt: "2026-10-24",
      completedItems: ["Netlify 上线发布：https://plvstudio.netlify.app"],
      currentIssues: [],
      nextSteps: [],
    },
  ],
};
