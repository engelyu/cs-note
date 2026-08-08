// The vendor is a pinned ESM build copied from the verified dsvisual integration.
// @ts-expect-error The vendored bundle intentionally has no TypeScript declarations.
import * as module from "../vendor/excalidraw/excalidraw.js";
import { stabilizeExcalidrawElementIds } from "./excalidrawIds";

export { stabilizeExcalidrawElementIds } from "./excalidrawIds";

export const Excalidraw = module.Excalidraw as React.ComponentType<Record<string, unknown>>;
export const convertToExcalidrawElements = module.convertToExcalidrawElements as (
  elements: unknown[],
  options?: { regenerateIds?: boolean },
) => unknown[];

export function convertToStableExcalidrawElements(elements: unknown[]): unknown[] {
  const inputIds = new Set(
    elements.flatMap((element) => {
      const record = element !== null && typeof element === "object" ? element as { id?: unknown } : null;
      return typeof record?.id === "string" ? [record.id] : [];
    }),
  );
  return stabilizeExcalidrawElementIds(
    convertToExcalidrawElements(elements, { regenerateIds: false }),
    inputIds,
  );
}
