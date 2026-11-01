# PLV Studio 优化方案

> 审计时间：2026-10-29  
> 审计对象：`plv-studio`（Astro 7 + Tailwind CSS v4 + TypeScript，Netlify 静态部署）  
> 审计方法：源码审查 + `npm run check` / `npm run build` + 生产产物 Lighthouse 移动端实测 + 线上响应头 + `sharp` 图片重编码估算 + 未发布内容构建实验。  
> 本文只给方案，不直接改代码；第 3 节按优先级给出建议执行顺序。

## 0. 执行摘要

站点的基础质量已经高于多数个人作品集：纯静态、零客户端框架、类型检查 0 错误、A11y / SEO 100、CLS 0、依赖无已知漏洞。**不需要重写，也不建议引入 React/Vue、SSR、CMS 或数据库。**

当前真正值得做的是三件事：

1. **把图片做轻**：首页 LCP 图 `detail.png` 为 241.5 KB / 1440×1800，实际显示约 360×270；全站图片合计约 440 KB。改用 Astro `<Picture>` + AVIF/WebP + 响应式宽度后，预计图片降到约 100 KB，移动首屏约 38 KB，LCP 从 3.3 s 降到约 2.0–2.4 s。
2. **把缓存做对**：线上带 hash 的 `_astro/*.css` 和所有图片目前是 `Cache-Control: public,max-age=0,must-revalidate`，每次访问都要重新验证。应改为 hash 资源 `immutable` 一年、图片长缓存。
3. **把隐式约定变成显式校验**：未发布作品的文档仍会生成公开路由；作品/文档类型、日期、路由 slug、作品专属文案、统计数字都有“当前没错、加第二个作品就错”的隐患。用共享 helper、Zod 枚举和 CI 把它们锁住。

如果只做三件事，建议顺序是：**P0-1 未发布路由（约 0.5 h）→ P0-2 图片（约 4–6 h）→ P1-1 缓存头（约 0.5 h）**。

## 1. 现状基线

### 1.1 工程与构建

| 项目 | 实测 |
| :-- | :-- |
| `npm run check` | 32 个文件，0 errors / 0 warnings / 0 hints |
| `npm run build` | 9 个 HTML 页面，约 4.3 s，无警告 |
| 依赖安全 | `npm audit`（含 dev）0 漏洞 |
| 运行时依赖 | 仅 `astro`；无客户端框架 |
| Node | 本机 24.19.0；`.nvmrc` 22；Netlify `NODE_VERSION = "22"` |

### 1.2 Lighthouse（生产产物，移动端）

在 `astro preview` 的 `dist` 产物上实测（4322 端口，避免与本地 dev server 冲突）：

| 指标 | 结果 | 评价 |
| :-- | :-- | :-- |
| Performance | **92** | 良好，但 LCP 拖后腿 |
| Accessibility | **100** | 很好 |
| Best Practices | **96** | 仅因 localhost 下 Cloudflare beacon 的 CORS 报错，生产不是问题 |
| SEO | **100** | 很好 |
| FCP | 1.2 s | 好 |
| **LCP** | **3.3 s** | 需要改善（> 2.5 s） |
| TBT | 10 ms | 很好 |
| CLS | 0 | 很好 |
| Speed Index | 2.3 s | 好 |
| TTI | 3.4 s | 可接受 |

首页网络传输约 **475 KB**，其中图片约 **440 KB**，HTML/CSS/JS（Brotli）合计约 25 KB：

| 资源 | 传输 | 说明 |
| :-- | --: | :-- |
| HTML | 9.3 KB | Brotli，原始约 48 KB |
| CSS | 9.3 KB | Brotli，原始约 50 KB，单文件全站复用 |
| ClientRouter JS | 5.8 KB | Brotli，原始 16 KB |
| Cloudflare beacon | 10.2 KB | 第三方，非功能依赖 |
| 图片合计 | **440 KB** | 见下表 |
| **合计** | **约 475 KB** | 图片占 93% |

| 图片 | 原始尺寸 | 体积 | 实际显示 | 问题 |
| :-- | :-- | --: | :-- | :-- |
| `detail.png` | 1440×1800 | 241.5 KB | 首页约 360×270；正文最大 760 px | 尺寸/格式/裁剪三重浪费，LCP 图 |
| `cover.png` | 1440×810 | 127.2 KB | 352–616 px 宽 | 未按显示宽度提供变体 |
| `logo.png` | 250×250 | 33.8 KB | 28–32 px | 每个页面都加载，体积是需要的 10 倍以上 |
| `plv.png` | 363×139 | 12.4 KB | 高 32 px | 可转 WebP/AVIF |
| `favicon.ico` | 400×400 PNG | 23.7 KB | 浏览器标签页 | 实际是 PNG 改名，非真正 ICO |

### 1.3 线上缓存与安全头

`curl -I https://plvstudio.netlify.app/...` 实测：

```text
Cache-Control: public,max-age=0,must-revalidate
```

HTML 这样设置是合理的；但带 hash 的 `_astro/Layout.*.css`、`ClientRouter.*.js` 以及 `images/*.png` 也全部是 `max-age=0`，导致：

- 回访用户每次都要重新验证 CSS/JS/图片；
- 即使内容没变，也拿不到 `immutable` 的零请求缓存收益；
- 图片没有版本化文件名，长缓存会有替换风险。

响应中已有 `Strict-Transport-Security`、`Content-Encoding: br`、`Vary: Accept-Encoding`，但缺少：

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy`
- `Permissions-Policy`
- `X-Frame-Options` / CSP

### 1.4 做得好、应保留的部分

- 纯静态、零客户端框架，页面在无 JS 下仍可阅读正文与文档（移动导航除外，见 P1-2）。
- 设计令牌集中在 `src/styles/global.css`，暗色模式无首帧闪烁。
- 内容集合 + Zod 构建期校验，作品/文档/进度数据同源。
- 可访问性基础扎实：跳过链接、`aria-current`、状态文字+颜色、`details` 目录、reduced-motion、44 px 触控目标。
- SEO 基础完整：canonical、OG/Twitter、sitemap、robots、404 noindex。
- 对外链接基本真实可核验；没有用空按钮/占位内容凑数。

## 2. 问题清单

优先级说明：**P0 = 本轮应修；P1 = 短期内应修；P2 = 有明确收益、可排期；P3 = 可选/观察。**  
这里的 P0 指“建议本轮处理”，**不是线上故障**：当前站点没有草稿内容，所以 P0-1 是发布门禁缺陷而非正在泄漏；P0-2 是当前最大的用户侧性能收益。

### P0-1 未发布作品的文档仍会生成公开路由

**位置**

- `src/pages/works/[slug]/documents/[doc].astro:13`：`getStaticPaths()` 使用全部 `documents`。
- `src/pages/works/[slug]/documents/index.astro:11-14`：文档列表路由使用全部 `documents` 的父目录。
- 两个页面在 `:18-27` / `:25-27` 只按 slug 找作品，**没有检查 `published`**。

**实测**

临时加入一个 `published: false` 的作品和它的文档后构建，产出：

```text
/works/zz-draft-test/documents/index.html
/works/zz-draft-test/documents/secret/index.html
```

作品列表不会链接它，但 URL 可直接访问；如果草稿里有未公开信息，这就是内容泄漏。当前仓库没有草稿内容，所以这不是正在发生的线上事故；但 `published` 是站点明确承诺的发布门禁，路由层绕过了它，应优先修。测试文件已删除，构建已恢复 9 页。

**修复**

新增 `src/lib/content.ts`，把“已发布作品 + 其文档”作为唯一入口：

```ts
import { getCollection } from "astro:content";

export async function getPublishedWorks() {
  return getCollection("works", ({ data }) => data.published);
}

export async function getPublishedDocuments() {
  const works = await getPublishedWorks();
  const slugs = new Set(works.map((work) => work.id));
  const all = await getCollection("documents");
  return all.filter((doc) => slugs.has(doc.id.split("/")[0]));
}
```

两个文档路由的 `getStaticPaths()` 改为只使用 `getPublishedDocuments()`；`documents/index.astro` 再用它的 slug 集合生成路径。这样未发布作品及其文档不会进入构建，也不依赖页面里的二次过滤。

**验收**

- 用同一份草稿 fixture 构建，`dist/works/{draft}/documents/**` 不存在。
- `dist/sitemap.xml` 不包含草稿 URL（当前已正确，因为 sitemap 只遍历已发布作品）。
- 如果存在“文档有父目录、但父作品缺失/未发布”的孤儿文档，构建时给出明确警告或直接失败。

### P0-2 图片是 LCP 与传输体积的主要瓶颈

**位置**

- `src/pages/index.astro:128` 硬编码 `/images/works/plv-studio/detail.png`，`width="1440" height="1800"`，`loading="eager"`、`fetchpriority="high"`。
- `src/components/FeaturedWorkCard.astro:29-37`、`src/components/WorkCard.astro:38-47`、`src/pages/works/[slug].astro:138-147` 均直接使用原始 `cover`。
- `src/content/works/plv-studio.md:54,58` 的 Markdown 正文图片也是原始 PNG。
- 图片都在 `public/`，Astro 不会处理，也没有 `srcset`。

**实测**

- Lighthouse `image-delivery-insight`：预计可省 **313 KB**。
- `detail.png` 显示尺寸约 360×270，却下载 1440×1800；首页容器是 `aspect-[4/3]`，原图是 4:5，`object-cover` 还会裁掉约 40% 的纵向内容。
- `sharp` 重编码估算（仅计算图片本身）：

| 变体 | 体积 |
| :-- | --: |
| `cover` 960w AVIF | 17.8 KB |
| `cover` 480w AVIF | 6.1 KB |
| `detail` 1200w AVIF | 81.4 KB |
| `detail` 640w AVIF | 24.0 KB |
| `logo` 96w AVIF | 2.7 KB |
| `plv` 192w AVIF | 3.3 KB |

移动端首屏图片可从 440 KB 降到约 **38 KB**，全站图片（含各档变体）约 **100–140 KB**。

**修复方向**

1. 把需要优化的图片移到 `src/assets/images/`，用 Content Collections 的 `image()` helper 接入：

```ts
// src/content.config.ts
schema: ({ image }) =>
  z.object({
    cover: image().optional(),
    icon: image().optional(),
    hero: z
      .object({
        src: image(),
        alt: z.string(),
      })
      .optional(),
    // ...
  })
```

2. 组件改用 `<Picture>`（AVIF/WebP + 宽度变体）：

```astro
---
import { Picture } from "astro:assets";
---
<Picture
  src={work.hero.src}
  formats={["avif", "webp"]}
  widths={[480, 768, 1200]}
  sizes="(min-width: 1024px) 40vw, 100vw"
  alt={work.hero.alt}
  loading="eager"
  fetchpriority="high"
  class="aspect-video w-full object-cover object-top"
/>
```

3. 首页 LCP 图显式 `preload`（或至少确保 `fetchpriority="high"` 只给首屏图，不要给多张图）。
4. 正文图片两条路选一条：
   - **推荐**：把作品截图放进 frontmatter 的 `gallery`/`hero`，由作品页用 `<Picture>` 渲染，Markdown 正文只写说明；这样不走 MDX，也不破坏“纯 Markdown”原则。
   - 或者保留 Markdown 图片，但用构建期 `sharp` 脚本生成 640/1200 WebP/AVIF，并在 Markdown 中手写 `<picture>`；维护成本更高，不如上一种。
5. `og:image` 不要指向 AVIF/hash 资源。单独保留一张 1200×630 PNG/JPEG 作为社交分享图，并加 `og:image:width/height`。

**验收**

- 首页移动端图片传输 ≤ 100 KB（目标 ~40 KB）。
- LCP ≤ 2.5 s（目标 2.0–2.4 s）。
- 所有 `<img>` 有 `width`/`height` 或 `aspect-ratio`，CLS 保持 0。
- 图片文件名带 hash 时，缓存头可设为 `immutable`（与 P1-1 配合）。

### P1-1 缓存头与基础安全头

**位置**：`netlify.toml:1-6` 只有 build，没有 `[[headers]]`。

**修复**（Netlify 配置示意，部署后用 `curl -I` 验证规则优先级）：

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
    X-Frame-Options = "DENY"

[[headers]]
  for = "/_astro/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/images/*"
  [headers.values]
    Cache-Control = "public, max-age=604800, stale-while-revalidate=86400"
```

说明：

- HTML 保持 `max-age=0, must-revalidate`，不要给 HTML 设长缓存。
- 图片如果迁到 Astro 的 hash 资源（`/_astro/*`），可直接 `immutable`；如果暂时留在 `public/images`，用 7 天 + `stale-while-revalidate` 更安全。
- CSP 建议先以 `Content-Security-Policy-Report-Only` 上线，确认 Cloudflare beacon 与 3 段内联脚本不被拦后再强制。内联脚本包括 `Layout.astro` 的主题脚本、`ThemeToggle.astro` 与 `SiteHeader.astro` 的脚本；Astro 7 的 CSP 实验特性可用 hash 方案，但需要额外配置，不要为了一个静态站点引入复杂 nonce 机制。
- `X-Frame-Options: DENY` 与 `frame-ancestors 'none'` 二选一即可，后者更现代。

### P1-2 移动端导航与主题按钮在无 JS 时不可用

**位置**

- `src/components/SiteHeader.astro:84` 移动菜单默认 `hidden`，`:120-158` 完全依赖 JS 切换；桌面导航 `hidden md:flex`，所以移动端无 JS 时 header 没有导航。
- `src/components/ThemeToggle.astro:9-45` 按钮始终渲染，但无 JS 时点击无效。
- 两段增强脚本都只监听 `astro:page-load`（`SiteHeader.astro:132`、`ThemeToggle.astro:66`），这个事件由 `ClientRouter` 的 bundle 触发。如果路由脚本加载失败或被移除，移动菜单和主题按钮会静默失效，即使普通 JS 仍在运行。

这不会影响 Lighthouse A11y 分数，但与 README 中“禁用 JS 时自动回退为普通多页跳转”的表述不完全一致；移动端用户仍可从页脚进入，但主导航缺失。

**修复方向**

- 移动导航改成原生 `<details>`/`<summary>`，或用 `:target`/checkbox 的 CSS-only 方案；JS 只做“点击后自动收起”和 Esc 关闭的增强。
- 主题按钮默认 `hidden`，在 head 内联脚本成功执行后加 `html.js` 类再显示；或放进 `<noscript>` 之外但用 `html:not(.js)` 隐藏。
- 如果保留现有按钮，把初始化函数做成幂等，并在 `DOMContentLoaded` 与 `astro:page-load` 都调用；这样即使 `ClientRouter` 的 bundle 没加载，菜单和主题仍能用。
- 保留 `ClientRouter` 的渐进增强回退；如果移除 ClientRouter，需要把 `astro:page-load` 监听改成 `DOMContentLoaded`（见 P3-1）。

**验收**：Chrome 禁用 JavaScript + 移动视口，header 能展开并跳转；主题按钮不可见（而不是可点击但无反应）。

### P1-3 内容 schema 与路由不变量不够硬

**位置**

- `src/content.config.ts:10` 只用正则 `^\d{4}-\d{2}-\d{2}$` 校验日期，`2026-02-30` 也能通过；应使用 `z.iso.date()`（当前 Zod 4.6.7 已支持，实测会拒绝 2 月 30 日）。
- `src/content.config.ts:14` 作品 loader 用 `**/*.md`，允许子目录；但 `[slug].astro` 只接受单段 slug，`nested/foo.md` 会生成无法匹配的路由。
- `src/content.config.ts:21,28` `type` 都是 `z.string()`；拼错不会构建失败，只会落到 `workTypeLabel` 的原始值或文档排序的 `99`。
- `src/content.config.ts:34-43` 文档 schema 没有 `published`；路由层也没有继承父作品的发布状态（与 P0-1 同源）。
- `src/content.config.ts:25` 的 `published` 默认是 `true`，属于“忘记写就公开”的 opt-out 模型；对作品集来说更安全的默认值是 `false`，或至少要求显式填写。
- `demoUrl`/`sourceUrl`/`videoUrl`/`cover`/`icon` 只校验字符串，没有 URL/路径约束；`javascript:` 之类的前置值会被直接渲染为 href。

**修复方向**

```ts
export const WORK_TYPES = [
  "ai-application",
  "developer-tool",
  "data-visualization",
  "tech-experiment",
  "website",
] as const;

export const DOC_TYPES = [
  "requirements",
  "architecture",
  "ui",
  "api",
  "test",
  "review",
] as const;
```

- `content.config.ts` 用 `z.enum(WORK_TYPES)` / `z.enum(DOC_TYPES)`；`lib/works.ts`、`lib/documents.ts` 从同一常量派生标签和顺序。
- 日期改 `z.iso.date()`；作品 slug 限定 `^[a-z0-9-]+$`，loader 改 `*.md`。
- 外部链接用 `z.url()`（或 `z.string().url()`）并限制 `https`；站内图片路径必须来自 `image()` 或 `/` 开头。
- 文档增加 `published: z.boolean().default(true)`，或在 `getPublishedDocuments()` 里继承父作品状态；两者选一，不要两套逻辑。

**验收**：把日期改成 `2026-02-30`、把 `type` 改成 `requirement`、把作品放进子目录，构建都应明确报错。

### P1-4 设计文档与实际令牌不一致

**位置**

- `src/content/documents/plv-studio/ui-design.md:15` 写主色 `#2563EB`、辅助 `#0F9488`、次级文字 `#64748B`。
- `src/styles/global.css:22-23` 实际是 `#1D4ED8`、`#0F766E`、`#526075`。
- `src/content/documents/plv-studio/architecture.md:62` 写 `--c-primary: 37 99 235`，实际是 `29 78 216`。
- `README.md:67` 写作品卡日期是 `2026.10.23` 点分格式，实际组件输出 `2026-10-25` 连字符格式。
- `src/content/works/plv-studio.md:5` 的 `type: "developer-tool"` 会显示成“开发者工具”；它实际是个人作品集站点，不是开发者工具。建议加 `website`/`portfolio` 类型并更新 frontmatter，或至少把标签改成“站点”。

这不是“文案小问题”：站点主打“真实可信、可追溯”，设计文档与实现不一致会直接削弱这个主张。建议：

- 以 `global.css` 为唯一事实源，更新两份文档的色值表；或者把令牌表抽成 `docs/design-tokens.md` 由 CSS 生成/校验，避免第二次漂移。
- README 的视觉基线改成实际格式，或删掉易过时的细节。
- 在 CI 加一个轻量检查：文档中出现的 `--c-*` 值与 `global.css` 一致（可用简单正则脚本，不必引入文档系统）。

### P1-5 作品专属内容硬编码，第二个作品加入时会错

**位置**

- `src/pages/index.astro:128` 首页 hero 固定为 `plv-studio/detail.png`；如果 `featured` 换成另一个作品，图不会变。
- `src/components/FeaturedWorkCard.astro:59` 固定显示“本站自身”；`:46` 固定显示“01 / 精选作品”。
- `src/pages/about.astro:176` 固定“本站目前只有 1 个公开作品”；`:202` 固定“当前公开 3 份”。
- `src/pages/404.astro:21`、`src/components/SiteFooter.astro:6` 硬编码 `/works/plv-studio/documents/`。
- `src/data/skills.ts:40,45,50,66,72,88,93,98` 硬编码作品/文档路径。
- `src/layouts/Layout.astro:21` 默认 OG 图固定为 `plv-studio/cover.png`。
- 已发布作品/文档计数的逻辑在 `src/pages/index.astro:14-33`、`src/pages/works.astro:9-30`、`src/pages/about.astro:9-16`、`src/pages/works/[slug].astro:18` 各写了一遍；这正是文档路由漏掉发布门禁的同类问题。应抽 `getPublishedWorks()`、`countPublishedDocs(slugs)` 到 `src/lib/works.ts`，页面只调用。
- `featured` 允许同时为多个作品，但首页/作品列表都静默取 `[0]`；如果打算保留“精选”概念，应加 `featuredOrder` 或构建期校验“最多一个 featured”，否则第二个 featured 会被无声忽略。

**修复方向**

- 新增 `src/config/site.ts`（站点名、域名、默认 OG、导航、联系方式）与 `src/lib/routes.ts`（`workHref`、`documentsHref`、`docHref`）。所有组件/页面只通过这些 helper 生成链接。
- 作品 schema 增加 `hero`（图 + alt）或 `heroImage`，首页不再拼路径。
- `FeaturedWorkCard` 的“本站自身”改成可选 `selfLabel`，或由 `work.slug === SITE.selfWorkSlug` 推导；“01”改由调用方传入 `index`，或干脆删掉。
- `about` 用 `works.length`、`docCount` 计算；`404`/页脚优先链接 `/works/`，需要直达文档时用 helper。
- `skills.ts` 的站内证据用 helper 生成，外部仓库保留完整 URL。

**验收**：新增第二个作品并设为 `featured`，首页 hero、精选卡、页脚、404、关于页统计都自动正确；不出现“本站自身”或旧截图。

### P1-6 首页与文档列表的 `<title>` 偏弱

**位置**

- `src/pages/index.astro:65` 传 `title="首页"`，最终 `<title>首页 · PLV Studio</title>`，没有品牌定位，OG 标题同样是“首页 · PLV Studio”。
- `src/pages/works/[slug]/documents/index.astro:36` 传 `title="设计文档"`；未来多个作品会有多个完全相同的“设计文档 · PLV Studio”。
- `src/pages/works/[slug]/documents/[doc].astro:46` 只传文档标题，跨作品可能重名。

**修复**

- 首页不传 `title`（`Layout` 默认 `PLV Studio` 会走 `PLV Studio · 个人作品与技术实践` 的特殊分支），或直接传 `PLV Studio · 个人作品与技术实践`。
- 文档列表：`title={`${work.title} 设计文档`}`。
- 文档阅读：`title={`${docEntry.title} · ${work?.title ?? "PLV Studio"}`}`。
- 这是低成本、对搜索与分享都有直接收益的改动。

### P1-7 暗色模式焦点轮廓对比度不足

**位置**：`src/styles/global.css:90-93`

```css
:focus-visible {
  outline: 2px solid rgb(var(--c-primary));
  outline-offset: 3px;
}
```

`--c-primary`（#1D4ED8）在暗色背景 #0B1120 上对比度实测 **2.81:1**，低于 WCAG 2.2 对焦点指示器建议的 3:1；浅色模式是 6.31:1，没问题。

**修复**

不要直接把暗色轮廓改成 `--c-accent`：青绿色在蓝色主按钮上只有约 3.6:1，仍不稳。更稳的做法是新增独立的焦点令牌：

```css
:root {
  --c-focus: 29 78 216;      /* 浅色：与 primary 同值，6.31:1 */
}
.dark {
  --c-focus: 147 197 253;    /* #93C5FD，暗底 10.44:1，蓝按钮上 3.72:1 */
}
:focus-visible {
  outline: 2px solid rgb(var(--c-focus));
  outline-offset: 3px;
}
```

`outline-offset: 3px` 会让轮廓与控件之间留出页面背景，实际对比看的是背景；但 `#93C5FD` 在蓝色按钮上也仍有 3.72:1，作为双保险。改完后用键盘 Tab 检查按钮、链接、`summary`、跳过链接。

### P1-8 “最近更新”口径不一致

**位置**

- `src/pages/index.astro:37-43`、`src/pages/works.astro:21-27`、`src/pages/works/[slug].astro:41-42` 只合并作品 `updatedAt` 与进度 `updatedAt`，没有算文档 `updatedAt`。
- `src/pages/sitemap.xml.ts:13-15` 首页/作品/关于的 `lastmod` 只看作品。

结果是：只改一篇文档时，文档页/sitemap 的文档条目会更新，但首页、作品列表、作品详情的“最近更新”和 sitemap 首页 `lastmod` 不动。建议抽 `latestDate(...dates)` helper，四处统一为“作品 + 进度 + 文档”的最大值；sitemap 的 about 可另用站点级 `updatedAt` 或省略 `lastmod`。

### P2-1 状态标签/颜色/阶段语义分散

**位置**

- `src/components/WorkStatusBadge.astro:15-58` 维护了一套状态中文标签 + 硬编码 amber/blue/cyan/emerald/slate/red 调色板。
- `src/lib/works.ts:16-23` 又维护了一套 `STATUS_LABELS`。
- `src/pages/works/[slug].astro:37-39` 用中文阶段名 `"测试验收" | "发布部署" | "发布迭代"` 过滤验收记录；改一个字就丢区块。其中 `"发布迭代"` 在当前 `src/data/progress.ts` 里从未出现（实际是“体验与内容优化”），是死字面量，说明这套匹配已经和内容脱节。

**修复**

- 状态中文标签收敛到 `types.ts`/`lib/works.ts`，`WorkStatusBadge` 只负责颜色映射；两处标签不会再漂移。
- 状态颜色要么进设计令牌（`--c-status-*`），要么在架构文档里明确“状态调色板是唯一例外”，不要让“组件中不允许散落色值”的规则名存实亡。
- `ProgressEntry` 增加 `phase` 字段（`requirements | architecture | build | test | release | iteration`），`releaseEntries` 按 `phase` 过滤，不再匹配中文 `stage`。`stage` 保留为展示文案。
- 主题细节：`src/layouts/Layout.astro:63-64` 的 `theme-color` 只按系统偏好设置，手动切暗色时浏览器地址栏仍是浅色；应在 `applyTheme` 里同步两份 `meta[name="theme-color"]`。`ThemeToggle.astro:13-15` 同时用了“会变化 label”和 `aria-pressed`，二选一即可（推荐固定 label + `aria-pressed`）。`Layout.astro:69` 与 `ThemeToggle.astro:61` 的 `localStorage` 需要 `try/catch`，隐私模式下可能抛异常。

### P2-2 SEO 增强（可选）：结构化数据、OG 尺寸、动态 robots

这些不是当前 SEO 100 的必要条件；优先做 P1-6 的 title，下面按需选择。

- 如果希望增强搜索实体识别，可加 `WebSite` + `Person` + `BreadcrumbList` JSON-LD（作品页/文档页可再加 `CreativeWork`/`TechArticle`）。用 `src/components/StructuredData.astro` 统一输出，避免每页手写；只有一个作品时收益有限，不必为它引入 schema 生成库。
- `og:image` 增加 `og:image:width`/`height`；作品/文档页的 `og:type=article` 增加 `article:published_time`、`article:modified_time`。
- `public/robots.txt` 改成 `src/pages/robots.txt.ts`（并删除静态文件，避免同路径冲突），用 `Astro.site` 生成 Sitemap 地址，换域名时不会失效。
- sitemap 的 `changefreq`/`priority` 可保留也可删；Google 已明确忽略，保留不影响，但不要作为优化指标。
- `favicon.ico` 目前是 400×400 PNG 改名；建议提供 `favicon.svg` + 32×32 PNG + 180×180 `apple-touch-icon`，并加正确的 `type`/`sizes`。

### P2-3 标题层级、重复链接与组件语义

- `src/components/WorkCard.astro:84` 在作品列表页用 `h2`，与页面级“全部作品”`h2` 同级；应支持 `headingLevel`，列表页用 `h3`。
- `src/components/DocumentCard.astro:24` 的 row 变体在文档列表页也用 `h2`；同样应为 `h3`。
- `WorkCard` 的封面链接、标题链接、“查看详情”链接指向同一详情页，键盘用户要 Tab 三次；可把封面链接设为 `tabindex="-1" aria-hidden="true"`（保留鼠标点击），或改成整卡单一链接。
- `FeaturedWorkCard` 的封面、标题、“查看项目”也是三个重复入口；同理收敛。
- `src/components/WorkCard.astro:10` 的 `variant="featured"` 没有被任何页面使用，是死代码；删除或真正复用。
- `src/pages/works/[slug].astro:205-208`、`documents/index.astro:110-115` 的“复盘文档尚未单独发布”是硬编码结论；如果之后补了 `review` 文档，文案会自相矛盾。应改为根据 `workDocs` 是否包含 `review` 动态生成。

### P2-4 质量保障：CI、单测、链接与可访问性检查

当前 Netlify 只跑 `npm run build`，不跑 `astro check`；`astro check` 是手动门槛。站点自述“验收依赖人工清单”，这与“真实可信”一致，但可以把关键项自动化：

- **CI**：GitHub Actions，`npm ci` → `npm run check` → `npm run build`。或至少在 `package.json` 加 `prebuild: "npm run check"`，让 Netlify 构建也过类型检查。
- **单测（可选）**：如果引入 Vitest，优先覆盖 `sortByLifecycle`、`getRecentProgress`、`publicStatusLabel`、`latestDate`、`filterPublishedDocuments` 这些纯函数；不为展示组件写快照测试。
- **链接检查**：`linkinator` 或 `lychee` 对 `dist`/preview 做内部链接与锚点检查；外部链接可每周定时跑，避免阻塞每次构建。
- **可访问性**：`@axe-core/cli` 对 9 个页面跑一遍；Lighthouse 已 100，但 axe 能覆盖焦点顺序/重复链接等 Lighthouse 不查的项。
- **Lighthouse CI**：给首页设预算（Performance ≥ 95、LCP ≤ 2.5 s、图片 ≤ 100 KB），防止图片回退。
- **不要**为 9 个静态页面引入 Playwright 全量 E2E；成本高于收益。

### P2-5 依赖与运行环境

- `astro` 7.4.0 → 7.4.3 是 patch 升级，建议跟进；`typescript` 最新 7.0.2 是 major，**不要**在没验证 Astro 兼容性时直接升。
- `netlify.toml` 的 `NODE_VERSION = "22"` 与 `engines.node >= 22.22.0` 不完全对齐；建议 `NODE_VERSION = "22.22.0"`，`.nvmrc` 同步，减少本地/CI 差异。
- `astro.config.mjs:9-11` 用 `process.argv.includes('dev')` 判断本地服务；如果仓库路径里带 `dev`（如 `E:\dev\...`），生产构建会被误判成 dev，`trailingSlash` 变成 `ignore`。应精确解析 CLI 命令（`process.argv.slice(2)` 中精确匹配 `dev`/`build`/`preview`），或直接统一为 `always`。
- `astro.config.mjs:14`、`src/pages/sitemap.xml.ts:8`、`public/robots.txt:4` 三处硬编码域名；换成 `process.env.SITE_URL ?? "https://plvstudio.netlify.app"` + `Astro.site` 生成的 `robots.txt`，换域名只改一处。
- `astro.config.mjs:17-19` 的 `host: true` + `allowedHosts: true` 会把 dev server 暴露到局域网并接受任意 Host 头；除非确实需要手机联调，建议去掉 `allowedHosts: true`，用显式 host 白名单或环境变量开启。
- `npm audit` 当前 0 漏洞；保持 `npm ci` + lockfile，避免 `npm install` 漂移。

### P2-6 内容策略：第二个作品比第十个组件更重要

这是“作品集”而不是“组件库”。目前 About 说核心方向是 Java 后端，但站内唯一公开作品是 PLV Studio 自身（前端/站点建设），后端能力主要靠外部仓库证明。建议补一个真实的 Java/Spring Boot 案例，至少包含：

- 需求/架构/API 三份文档；
- 一条真实的开发进度时间线（不必全部 completed）；
- 一个可访问的 demo 或可核验的仓库；
- 与 `skills.ts` 的后端证据互相引用。

这比继续打磨首页动效更能提升“作品优先、证据优先”的说服力。

### P3 可选

- **ClientRouter 去留**：它带来 5.8 KB Brotli JS 和页面过渡，TBT 仅 10 ms，当前不是性能瓶颈。若产品上不需要过渡，可移除并改用普通多页跳转，减少一层脚本与焦点管理复杂度；若保留，建议补 `astro:after-swap` 后的焦点管理（把焦点移到 `#main` 或页面标题），避免读屏用户不知道页面已切换。
- **主题跟随系统**：如果用户没有手动选择过主题，可监听 `prefers-color-scheme` 的变化；手动选择后不再跟随，避免和用户意图打架。
- **`WorkCard` 技术栈截断**：`slice(0, 4)` 静默隐藏多余标签，建议显示 `+N`。
- **`[doc].astro` 字数统计**：当前统计的是 Markdown 原始字符（含 `#`、链接语法），名为“篇幅 N 字”不够准确；可改为“正文约 N 字（含标记）”或去掉该指标。
- **`favicon.ico`/`apple-touch-icon`**：见 P2-2。
- **README 更新**：上面的视觉基线、文档路径、缓存/CI 说明在改动后同步，避免 README 成为第二个“过期文档”。

## 3. 建议路线图

| 阶段 | 内容 | 预计投入 | 直接收益 |
| :-- | :-- | :-- | :-- |
| Phase 1（本轮） | P0-1 未发布路由；P0-2 图片；P1-1 缓存/安全头；P1-7 焦点对比度 | 0.5–1 天 | 消除内容泄漏；LCP 3.3 → ~2.0–2.4 s；回访缓存命中 |
| Phase 2（短期） | P1-2 无 JS 导航；P1-3 schema；P1-4 文档校准；P1-5 单一数据源；P1-6 标题；P1-8 更新时间 | 1.5–2 天 | 加第二个作品不返工；构建期拦截脏内容；SEO/可信度 |
| Phase 3（中期） | P2-1 状态/phase；P2-2 SEO 增强；P2-3 语义/链接；P2-4 CI/测试；P2-5 依赖 | 2–3 天 | 可维护性、可访问性、回归防护 |
| Phase 4（持续） | P2-6 第二个作品与文档；README/设计文档同步 | 按内容排期 | 作品集说服力 |

如果时间有限，**不要按表格从上到下全做**；先做 Phase 1，再根据是否准备增加第二个作品决定 Phase 2 的优先级。只有一个作品时，P1-5 的部分硬编码不会立刻出错，但 P1-3/P0-1 是“现在不做、以后一定踩”的约束。

## 4. 关键实现草图

### 4.1 图片迁移步骤

1. `public/images/works/plv-studio/{cover,detail}.png`、`public/logo.png`、`public/plv.png` 移到 `src/assets/images/...`。
2. `content.config.ts` 用 `image()` 接收 `cover`/`icon`/`hero`/`gallery`。
3. `index.astro` 的 hero 改用 `featuredWork.hero`（或 `gallery[0]`），不再拼 `/images/works/plv-studio/detail.png`。
4. `WorkCard`/`FeaturedWorkCard`/`[slug].astro` 改用 `<Picture>` 或 `<Image>`，按上下文给 `sizes`：
   - 首页 hero：`(min-width: 1024px) 40vw, 100vw`
   - 作品列表封面：`(min-width: 768px) 50vw, 100vw`
   - 作品详情封面：`(min-width: 1024px) 22rem, 100vw`
   - 文档正文图：`(min-width: 1024px) 760px, 100vw`
5. `og:image` 单独保留 1200×630 PNG/JPEG，不跟 AVIF/hash 走。
6. 删除 `public` 下不再引用的原图，避免构建产物里仍有 440 KB 死资源。

### 4.2 路由/文案单一来源

```ts
// src/lib/routes.ts
export const workHref = (slug: string) => `/works/${slug}/`;
export const documentsHref = (slug: string) => `${workHref(slug)}documents/`;
export const docHref = (slug: string, docId: string) =>
  `${documentsHref(slug)}${docId}/`;
```

```ts
// src/config/site.ts
export const SITE = {
  name: "PLV Studio",
  url: "https://plvstudio.netlify.app",
  description: "个人作品与技术实践站点……",
  selfWorkSlug: "plv-studio",
  ogImage: "/og/plv-studio.png",
} as const;
```

先替换 `404`、`SiteFooter`、`skills.ts`、`Layout`、`index` 中的硬编码路径/域名；这一步不改视觉，风险低，收益是后续换 slug/域名只改一处。

### 4.3 未发布文档修复

```ts
// src/lib/content.ts
export async function getPublishedDocuments() {
  const works = await getPublishedWorks();
  const slugs = new Set(works.map((work) => work.id));
  const all = await getCollection("documents");
  const published = all.filter((doc) => slugs.has(doc.id.split("/")[0]));
  const orphans = all.filter((doc) => !slugs.has(doc.id.split("/")[0]));
  if (orphans.length > 0) {
    console.warn(
      `[content] ${orphans.length} 篇文档的父作品不存在或未发布：` +
        orphans.map((doc) => doc.id).join(", "),
    );
  }
  return published;
}
```

```ts
// documents/[doc].astro
export async function getStaticPaths() {
  const entries = await getPublishedDocuments();
  return entries.map((entry) => {
    const [workSlug, docId] = entry.id.split("/");
    return { params: { slug: workSlug, doc: docId }, props: { entry } };
  });
}
```

```ts
// documents/index.astro
export async function getStaticPaths() {
  const entries = await getPublishedDocuments();
  const slugs = [...new Set(entries.map((entry) => entry.id.split("/")[0]))];
  return slugs.map((slug) => ({ params: { slug } }));
}
```

### 4.4 无 JS 移动导航（示意）

```astro
<details class="md:hidden">
  <summary
    class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg"
    aria-label="打开导航菜单"
  >
    <span aria-hidden="true">☰</span>
  </summary>
  <nav aria-label="移动端导航" class="mt-2 grid gap-1 rounded-xl border border-border bg-surface p-2">
    {navItems.map((item) => (
      <a href={item.href} class="flex min-h-11 items-center rounded-lg px-3">
        {item.label}
      </a>
    ))}
  </nav>
</details>
```

JS 只负责“点击链接后关闭”和 Esc；即使脚本失败，导航仍可用。样式上需要把 `<summary>` 的默认三角隐藏，并与现有按钮对齐。

### 4.5 CI（最小可用）

```yaml
name: ci
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: ".nvmrc"
          cache: "npm"
      - run: npm ci
      - run: npm run check
      - run: npm run build
```

如果只想改一处：在 `package.json` 增加 `"prebuild": "npm run check"`，Netlify 的 `npm run build` 就会先跑类型检查。CI 仍是更稳的边界，因为 Netlify 构建失败时已经接近发布。

## 5. 验收清单

- [ ] 草稿作品 + 文档构建后，`dist/works/{draft}/documents/**` 不存在；构建日志有明确警告或失败。
- [ ] 首页移动端图片传输 ≤ 100 KB；Lighthouse LCP ≤ 2.5 s（目标 2.0–2.4 s）。
- [ ] `curl -I` 检查 `/_astro/*.css` 返回 `Cache-Control: public, max-age=31536000, immutable`；图片缓存命中。
- [ ] 禁用 JS + 移动视口：header 导航可展开/跳转；主题按钮不可见或不可聚焦。
- [ ] 暗色模式 Tab 焦点轮廓对比度 ≥ 3:1；浅色模式不回退。
- [ ] `npm run check`、`npm run build` 在 CI 通过；`astro check` 不再只是人工步骤。
- [ ] 内部链接/锚点 0 缺失；9 个页面无控制台错误；404 仍返回自定义页。
- [ ] sitemap 只包含已发布 URL；首页/作品/文档的 `lastmod` 口径一致。
- [ ] 作品列表/文档列表标题层级正确（h1 → h2 → h3），重复入口不超过必要数量。
- [ ] 设计文档中的 `--c-*` 值与 `global.css` 一致；README 不再写点分日期/旧色值。
- [ ] 新增第二个作品时，首页 hero、精选卡、页脚、404、关于页统计自动正确。

## 6. 不建议做

- **不要**为了“现代化”引入 React/Vue、SSR、数据库或 CMS。站点没有用户写入、没有登录、没有服务端逻辑，纯静态是优势。
- **不要**为了 Lighthouse 100 删掉 Cloudflare Analytics 或强行移除 ClientRouter；先测收益。当前 TBT 10 ms，Analytics 不是瓶颈。
- **不要**把 CSS 拆成每页一份或用大量内联 critical CSS 换首屏；当前单份 9.3 KB Brotli、全站缓存复用的方案更简单。
- **不要**为 9 个页面写全量 E2E；单测纯函数 + 链接/axe 检查 + Lighthouse 预算足够。
- **不要**为了正文图片引入 MDX（当前架构明确选择纯 Markdown）；用 frontmatter `hero`/`gallery` 或构建期图片脚本更贴合现有设计。
- **不要**在没有真实内容时用占位作品/假数据填满“作品数量”；这与站点“真实可信”的原则冲突。

## 附录：本次审计的关键证据

```text
npm run check → 0 errors / 0 warnings / 0 hints（32 files）
npm run build → 9 pages, 4.3 s, no warnings
Lighthouse mobile → Performance 92 / A11y 100 / BP 96 / SEO 100
                 → LCP 3.3 s / CLS 0 / TBT 10 ms
homepage transfer → ~475 KB, images ~440 KB
live header       → Cache-Control: public,max-age=0,must-revalidate
draft build test  → /works/zz-draft-test/documents/{index,secret}/index.html
image re-encode   → detail 640w AVIF 24.0 KB（原 241.5 KB）
                  → cover 960w AVIF 17.8 KB（原 127.2 KB）
                  → logo 96w AVIF 2.7 KB（原 33.8 KB）
```

> 注：Lighthouse 的 Best Practices 96 来自 localhost 下 Cloudflare beacon 的 CORS 报错；生产域名下不应作为优化目标。图片体积为 `sharp` 重编码估算，最终以构建产物与线上实测为准。
