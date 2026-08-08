import type { LayoutRect } from "../core/types";
import type { AlgorithmVisualizerGraphState } from "./trace";

type Point = { x: number; y: number };

export type AlgorithmVisualizerSelection = {
  elementId: string;
  kind: "node" | "edge";
  label: string;
  detail: string;
};

export type AlgorithmVisualizerCanvasElement = {
  id?: string;
  type?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  points?: unknown;
  start?: unknown;
  end?: unknown;
  startBinding?: unknown;
  endBinding?: unknown;
  startArrowhead?: unknown;
  endArrowhead?: unknown;
  strokeColor?: string;
  backgroundColor?: string;
  fillStyle?: string;
  strokeWidth?: number;
  strokeStyle?: string;
  opacity?: number;
  roundness?: unknown;
  angle?: number;
  boundElements?: unknown;
  containerId?: unknown;
  frameId?: unknown;
  groupIds?: unknown;
  label?: unknown;
  text?: string;
  originalText?: string;
  fontFamily?: number;
  textAlign?: string;
  verticalAlign?: string;
  autoResize?: boolean;
  fontSize?: number;
  customData?: unknown;
  isDeleted?: boolean;
  locked?: boolean;
};

const SHARED_FIELDS = [
  "id", "type", "strokeColor", "backgroundColor", "fillStyle", "strokeWidth", "strokeStyle", "opacity",
  "roundness", "angle", "boundElements", "containerId", "frameId", "groupIds", "label", "text", "originalText",
  "fontFamily", "textAlign", "verticalAlign", "autoResize", "fontSize", "customData", "isDeleted", "locked",
] as const;

const EDGE_FIELDS = [
  ...SHARED_FIELDS, "x", "y", "width", "height", "points", "start", "end", "startBinding", "endBinding",
  "startArrowhead", "endArrowhead",
] as const;

const NODE_FIELDS = [...SHARED_FIELDS, "x", "y", "width", "height"] as const;

function sceneSignature(element: AlgorithmVisualizerCanvasElement, fields: readonly string[]): string {
  return JSON.stringify(Object.fromEntries(fields.map((field) => [field, element[field as keyof AlgorithmVisualizerCanvasElement]])));
}

function nodeId(value: string | number): string {
  return String(value);
}

function nodeLabel(node: AlgorithmVisualizerGraphState["nodes"][number]): string {
  return node.weight === null || node.weight === undefined ? nodeId(node.id) : String(node.weight);
}

function nodeKey(value: string | number): string {
  return `node:${nodeId(value)}`;
}

function edgeKey(source: string | number, target: string | number): string {
  return `edge:${nodeId(source)}-${nodeId(target)}`;
}

function selectedElementId(selectedElementIds: Readonly<Record<string, boolean>> | null | undefined): string | null {
  return Object.entries(selectedElementIds ?? {}).find(([, selected]) => selected)?.[0] ?? null;
}

export function projectAlgorithmVisualizerSelection(
  state: AlgorithmVisualizerGraphState,
  selectedElementIds: Readonly<Record<string, boolean>> | null | undefined,
): AlgorithmVisualizerSelection | null {
  const elementId = selectedElementId(selectedElementIds);
  if (!elementId) return null;

  const node = state.nodes.find((candidate) => nodeKey(candidate.id) === elementId);
  if (node) {
    const color = node.color ? `${node.color} · ` : "";
    return {
      elementId,
      kind: "node",
      label: nodeLabel(node),
      detail: `${color}visited ${node.visitedCount} · selected ${node.selectedCount}`,
    };
  }

  const edge = state.edges.find((candidate) => edgeKey(candidate.source, candidate.target) === elementId);
  if (!edge) return null;
  return {
    elementId,
    kind: "edge",
    label: `${nodeId(edge.source)} → ${nodeId(edge.target)}`,
    detail: `visited ${edge.visitedCount} · selected ${edge.selectedCount}`,
  };
}

function boundary(center: Point, radius: number, toward: Point): Point {
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  const distance = Math.hypot(dx, dy) || 1;
  return { x: center.x + (dx / distance) * radius, y: center.y + (dy / distance) * radius };
}

function layoutForNode(state: AlgorithmVisualizerGraphState, layout: Record<string, LayoutRect>, id: string | number): LayoutRect {
  const existing = layout[nodeKey(id)];
  if (existing) return existing;
  const node = state.nodes.find((candidate) => candidate.id === id);
  return { x: (node?.x ?? 0) + 180, y: (node?.y ?? 0) + 180, width: 72, height: 72 };
}

export function createAlgorithmVisualizerGraphSkeletons(
  state: AlgorithmVisualizerGraphState,
  layout: Record<string, LayoutRect>,
): unknown[] {
  const skeletons: unknown[] = [];
  const centers = new Map<string | number, Point>();

  for (const node of state.nodes) {
    const rect = layoutForNode(state, layout, node.id);
    centers.set(node.id, { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
  }

  for (const edge of state.edges) {
    const source = centers.get(edge.source);
    const target = centers.get(edge.target);
    if (!source || !target) continue;
    const sourceRect = layoutForNode(state, layout, edge.source);
    const targetRect = layoutForNode(state, layout, edge.target);
    const start = boundary(source, sourceRect.width / 2, target);
    const end = boundary(target, targetRect.width / 2, source);
    const selected = edge.selectedCount > 0;
    const visited = edge.visitedCount > 0;
    skeletons.push({
      type: "arrow",
      id: edgeKey(edge.source, edge.target),
      x: start.x,
      y: start.y,
      points: [[0, 0], [end.x - start.x, end.y - start.y]],
      start: { id: nodeKey(edge.source) },
      end: { id: nodeKey(edge.target) },
      strokeColor: selected ? "#f2b84b" : visited ? "#63a7ff" : "#7f8ea3",
      strokeWidth: selected ? 4 : visited ? 3 : 2,
      strokeStyle: selected ? "dashed" : "solid",
      endArrowhead: state.isDirected ? "arrow" : null,
      customData: { componentType: "algorithm-visualizer-edge", componentId: edgeKey(edge.source, edge.target), role: "edge" },
    });
  }

  for (const node of state.nodes) {
    const rect = layoutForNode(state, layout, node.id);
    const selected = node.selectedCount > 0;
    const visited = node.visitedCount > 0;
    const badge = selected ? "focus" : visited ? `visited ×${node.visitedCount}` : node.color ?? "idle";
    const semanticBackground = node.color === "red" ? "#762b39" : node.color === "black" ? "#0d1117" : visited ? "#193451" : "#20232b";
    const semanticStroke = node.color === "red" ? "#ff8290" : node.color === "black" ? "#d1d9e6" : visited ? "#63a7ff" : "#7f8ea3";
    skeletons.push({
      type: "ellipse",
      id: nodeKey(node.id),
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      backgroundColor: semanticBackground,
      strokeColor: selected ? "#f2b84b" : semanticStroke,
      strokeWidth: selected ? 4 : visited ? 3 : 2,
      label: { text: `${nodeLabel(node)}\n${badge}`, fontSize: 16 },
      customData: { componentType: "algorithm-visualizer-node", componentId: nodeKey(node.id), role: "vertex", label: nodeLabel(node), color: node.color },
    });
  }
  return skeletons;
}

export function captureAlgorithmVisualizerGraphLayout(
  elements: readonly AlgorithmVisualizerCanvasElement[],
  previous: Record<string, LayoutRect>,
): Record<string, LayoutRect> {
  const next = Object.fromEntries(Object.entries(previous).map(([id, rect]) => [id, { ...rect }])) as Record<string, LayoutRect>;
  for (const element of elements) {
    if (!element.id?.startsWith("node:") || element.x == null || element.y == null) continue;
    const previousRect = next[element.id];
    if (!previousRect) continue;
    next[element.id] = {
      x: element.x,
      y: element.y,
      width: element.width ?? previousRect.width,
      height: element.height ?? previousRect.height,
    };
  }
  return next;
}

export function isAlgorithmVisualizerGraphSceneSafe(
  nextElements: readonly AlgorithmVisualizerCanvasElement[],
  canonicalElements: readonly AlgorithmVisualizerCanvasElement[],
): boolean {
  if (nextElements.length !== canonicalElements.length) return false;
  const nextById = new Map(nextElements.map((element) => [element.id, element]));
  return canonicalElements.every((canonical) => {
    const next = nextById.get(canonical.id);
    if (!next) return false;
    const fields = canonical.id?.startsWith("node:") ? SHARED_FIELDS : EDGE_FIELDS;
    return sceneSignature(next, fields) === sceneSignature(canonical, fields);
  });
}

export function isAlgorithmVisualizerGraphSceneExact(
  nextElements: readonly AlgorithmVisualizerCanvasElement[],
  canonicalElements: readonly AlgorithmVisualizerCanvasElement[],
): boolean {
  if (nextElements.length !== canonicalElements.length) return false;
  const nextById = new Map(nextElements.map((element) => [element.id, element]));
  return canonicalElements.every((canonical) => {
    const next = nextById.get(canonical.id);
    if (!next) return false;
    const fields = canonical.id?.startsWith("node:") ? NODE_FIELDS : EDGE_FIELDS;
    return sceneSignature(next, fields) === sceneSignature(canonical, fields);
  });
}
