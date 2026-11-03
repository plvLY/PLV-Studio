// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { satteri } from '@astrojs/markdown-satteri';
import { mermaidPlugin } from './src/lib/markdown-mermaid.ts';

// Astro dev/preview 对缺少尾斜杠的任意路径会直接返回原生 404，不读取自定义 404.html。
// 本地服务放宽为 ignore，保证预览时也能看到站内 404；生产构建仍为 always，
// 由 Netlify 将无尾斜杠的已知路径 301 到带尾斜杠地址。
// 项目未安装 @types/node，这里通过运行时全局对象读取 CLI 命令。
const nodeProcess = /** @type {any} */ (globalThis).process;
const argv = /** @type {string[]} */ (nodeProcess?.argv ?? []);
const isLocalServer = argv.includes('dev') || argv.includes('preview');

export default defineConfig({
  site: 'https://plvstudio.netlify.app', // 站点正式域名（canonical / OG 绝对地址按此生成）
  trailingSlash: isLocalServer ? 'ignore' : 'always',
  server: { 
    port: 4321, 
    host: true,
    allowedHosts: true, 
  },
  // 文档里的 ```mermaid 代码块在构建期渲染为静态图（不引入客户端 Mermaid 运行时）
  markdown: {
    processor: satteri({ mdastPlugins: [mermaidPlugin] }),
  },
  // Tailwind v4 通过 Vite 插件接入（@astrojs/tailwind 已停止维护，不支持 Astro 7）
  vite: {
    plugins: [tailwindcss()],
  },
});
