import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../vendor/excalidraw/excalidraw.js", import.meta.url);
const source = await readFile(bundlePath, "utf8");
const droppedTools = "tools:{image:A.UIOptions?.tools?.image??!0}";
const preservedTools = "tools:{...A.UIOptions?.tools,image:A.UIOptions?.tools?.image??!0}";

assert.equal(source.split(droppedTools).length - 1, 1, "Unexpected Excalidraw bundle layout");
await writeFile(bundlePath, source.replace(droppedTools, preservedTools));
console.log("Preserved Excalidraw UIOptions.tools in the vendored wrapper");
