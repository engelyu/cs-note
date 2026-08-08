declare module "../vendor/excalidraw/excalidraw.js" {
  export const Excalidraw: React.ComponentType<Record<string, unknown>>;
  export const convertToExcalidrawElements: (elements: unknown[]) => unknown[];
}
