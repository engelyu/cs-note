export type LayoutRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type HostToWebviewMessage =
  | { version: 1; type: "open-package"; packageId: "tarjan-scc"; scenarioId: "simple-cycle"; replayIndex: number; layout: Record<string, LayoutRect> | null; selectedIds: string[] }
  | { version: 1; type: "host-error"; message: string };

export type WebviewToHostMessage =
  | { version: 1; type: "ready" }
  | { version: 1; type: "replay-changed"; replayIndex: number }
  | { version: 1; type: "layout-changed"; layout: Record<string, LayoutRect> }
  | { version: 1; type: "selection-changed"; selectedIds: string[] }
  | { version: 1; type: "webview-error"; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const ownKeys = Reflect.ownKeys(value);
  return ownKeys.length === keys.length
    && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function isLayoutRect(value: unknown): value is LayoutRect {
  return isRecord(value)
    && hasExactKeys(value, ["x", "y", "width", "height"])
    && [value.x, value.y, value.width, value.height].every((entry) => typeof entry === "number" && Number.isFinite(entry))
    && value.width > 0 && value.height > 0;
}

function hasOnlyOwnEnumerableKeys(value: Record<string, unknown>): boolean {
  for (const key in value) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) return false;
  }
  return true;
}

function isLayout(value: unknown): value is Record<string, LayoutRect> {
  return isRecord(value)
    && hasOnlyOwnEnumerableKeys(value)
    && Reflect.ownKeys(value).every((key) => typeof key === "string" && isLayoutRect(value[key]));
}

export function isHostToWebviewMessage(value: unknown): value is HostToWebviewMessage {
  if (!isRecord(value) || value.version !== 1 || typeof value.type !== "string") return false;
  if (value.type === "host-error") {
    return hasExactKeys(value, ["version", "type", "message"]) && typeof value.message === "string";
  }
  return value.type === "open-package"
    && hasExactKeys(value, ["version", "type", "packageId", "scenarioId", "replayIndex", "layout", "selectedIds"])
    && value.packageId === "tarjan-scc"
    && value.scenarioId === "simple-cycle"
    && Number.isInteger(value.replayIndex)
    && value.replayIndex >= 0
    && (value.layout === null || isLayout(value.layout))
    && Array.isArray(value.selectedIds)
    && value.selectedIds.every((id) => typeof id === "string");
}

export function isWebviewToHostMessage(value: unknown): value is WebviewToHostMessage {
  if (!isRecord(value) || value.version !== 1 || typeof value.type !== "string") return false;
  if (value.type === "ready") return hasExactKeys(value, ["version", "type"]);
  if (value.type === "replay-changed") {
    return hasExactKeys(value, ["version", "type", "replayIndex"])
      && Number.isInteger(value.replayIndex)
      && value.replayIndex >= 0;
  }
  if (value.type === "layout-changed") {
    return hasExactKeys(value, ["version", "type", "layout"]) && isLayout(value.layout);
  }
  if (value.type === "selection-changed") {
    return hasExactKeys(value, ["version", "type", "selectedIds"])
      && Array.isArray(value.selectedIds)
      && value.selectedIds.every((id) => typeof id === "string");
  }
  return value.type === "webview-error"
    && hasExactKeys(value, ["version", "type", "message"])
    && typeof value.message === "string";
}
