// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://plvstudio.netlify.app', // 站点正式域名（canonical / OG 绝对地址按此生成）
  trailingSlash: 'always',
  server: { 
    port: 4321, 
    host: true,
    allowedHosts: true, 
  },
  // Tailwind v4 通过 Vite 插件接入（@astrojs/tailwind 已停止维护，不支持 Astro 7）
  vite: {
    plugins: [tailwindcss()],
  },
});
