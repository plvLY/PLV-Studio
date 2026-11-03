// 构建期 Mermaid 子集渲染器
// ---------------------------------------------------------------------------
// 站点坚持「零客户端框架、无 JS 也能读」：文档里的 ```mermaid 代码块不应该
// 依赖数百 KB 的运行时库。这里把本项目实际使用的两种图（flowchart / erDiagram）
// 在构建期直接渲染为静态 SVG / HTML，产物零运行时依赖，并能随主题切换配色。
//
// 只实现文档实际用到的语法子集；遇到无法识别的语句时 renderMermaid 返回 null，
// remark 插件会原样保留代码块，宁可退化也不输出半成品图。

export type DiagramKind = "flowchart" | "er";

export interface MermaidRenderResult {
  html: string;
  kind: DiagramKind;
  caption: string;
}

const DIRECTIONS = ["LR", "RL", "TD", "TB", "BT"] as const;
type Direction = (typeof DIRECTIONS)[number];

type NodeShape = "rect" | "round" | "db" | "diamond" | "subroutine" | "circle";

interface FlowNode {
  id: string;
  label: string;
  shape: NodeShape;
}

interface FlowEdge {
  from: string;
  to: string;
  label?: string;
}

interface PlacedNode extends FlowNode {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ErRelation {
  from: string;
  to: string;
  label: string;
  fromCardinality: string;
  toCardinality: string;
}

// 布局常量：与正文 13px 字号搭配
const FONT_SIZE = 13;
const NODE_H = 42;
const GAP_X = 52;
const GAP_Y = 22;
const PAD = 24;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 粗略测量文本宽度：中日韩字符按 1 个字号，拉丁字符按 0.56 个字号 */
function measureText(text: string): number {
  let width = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code >= 0x2e80) width += FONT_SIZE;
    else if (char === " ") width += FONT_SIZE * 0.3;
    else width += FONT_SIZE * 0.56;
  }
  return width;
}

function nodeWidth(node: FlowNode): number {
  const extra = node.shape === "db" ? 40 : node.shape === "diamond" ? 56 : 30;
  return Math.max(88, Math.min(248, Math.round(measureText(node.label) + extra)));
}

/** 解析单个节点声明：A、A[文本]、A(文本)、A[(存储)]、A{判断}、A[[子流程]] */
function parseNodeSpec(spec: string): FlowNode | null {
  const trimmed = spec.trim();
  const idMatch = /^([A-Za-z0-9_][\w-]*)/.exec(trimmed);
  if (!idMatch) return null;

  const id = idMatch[1]!;
  const rest = trimmed.slice(id.length).trim();
  if (!rest) return { id, label: id, shape: "rect" };

  const shapes: Array<[string, string, NodeShape]> = [
    ["[(", ")]", "db"],
    ["((", "))", "circle"],
    ["[[", "]]", "subroutine"],
    ["[", "]", "rect"],
    ["(", ")", "round"],
    ["{", "}", "diamond"],
  ];

  for (const [open, close, shape] of shapes) {
    if (rest.startsWith(open) && rest.endsWith(close)) {
      let label = rest.slice(open.length, rest.length - close.length).trim();
      if (
        (label.startsWith('"') && label.endsWith('"')) ||
        (label.startsWith("'") && label.endsWith("'"))
      ) {
        label = label.slice(1, -1).trim();
      }
      return { id, label: label || id, shape };
    }
  }

  // 形如 A>文本] 的菱形别名，以及无法识别的装饰：按矩形处理，保留 id 作为文字
  return { id, label: id, shape: "rect" };
}

/** 按 ; 拆分语句，但忽略括号与引号内部的 ; */
function splitStatements(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let depth = 0;
  let quote = "";
  for (const char of line) {
    if (quote) {
      current += char;
      if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === "[" || char === "(" || char === "{") depth += 1;
    if (char === "]" || char === ")" || char === "}") depth = Math.max(0, depth - 1);
    if (char === ";" && depth === 0) {
      result.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) result.push(current);
  return result;
}

interface SplitEdge {
  left: string;
  right: string;
  label?: string;
}

function splitEdge(statement: string): SplitEdge | null {
  // A -- 文本 --> B
  const withTextArrow = /^(.+?)\s+--\s+(.+?)\s+-->\s*(.+)$/.exec(statement);
  if (withTextArrow) {
    return { left: withTextArrow[1]!, label: withTextArrow[2]!, right: withTextArrow[3]! };
  }

  // A -->|文本| B / A --> B / A -.-> B / A --- B / A ==> B
  const match = /^(.+?)\s*(-->>|-\.->|==>|-->|---|===)\s*(?:\|([^|]*)\|\s*)?(.+)$/.exec(statement);
  if (match) {
    return { left: match[1]!, right: match[4]!, label: match[3]?.trim() || undefined };
  }

  // 无空格写法 A-->B
  const compact = /^(.+?)(-->>|-\.->|==>|-->|---)(?:\|([^|]*)\|)?(.+)$/.exec(statement);
  if (compact) {
    return { left: compact[1]!, right: compact[4]!, label: compact[3]?.trim() || undefined };
  }
  return null;
}

interface ParsedFlow {
  direction: Direction;
  nodes: FlowNode[];
  edges: FlowEdge[];
  caption: string;
}

function parseFlowchart(source: string): ParsedFlow | null {
  const lines = source.split(/\r?\n/);
  let direction: Direction | null = null;
  let caption = "";
  const nodeMap = new Map<string, FlowNode>();
  const edges: FlowEdge[] = [];

  const register = (node: FlowNode) => {
    const existing = nodeMap.get(node.id);
    // 后出现的声明可以补上文字（Mermaid 允许先引用后定义），但不要用裸 id 覆盖已有文字
    if (!existing) nodeMap.set(node.id, node);
    else if (node.label !== node.id) nodeMap.set(node.id, node);
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("%%")) {
      const meta = /^%%\s*(?:caption|title)\s*[:：]\s*(.+)$/i.exec(line);
      if (meta) caption = meta[1]!.trim();
      continue;
    }

    if (!direction) {
      const header = /^(?:flowchart|graph)\s+(LR|RL|TD|TB|BT)\b/i.exec(line);
      if (header) {
        direction = header[1]!.toUpperCase() as Direction;
        continue;
      }
      if (/^(?:flowchart|graph)\s*$/i.test(line)) {
        direction = "TD";
        continue;
      }
    }

    if (line.startsWith("classDef") || line.startsWith("class ") || line.startsWith("style ")) {
      continue;
    }

    for (const rawStatement of splitStatements(line)) {
      const statement = rawStatement.trim();
      if (!statement) continue;

      const edge = splitEdge(statement);
      if (edge) {
        const from = parseNodeSpec(edge.left);
        const to = parseNodeSpec(edge.right);
        if (!from || !to) return null;
        register(from);
        register(to);
        edges.push({ from: from.id, to: to.id, label: edge.label });
        continue;
      }

      const single = parseNodeSpec(statement);
      if (single) register(single);
    }
  }

  if (!direction || edges.length === 0) return null;
  return { direction, nodes: [...nodeMap.values()], edges, caption };
}

function computeRanks(nodes: FlowNode[], edges: FlowEdge[]): Map<string, number> {
  const rank = new Map<string, number>(nodes.map((node) => [node.id, 0]));
  const outgoing = new Map<string, string[]>();
  const indegree = new Map<string, number>(nodes.map((node) => [node.id, 0]));

  for (const edge of edges) {
    if (!outgoing.has(edge.from)) outgoing.set(edge.from, []);
    outgoing.get(edge.from)!.push(edge.to);
    indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
  }

  const queue = nodes.filter((node) => (indegree.get(node.id) ?? 0) === 0).map((node) => node.id);
  let visited = 0;
  while (queue.length > 0) {
    const id = queue.shift()!;
    visited += 1;
    for (const next of outgoing.get(id) ?? []) {
      rank.set(next, Math.max(rank.get(next) ?? 0, (rank.get(id) ?? 0) + 1));
      indegree.set(next, (indegree.get(next) ?? 1) - 1);
      if ((indegree.get(next) ?? 0) === 0) queue.push(next);
    }
  }

  // 存在环时用有限次松弛给出可用分层，避免无限增长
  if (visited < nodes.length) {
    for (let pass = 0; pass < nodes.length; pass += 1) {
      let changed = false;
      for (const edge of edges) {
        const next = Math.min(nodes.length, (rank.get(edge.from) ?? 0) + 1);
        if (next > (rank.get(edge.to) ?? 0)) {
          rank.set(edge.to, next);
          changed = true;
        }
      }
      if (!changed) break;
    }
  }

  return rank;
}

function layoutFlow(
  nodes: FlowNode[],
  edges: FlowEdge[],
  direction: Direction,
): { placed: Map<string, PlacedNode>; width: number; height: number; vertical: boolean } {
  const vertical = direction === "TD" || direction === "TB" || direction === "BT";
  const rank = computeRanks(nodes, edges);
  const maxRank = Math.max(0, ...rank.values());

  const layers: FlowNode[][] = Array.from({ length: maxRank + 1 }, () => []);
  for (const node of nodes) {
    layers[rank.get(node.id) ?? 0]!.push(node);
  }
  // 去掉空层（环松弛可能产生）
  const columns = layers.filter((layer) => layer.length > 0);

  const sizes = new Map(nodes.map((node) => [node.id, nodeWidth(node)]));
  const placed = new Map<string, PlacedNode>();

  if (!vertical) {
    const columnWidths = columns.map((column) => Math.max(...column.map((node) => sizes.get(node.id)!)));
    const columnHeights = columns.map(
      (column) => column.length * NODE_H + Math.max(0, column.length - 1) * GAP_Y,
    );
    const innerHeight = Math.max(1, ...columnHeights);
    let x = PAD;

    columns.forEach((column, index) => {
      const columnWidth = columnWidths[index]!;
      const startY = PAD + (innerHeight - columnHeights[index]!) / 2;
      column.forEach((node, rowIndex) => {
        const width = sizes.get(node.id)!;
        placed.set(node.id, {
          ...node,
          w: width,
          h: NODE_H,
          x: x + (columnWidth - width) / 2,
          y: startY + rowIndex * (NODE_H + GAP_Y),
        });
      });
      x += columnWidth + GAP_X;
    });

    return {
      placed,
      width: x - GAP_X + PAD,
      height: innerHeight + PAD * 2,
      vertical: false,
    };
  }

  const rowWidths = columns.map((column) =>
    column.reduce((total, node, index) => total + sizes.get(node.id)! + (index > 0 ? GAP_X : 0), 0),
  );
  const innerWidth = Math.max(1, ...rowWidths);
  let y = PAD;

  columns.forEach((column, index) => {
    let x = PAD + (innerWidth - rowWidths[index]!) / 2;
    for (const node of column) {
      const width = sizes.get(node.id)!;
      placed.set(node.id, { ...node, w: width, h: NODE_H, x, y });
      x += width + GAP_X;
    }
    y += NODE_H + Math.round(GAP_Y * 1.35);
  });

  return {
    placed,
    width: innerWidth + PAD * 2,
    height: y - Math.round(GAP_Y * 1.35) + PAD,
    vertical: true,
  };
}

function edgePath(from: PlacedNode, to: PlacedNode, vertical: boolean): string {
  if (!vertical) {
    const x1 = from.x + from.w;
    const y1 = from.y + from.h / 2;
    const x2 = to.x;
    const y2 = to.y + to.h / 2;

    if (x2 >= x1 - 2) {
      const curve = Math.max(24, (x2 - x1) * 0.45);
      return `M${x1},${y1} C${x1 + curve},${y1} ${x2 - curve},${y2} ${x2},${y2}`;
    }

    // 反向边（回指）：从下方绕行，避免直接穿过节点
    const routeY = Math.max(from.y + from.h, to.y + to.h) + 34;
    return `M${x1},${y1} C${x1 + 42},${y1} ${x1 + 42},${routeY} ${(x1 + x2) / 2},${routeY} S${x2 - 42},${routeY} ${x2 - 42},${y2} L${x2},${y2}`;
  }

  const x1 = from.x + from.w / 2;
  const y1 = from.y + from.h;
  const x2 = to.x + to.w / 2;
  const y2 = to.y;

  if (y2 >= y1 - 2) {
    const curve = Math.max(22, (y2 - y1) * 0.45);
    return `M${x1},${y1} C${x1},${y1 + curve} ${x2},${y2 - curve} ${x2},${y2}`;
  }

  const routeX = Math.max(from.x + from.w, to.x + to.w) + 34;
  return `M${x1},${y1} C${x1},${y1 + 42} ${routeX},${y1 + 42} ${routeX},${(y1 + y2) / 2} S${x2 + 42},${y2 - 42} ${x2},${y2}`;
}

function renderFlowNode(node: PlacedNode): string {
  const { x, y, w, h } = node;
  const cx = x + w / 2;
  const cy = y + h / 2;
  let shape: string;

  switch (node.shape) {
    case "round":
      shape = `<rect class="d-node" x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" />`;
      break;
    case "circle":
      shape = `<ellipse class="d-node" cx="${cx}" cy="${cy}" rx="${w / 2}" ry="${h / 2}" />`;
      break;
    case "db": {
      const ry = 6;
      shape =
        `<path class="d-node" d="M${x},${y + ry} A${w / 2},${ry} 0 0 1 ${x + w},${y + ry} L${x + w},${y + h - ry} A${w / 2},${ry} 0 0 1 ${x},${y + h - ry} Z" />` +
        `<path class="d-node-line" d="M${x},${y + ry} A${w / 2},${ry} 0 0 0 ${x + w},${y + ry}" />`;
      break;
    }
    case "diamond":
      shape = `<polygon class="d-node" points="${cx},${y} ${x + w},${cy} ${cx},${y + h} ${x},${cy}" />`;
      break;
    case "subroutine":
      shape =
        `<rect class="d-node" x="${x}" y="${y}" width="${w}" height="${h}" rx="8" />` +
        `<path class="d-node-line" d="M${x + 7},${y + 3} V${y + h - 3} M${x + w - 7},${y + 3} V${y + h - 3}" />`;
      break;
    default:
      shape = `<rect class="d-node" x="${x}" y="${y}" width="${w}" height="${h}" rx="10" />`;
  }

  return (
    `<g class="d-node-group">${shape}` +
    `<text class="d-label" x="${cx}" y="${cy + (node.shape === "db" ? 2 : 0)}" text-anchor="middle" dominant-baseline="central">${escapeHtml(node.label)}</text>` +
    `</g>`
  );
}

function renderFlowchart(parsed: ParsedFlow): MermaidRenderResult {
  const { placed, width, height, vertical } = layoutFlow(parsed.nodes, parsed.edges, parsed.direction);
  const uid = `d${(width * 131 + height * 17 + parsed.nodes.length * 7).toString(36)}`;
  const arrowId = `arrow-${uid}`;

  const edges = parsed.edges
    .map((edge) => {
      const from = placed.get(edge.from);
      const to = placed.get(edge.to);
      if (!from || !to) return "";
      const path = edgePath(from, to, vertical);
      const label =
        edge.label && edge.label.length > 0
          ? (() => {
              const mx = (from.x + from.w / 2 + to.x + to.w / 2) / 2;
              const my = (from.y + from.h / 2 + to.y + to.h / 2) / 2;
              return `<text class="d-edge-label" x="${mx}" y="${my - 6}" text-anchor="middle">${escapeHtml(edge.label)}</text>`;
            })()
          : "";
      return `<path class="d-edge" d="${path}" marker-end="url(#${arrowId})" />${label}`;
    })
    .join("");

  const nodes = [...placed.values()].map(renderFlowNode).join("");
  const caption = parsed.caption || (vertical ? "纵向流程" : "横向流程");

  return {
    kind: "flowchart",
    caption,
    html:
      `<figure class="diagram diagram--flow">` +
      `<span class="diagram-hint" aria-hidden="true">⇄ 左右滑动</span>` +
      `<div class="diagram-scroll">` +
      `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${escapeHtml(`流程图：${caption}`)}" preserveAspectRatio="xMidYMid meet">` +
      `<defs><marker id="${arrowId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path class="d-arrow" d="M0,0 L10,5 L0,10 z" /></marker></defs>` +
      `<g class="d-edges">${edges}</g>` +
      `<g class="d-nodes">${nodes}</g>` +
      `</svg>` +
      `</div>` +
      `<figcaption><span class="diagram-kind">架构图</span>${escapeHtml(caption)}</figcaption>` +
      `</figure>`,
  };
}

const CARDINALITY: Record<string, string> = {
  "||": "1",
  "|o": "0..1",
  "o|": "0..1",
  "}|": "1..N",
  "|{": "1..N",
  "o{": "0..N",
  "{o": "0..N",
  "}o": "0..N",
  "o}": "0..N",
  "{|": "1..N",
  "|]": "1..N",
};

function parseErDiagram(source: string): { relations: ErRelation[]; caption: string } | null {
  const relations: ErRelation[] = [];
  let caption = "";

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("%%")) {
      const meta = /^%%\s*(?:caption|title)\s*[:：]\s*(.+)$/i.exec(line);
      if (meta) caption = meta[1]!.trim();
      continue;
    }
    if (/^erDiagram$/i.test(line)) continue;

    const match = /^([A-Za-z0-9_]+)\s+([|}{o]{2})--([|}{o]{2})\s+([A-Za-z0-9_]+)\s*:\s*(.+)$/.exec(line);
    if (!match) return null;

    relations.push({
      from: match[1]!,
      to: match[4]!,
      label: match[5]!.trim(),
      fromCardinality: CARDINALITY[match[2]!] ?? match[2]!,
      toCardinality: CARDINALITY[match[3]!] ?? match[3]!,
    });
  }

  if (relations.length === 0) return null;
  return { relations, caption };
}

function renderEr(relations: ErRelation[], caption: string): MermaidRenderResult {
  const rows = relations
    .map(
      (relation) =>
        `<div class="er-rel">` +
        `<span class="er-entity">${escapeHtml(relation.from)}</span>` +
        `<span class="er-arrow" aria-hidden="true">→</span>` +
        `<span class="er-entity">${escapeHtml(relation.to)}</span>` +
        `<span class="er-meta">${escapeHtml(relation.label)} · ${escapeHtml(relation.fromCardinality)} : ${escapeHtml(relation.toCardinality)}</span>` +
        `</div>`,
    )
    .join("");

  const title = caption || `共 ${relations.length} 条实体关系`;

  return {
    kind: "er",
    caption: title,
    html:
      `<figure class="diagram diagram--er">` +
      `<div class="diagram-scroll"><div class="er-grid">${rows}</div></div>` +
      `<figcaption><span class="diagram-kind">领域关系</span>${escapeHtml(title)}</figcaption>` +
      `</figure>`,
  };
}

/**
 * 把 Mermaid 源码渲染为静态 HTML。
 * 无法识别的语法返回 null，由调用方回退到原始代码块。
 */
export function renderMermaid(source: string): MermaidRenderResult | null {
  const trimmed = source.trim();
  if (!trimmed) return null;

  const firstLine =
    trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0 && !line.startsWith("%%")) ?? "";

  if (/^erDiagram\b/i.test(firstLine)) {
    const parsed = parseErDiagram(trimmed);
    return parsed ? renderEr(parsed.relations, parsed.caption) : null;
  }

  if (/^(?:flowchart|graph)\b/i.test(firstLine)) {
    const parsed = parseFlowchart(trimmed);
    return parsed ? renderFlowchart(parsed) : null;
  }

  return null;
}

/** 从 Markdown 正文中提取 Mermaid 代码块（作品详情页做架构速览时复用） */
export function extractMermaidBlocks(body: string): string[] {
  const blocks: string[] = [];
  const regex = /```mermaid\s*\r?\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(body)) !== null) {
    const value = match[1]?.trim();
    if (value) blocks.push(value);
  }
  return blocks;
}

export type { FlowNode, FlowEdge, ErRelation };
