import assert from "node:assert/strict";
import test from "node:test";
import {
  isHostToWebviewMessage,
  isWebviewToHostMessage,
} from "../src/codeOss/protocol.ts";

const validLayout = {
  "node:A": { x: 100, y: 120, width: 84, height: 84 },
  "node:B": { x: 320, y: 120, width: 84, height: 84 },
};

const validOpenPackage = {
  version: 1,
  type: "open-package",
  packageId: "tarjan-scc",
  scenarioId: "simple-cycle",
  replayIndex: 0,
  layout: null,
  selectedIds: [],
};

test("Code-OSS messages reject unknown versions and semantic edits", () => {
  assert.equal(isHostToWebviewMessage(validOpenPackage), true);
  assert.equal(isHostToWebviewMessage({ ...validOpenPackage, version: 2 }), false);
  assert.equal(isWebviewToHostMessage({ version: 1, type: "set-node-color", id: "node:A" }), false);
});

test("host-to-webview guards accept each supported message shape", () => {
  assert.equal(isHostToWebviewMessage(validOpenPackage), true);
  assert.equal(isHostToWebviewMessage({
    ...validOpenPackage,
    replayIndex: 3,
    layout: validLayout,
    selectedIds: ["node:A"],
  }), true);
  assert.equal(isHostToWebviewMessage({ version: 1, type: "host-error", message: "Package unavailable" }), true);
});

test("webview-to-host guard accepts each supported message shape", () => {
  assert.equal(isWebviewToHostMessage({ version: 1, type: "ready" }), true);
  assert.equal(isWebviewToHostMessage({ version: 1, type: "replay-changed", replayIndex: 4 }), true);
  assert.equal(isWebviewToHostMessage({ version: 1, type: "layout-changed", layout: validLayout }), true);
  assert.equal(isWebviewToHostMessage({ version: 1, type: "selection-changed", selectedIds: ["node:B"] }), true);
  assert.equal(isWebviewToHostMessage({ version: 1, type: "webview-error", message: "Canvas failed" }), true);
});

test("host-to-webview guard rejects malformed properties and types", () => {
  const malformedMessages = [
    null,
    "message",
    {},
    { version: "1", type: "host-error", message: "error" },
    { version: 1, type: "host-error", message: 7 },
    { ...validOpenPackage, packageId: "other-package" },
    { ...validOpenPackage, scenarioId: "other-scenario" },
    { ...validOpenPackage, replayIndex: 1.5 },
    { ...validOpenPackage, replayIndex: -1 },
    { ...validOpenPackage, replayIndex: "0" },
    { ...validOpenPackage, selectedIds: "node:A" },
    { ...validOpenPackage, selectedIds: ["node:A", 2] },
    { version: 1, type: "unknown" },
  ];

  for (const message of malformedMessages) assert.equal(isHostToWebviewMessage(message), false);
});

test("webview-to-host guard rejects malformed properties and types", () => {
  const malformedMessages = [
    null,
    { version: 2, type: "ready" },
    { version: 1, type: "replay-changed", replayIndex: 1.5 },
    { version: 1, type: "replay-changed", replayIndex: -1 },
    { version: 1, type: "replay-changed", replayIndex: "0" },
    { version: 1, type: "layout-changed", layout: null },
    { version: 1, type: "selection-changed", selectedIds: [1] },
    { version: 1, type: "selection-changed", selectedIds: {} },
    { version: 1, type: "webview-error", message: false },
    { version: 1, type: "unknown" },
  ];

  for (const message of malformedMessages) assert.equal(isWebviewToHostMessage(message), false);
});

test("message guards reject layouts with malformed geometry", () => {
  const invalidRects = [
    { x: 100, y: 120, width: 0, height: 84 },
    { x: 100, y: 120, width: 84, height: -1 },
    { x: 100, y: 120, width: Number.NaN, height: 84 },
    { x: Number.POSITIVE_INFINITY, y: 120, width: 84, height: 84 },
    { x: 100, y: "120", width: 84, height: 84 },
    { x: 100, y: 120, width: 84 },
  ];

  for (const rect of invalidRects) {
    const layout = { "node:A": rect };
    assert.equal(isHostToWebviewMessage({ ...validOpenPackage, layout }), false);
    assert.equal(isWebviewToHostMessage({ version: 1, type: "layout-changed", layout }), false);
  }
});
