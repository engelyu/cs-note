// The vendor is a pinned ESM build copied from the verified dsvisual integration.
// @ts-expect-error The vendored bundle intentionally has no TypeScript declarations.
import * as module from "../vendor/excalidraw/excalidraw.js";

export const Excalidraw = module.Excalidraw as React.ComponentType<Record<string, unknown>>;
export const convertToExcalidrawElements = module.convertToExcalidrawElements as (
  elements: unknown[],
) => unknown[];
