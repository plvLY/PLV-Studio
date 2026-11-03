import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { progress } from "../data/progress";

// 全站 sitemap：只收录公开可访问的页面；404 不收录。
// lastmod 来自作品 / 文档 frontmatter 与真实开发进度，不做批量伪造。
export const GET: APIRoute = async ({ site }) => {
  const base = site ?? new URL("https://plvstudio.netlify.app");
  const works = await getCollection("works", ({ data }) => data.published);
  const documents = await getCollection("documents");

  // 首页/列表/关于的 lastmod 取作品元数据与真实进度记录中的最新日期
  const latestWorkUpdate =
    works
      .flatMap((work) => [
        work.data.updatedAt,
        ...(progress[work.id] ?? []).map((item) => item.updatedAt),
      ])
      .sort()
      .at(-1) ?? undefined;

  const urls: Array<{ path: string; lastmod?: string; changefreq?: string; priority?: string }> = [
    { path: "/", lastmod: latestWorkUpdate, changefreq: "weekly", priority: "1.0" },
    { path: "/works/", lastmod: latestWorkUpdate, changefreq: "weekly", priority: "0.9" },
    { path: "/about/", lastmod: latestWorkUpdate, changefreq: "monthly", priority: "0.6" },
  ];

  for (const work of works) {
    const workProgress = progress[work.id] ?? [];
    const lastmod =
      [work.data.updatedAt, ...workProgress.map((item) => item.updatedAt)].sort().at(-1) ??
      work.data.updatedAt;
    urls.push({
      path: `/works/${work.id}/`,
      lastmod,
      changefreq: "weekly",
      priority: "0.9",
    });

    const workDocs = documents
      .filter((doc) => doc.id.startsWith(`${work.id}/`))
      .map((doc) => ({ docId: doc.id.split("/")[1], updatedAt: doc.data.updatedAt }));

    // 没有公开文档的作品不生成文档列表路由，也不写进 sitemap
    if (workDocs.length === 0) continue;

    urls.push({
      path: `/works/${work.id}/documents/`,
      lastmod: workDocs.map((doc) => doc.updatedAt).sort().at(-1) ?? work.data.updatedAt,
      changefreq: "monthly",
      priority: "0.8",
    });

    for (const doc of workDocs) {
      urls.push({
        path: `/works/${work.id}/documents/${doc.docId}/`,
        lastmod: doc.updatedAt,
        changefreq: "monthly",
        priority: "0.7",
      });
    }
  }

  const escapeXml = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${escapeXml(new URL(url.path, base).toString())}</loc>${url.lastmod ? `\n    <lastmod>${escapeXml(url.lastmod)}</lastmod>` : ""}${url.changefreq ? `\n    <changefreq>${url.changefreq}</changefreq>` : ""}${url.priority ? `\n    <priority>${url.priority}</priority>` : ""}
  </url>`,
  )
  .join("\n")}
</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
