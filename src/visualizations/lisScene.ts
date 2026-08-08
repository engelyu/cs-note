import type { LayoutRect } from "../core/types";
import type { LisState } from "./lisModel";
import type { CanvasElementSnapshot } from "./tarjanScene";

const SHARED_FIELDS = [
  "id", "type", "strokeColor", "backgroundColor", "fillStyle", "strokeWidth", "strokeStyle",
  "roughness", "opacity", "roundness", "angle", "boundElements", "containerId", "frameId",
  "groupIds", "label", "text", "originalText", "fontFamily", "textAlign", "verticalAlign",
  "autoResize", "fontSize", "customData", "isDeleted", "locked",
] as const;
const CELL_FIELDS = [...SHARED_FIELDS, "x", "y", "width", "height"] as const;
const LINK_FIELDS = [...SHARED_FIELDS, "x", "y", "width", "height", "points", "start", "end", "startBinding", "endBinding", "startArrowhead", "endArrowhead"] as const;

function signature(element: CanvasElementSnapshot, fields: readonly string[]): string {
  return JSON.stringify(Object.fromEntries(fields.map((field) => [field, element[field as keyof CanvasElementSnapshot]])));
}

function compareScene(
  nextElements: readonly CanvasElementSnapshot[],
  canonicalElements: readonly CanvasElementSnapshot[],
  includeGeometry: boolean,
): boolean {
  if (nextElements.length !== canonicalElements.length) return false;
  const nextById = new Map(nextElements.map((element) => [element.id, element]));
  return canonicalElements.every((canonical) => {
    const next = nextById.get(canonical.id);
    if (!next) return false;
    const fields = canonical.id?.startsWith("cell:")
      ? (includeGeometry ? CELL_FIELDS : SHARED_FIELDS)
      : LINK_FIELDS;
    return signature(next, fields) === signature(canonical, fields);
  });
}

export function isLisSceneSafe(next: readonly CanvasElementSnapshot[], canonical: readonly CanvasElementSnapshot[]): boolean {
  return compareScene(next, canonical, false);
}

export function isLisSceneExact(next: readonly CanvasElementSnapshot[], canonical: readonly CanvasElementSnapshot[]): boolean {
  return compareScene(next, canonical, true);
}

export function captureLisLayout(
  elements: readonly CanvasElementSnapshot[],
  previous: Record<string, LayoutRect>,
): Record<string, LayoutRect> {
  const next = Object.fromEntries(Object.entries(previous).map(([id, rect]) => [id, { ...rect }])) as Record<string, LayoutRect>;
  for (const element of elements) {
    if (!element.id?.startsWith("cell:") || element.x == null || element.y == null) continue;
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

export function createLisSkeletons(state: LisState, layout: Record<string, LayoutRect>): unknown[] {
  const skeletons: unknown[] = [];
  for (let index = 0; index < state.values.length; index += 1) {
    const predecessor = state.prev[index];
    if (predecessor === null) continue;
    const from = layout[`cell:${predecessor}`];
    const to = layout[`cell:${index}`];
    const active = state.activePair?.from === predecessor && state.activePair.to === index;
    skeletons.push({
      type: "arrow",
      id: `link:${predecessor}-${index}`,
      x: from.x + from.width,
      y: from.y + from.height / 2,
      points: [[0, 0], [to.x - from.x - from.width, to.y - from.y]],
      start: { id: `cell:${predecessor}` },
      end: { id: `cell:${index}` },
      strokeColor: active ? "#f2b84b" : "#6b778a",
      strokeWidth: active ? 3 : 2,
      strokeStyle: active ? "dashed" : "solid",
      endArrowhead: "arrow",
      customData: { componentType: "lis-predecessor", componentId: `link:${predecessor}-${index}`, role: "predecessor" },
    });
  }

  for (let index = 0; index < state.values.length; index += 1) {
    const rect = layout[`cell:${index}`];
    const current = state.currentIndex === index;
    const comparing = state.compareIndex === index;
    const selected = state.sequence.includes(index);
    const best = state.bestIndex === index;
    const fill = selected ? "#173b36" : current ? "#3d321f" : comparing ? "#193451" : "#20232b";
    const stroke = current ? "#f2b84b" : selected ? "#55d6be" : best ? "#9e8cff" : comparing ? "#63a7ff" : "#7f8ea3";
    skeletons.push({
      type: "rectangle",
      id: `cell:${index}`,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      backgroundColor: fill,
      strokeColor: stroke,
      strokeWidth: current ? 4 : 2,
      label: { text: `a[${index}] = ${state.values[index]}\ndp = ${state.dp[index]}`, fontSize: 15 },
      customData: { componentType: "lis-cell", componentId: `cell:${index}`, role: "sequence-cell", index },
    });
  }
  return skeletons;
}
