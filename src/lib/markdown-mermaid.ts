import { renderMermaid } from "./mermaid";

// Sätteri（Astro 7 默认 Markdown 处理器）的 mdast 插件：
// 把 ```mermaid 代码块替换为构建期渲染好的静态图。渲染失败时原样保留代码块。
// 说明：这里不 import `satteri` 的运行时工具，只实现插件对象本身，
// 因此该模块不新增运行时依赖。

interface CodeNode {
  lang?: string | null;
  value: string;
}

interface MdastContext {
  replaceNode(node: unknown, replacement: unknown): void;
}

export const mermaidPlugin = {
  name: "mermaid-diagram",
  code(node: CodeNode, context: MdastContext) {
    if (node.lang !== "mermaid" || typeof node.value !== "string") return;

    const result = renderMermaid(node.value);
    if (!result) return;

    context.replaceNode(node, { type: "html", value: result.html });
  },
};

export default mermaidPlugin;
