import type { LayoutRect } from "../core/types";
import type { TarjanState } from "./tarjanModel";

type Point = { x: number; y: number };

export type CanvasElementSnapshot = {
  id?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  type?: string;
  points?: unknown;
  start?: unknown;
  end?: unknown;
  startArrowhead?: unknown;
  endArrowhead?: unknown;
  strokeColor?: string;
  backgroundColor?: string;
  fillStyle?: string;
  strokeWidth?: number;
  strokeStyle?: string;
  roughness?: number;
  opacity?: number;
  roundness?: unknown;
  label?: unknown;
  fontSize?: number;
  customData?: unknown;
};

const SHARED_SCENE_FIELDS = [
  "id",
  "type",
  "strokeColor",
  "backgroundColor",
  "fillStyle",
  "strokeWidth",
  "strokeStyle",
  "roughness",
  "opacity",
  "roundness",
  "label",
  "fontSize",
  "customData",
] as const;

const EDGE_SCENE_FIELDS = [
  ...SHARED_SCENE_FIELDS,
  "x",
  "y",
  "width",
  "height",
  "points",
  "start",
  "end",
  "startArrowhead",
  "endArrowhead",
] as const;

function sceneSignature(element: CanvasElementSnapshot, fields: readonly string[]): string {
  return JSON.stringify(Object.fromEntries(fields.map((field) => [field, element[field as keyof CanvasElementSnapshot]])));
}

export function isTarjanSceneSafe(
  nextElements: readonly CanvasElementSnapshot[],
  canonicalElements: readonly CanvasElementSnapshot[],
): boolean {
  if (nextElements.length !== canonicalElements.length) return false;

  const nextById = new Map(nextElements.map((element) => [element.id, element]));
  return canonicalElements.every((canonical) => {
    const next = nextById.get(canonical.id);
    if (!next) return false;
    const fields = canonical.id?.startsWith("node:") ? SHARED_SCENE_FIELDS : EDGE_SCENE_FIELDS;
    return sceneSignature(next, fields) === sceneSignature(canonical, fields);
  });
}

export function captureTarjanLayout(
  elements: readonly CanvasElementSnapshot[],
  previous: Record<string, LayoutRect>,
): Record<string, LayoutRect> {
  const next = Object.fromEntries(
    Object.entries(previous).map(([id, rect]) => [id, { ...rect }]),
  ) as Record<string, LayoutRect>;

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

function boundary(center: Point, radius: number, toward: Point): Point {
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  const distance = Math.hypot(dx, dy) || 1;
  return { x: center.x + (dx / distance) * radius, y: center.y + (dy / distance) * radius };
}

export function createTarjanSkeletons(
  state: TarjanState,
  layout: Record<string, LayoutRect>,
): unknown[] {
  const skeletons: unknown[] = [];
  const centers = new Map<string, Point>();
  for (const label of state.labels) {
    const rect = layout[`node:${label}`];
    centers.set(label, { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
  }

  for (const edge of state.edges) {
    const fromLabel = state.labels[edge.from];
    const toLabel = state.labels[edge.to];
    const from = centers.get(fromLabel) as Point;
    const to = centers.get(toLabel) as Point;
    const start = boundary(from, layout[`node:${fromLabel}`].width / 2, to);
    const end = boundary(to, layout[`node:${toLabel}`].width / 2, from);
    const active = state.activeEdge?.from === edge.from && state.activeEdge?.to === edge.to;
    const phase = state.activeEdge?.from === edge.from && state.activeEdge?.to === edge.to
      ? state.phase
      : "plain";
    skeletons.push({
      type: "arrow",
      id: `edge:${edge.from}-${edge.to}`,
      x: start.x,
      y: start.y,
      points: [[0, 0], [end.x - start.x, end.y - start.y]],
      start: { id: `node:${fromLabel}` },
      end: { id: `node:${toLabel}` },
      strokeColor: active ? "#f2b84b" : phase === "back-edge" ? "#f7768e" : "#7f8ea3",
      strokeWidth: active ? 3 : 2,
      strokeStyle: phase === "back-edge" ? "dashed" : "solid",
      endArrowhead: "arrow",
      customData: { componentType: "graph-edge", componentId: `edge:${edge.from}-${edge.to}`, role: "edge" },
    });
  }

  for (let index = 0; index < state.labels.length; index += 1) {
    const label = state.labels[index];
    const rect = layout[`node:${label}`];
    const inComponent = state.components.some((component) => component.includes(index));
    const onStack = state.onStack[index];
    const current = state.current === index;
    const fill = inComponent ? "#173b36" : onStack ? "#193451" : "#20232b";
    const stroke = current ? "#f2b84b" : inComponent ? "#55d6be" : onStack ? "#63a7ff" : "#7f8ea3";
    const badge = state.disc[index] === -1 ? "unvisited" : `${state.disc[index]} / ${state.low[index]}`;
    skeletons.push({
      type: "ellipse",
      id: `node:${label}`,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      backgroundColor: fill,
      strokeColor: stroke,
      strokeWidth: current ? 4 : 2,
      label: { text: `${label}\n${badge}`, fontSize: 16 },
      customData: {
        componentType: "graph-node",
        componentId: `node:${label}`,
        role: "vertex",
        label,
      },
    });
  }
  return skeletons;
}
