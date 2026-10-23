// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://plv-studio.netlify.app', // TODO: 若实际域名不同，请同步修改（影响 canonical / OG / sitemap）
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
