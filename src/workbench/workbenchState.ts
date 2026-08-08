export const PARTS = ["activityBar", "primarySideBar", "secondarySideBar", "panel", "statusBar"] as const;
export type WorkbenchPart = typeof PARTS[number];
export type PrimaryPosition = "left" | "right";
export type PanelAlignment = "center" | "left" | "right" | "justify";

export type WorkbenchSizes = {
  primaryW: number;
  secondaryW: number;
  panelH: number;
};

export type WorkbenchState = {
  version: 1;
  visible: Record<WorkbenchPart, boolean>;
  primaryPosition: PrimaryPosition;
  panelAlignment: PanelAlignment;
  sizes: WorkbenchSizes;
  activeView: {
    primary: string | null;
    secondary: string | null;
    panel: string | null;
  };
};

export const LIMITS = {
  primaryW: { min: 170, max: 800, def: 260 },
  secondaryW: { min: 170, max: 800, def: 300 },
  panelH: { min: 80, max: 900, def: 200 },
} as const;

export const DEFAULTS: WorkbenchState = Object.freeze({
  version: 1,
  visible: Object.freeze({
    activityBar: true,
    primarySideBar: true,
    secondarySideBar: false,
    panel: true,
    statusBar: true,
  }),
  primaryPosition: "left",
  panelAlignment: "center",
  sizes: Object.freeze({ primaryW: 260, secondaryW: 300, panelH: 200 }),
  activeView: Object.freeze({ primary: null, secondary: null, panel: null }),
});

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly unknown[]).includes(value) ? value as T : fallback;
}

function pickNumber(value: unknown, limits: { min: number; max: number; def: number }): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return limits.def;
  return Math.max(limits.min, Math.min(limits.max, value));
}

function pickId(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function cloneWorkbenchState(state: WorkbenchState): WorkbenchState {
  return JSON.parse(JSON.stringify(state)) as WorkbenchState;
}

export function sanitizeWorkbenchState(raw: unknown): WorkbenchState {
  const source = raw !== null && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const visibleSource = source.visible !== null && typeof source.visible === "object" ? source.visible as Record<string, unknown> : {};
  const sizeSource = source.sizes !== null && typeof source.sizes === "object" ? source.sizes as Record<string, unknown> : {};
  const activeSource = source.activeView !== null && typeof source.activeView === "object" ? source.activeView as Record<string, unknown> : {};

  const visible = {} as Record<WorkbenchPart, boolean>;
  for (const part of PARTS) {
    visible[part] = typeof visibleSource[part] === "boolean"
      ? visibleSource[part] as boolean
      : DEFAULTS.visible[part];
  }

  return {
    version: 1,
    visible,
    primaryPosition: pickEnum(source.primaryPosition, ["left", "right"], DEFAULTS.primaryPosition),
    panelAlignment: pickEnum(source.panelAlignment, ["center", "left", "right", "justify"], DEFAULTS.panelAlignment),
    sizes: {
      primaryW: pickNumber(sizeSource.primaryW, LIMITS.primaryW),
      secondaryW: pickNumber(sizeSource.secondaryW, LIMITS.secondaryW),
      panelH: pickNumber(sizeSource.panelH, LIMITS.panelH),
    },
    activeView: {
      primary: pickId(activeSource.primary),
      secondary: pickId(activeSource.secondary),
      panel: pickId(activeSource.panel),
    },
  };
}

export function columnOrder(state: Pick<WorkbenchState, "primaryPosition">): Array<"activityBar" | "primarySideBar" | "editor" | "secondarySideBar"> {
  return state.primaryPosition === "right"
    ? ["secondarySideBar", "editor", "primarySideBar", "activityBar"]
    : ["activityBar", "primarySideBar", "editor", "secondarySideBar"];
}

export function panelColumnSpan(state: Pick<WorkbenchState, "primaryPosition" | "panelAlignment">): [number, number] {
  const primaryIsLeft = state.primaryPosition !== "right";
  const workspaceStart = primaryIsLeft ? 2 : 1;
  const workspaceEnd = primaryIsLeft ? 5 : 4;
  const editorStart = primaryIsLeft ? 3 : 2;
  const editorEnd = editorStart + 1;
  switch (state.panelAlignment) {
    case "left": return [workspaceStart, editorEnd];
    case "right": return [editorStart, workspaceEnd];
    case "justify": return [workspaceStart, workspaceEnd];
    default: return [editorStart, editorEnd];
  }
}

export function panelCovers(state: Pick<WorkbenchState, "primaryPosition" | "panelAlignment">, part: "primarySideBar" | "secondarySideBar"): boolean {
  const line = columnOrder(state).indexOf(part) + 1;
  if (line < 1) return false;
  const [start, end] = panelColumnSpan(state);
  return start <= line && end >= line + 1;
}
