import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../vendor/excalidraw/excalidraw.js", import.meta.url);
const source = await readFile(bundlePath, "utf8");
const droppedTools = "tools:{image:A.UIOptions?.tools?.image??!0}";
const preservedTools = "tools:{...A.UIOptions?.tools,image:A.UIOptions?.tools?.image??!0}";

const droppedCount = source.split(droppedTools).length - 1;
const preservedCount = source.split(preservedTools).length - 1;

if (droppedCount === 1 && preservedCount === 0) {
  await writeFile(bundlePath, source.replace(droppedTools, preservedTools));
  console.log("Preserved Excalidraw UIOptions.tools in the vendored wrapper");
} else {
  assert.equal(preservedCount, 1, "Unexpected Excalidraw bundle layout");
  assert.equal(droppedCount, 0, "Excalidraw UIOptions.tools patch appears twice");
  console.log("Excalidraw UIOptions.tools already preserved in the vendored wrapper");
}
