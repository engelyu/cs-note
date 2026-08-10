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
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLayout(value: unknown): value is Record<string, LayoutRect> {
  return isRecord(value) && Object.values(value).every((rect) => isRecord(rect)
    && [rect.x, rect.y, rect.width, rect.height].every((entry) => typeof entry === "number" && Number.isFinite(entry))
    && rect.width > 0 && rect.height > 0);
}

export function isHostToWebviewMessage(value: unknown): value is HostToWebviewMessage {
  if (!isRecord(value) || value.version !== 1 || typeof value.type !== "string") return false;
  if (value.type === "host-error") return typeof value.message === "string";
  return value.type === "open-package"
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
  if (value.type === "ready") return true;
  if (value.type === "replay-changed") return Number.isInteger(value.replayIndex) && value.replayIndex >= 0;
  if (value.type === "layout-changed") return isLayout(value.layout);
  if (value.type === "selection-changed") return Array.isArray(value.selectedIds) && value.selectedIds.every((id) => typeof id === "string");
  return value.type === "webview-error" && typeof value.message === "string";
}
