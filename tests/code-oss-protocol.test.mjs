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

test("message guards reject prototype-inherited fields", () => {
  const inheritedHostMessage = Object.assign(
    Object.create({ message: "inherited error" }),
    { version: 1, type: "host-error" },
  );
  const inheritedWebviewMessage = Object.assign(
    Object.create({ type: "ready" }),
    { version: 1 },
  );

  assert.equal(isHostToWebviewMessage(inheritedHostMessage), false);
  assert.equal(isWebviewToHostMessage(inheritedWebviewMessage), false);
});

test("message guards reject inherited layout entries and geometry", () => {
  const inheritedLayout = Object.create({ "node:B": validLayout["node:B"] });
  const inheritedRect = Object.assign(
    Object.create({ height: 84 }),
    { x: 100, y: 120, width: 84 },
  );

  for (const layout of [inheritedLayout, { "node:A": inheritedRect }]) {
    assert.equal(isHostToWebviewMessage({ ...validOpenPackage, layout }), false);
    assert.equal(isWebviewToHostMessage({ version: 1, type: "layout-changed", layout }), false);
  }
});

test("message guards reject extra keys on every protocol variant", () => {
  const hostMessages = [
    { ...validOpenPackage, extra: true },
    { version: 1, type: "host-error", message: "Package unavailable", extra: true },
  ];
  const webviewMessages = [
    { version: 1, type: "ready", extra: true },
    { version: 1, type: "replay-changed", replayIndex: 1, extra: true },
    { version: 1, type: "layout-changed", layout: validLayout, extra: true },
    { version: 1, type: "selection-changed", selectedIds: [], extra: true },
    { version: 1, type: "webview-error", message: "Canvas failed", extra: true },
  ];

  for (const message of hostMessages) assert.equal(isHostToWebviewMessage(message), false);
  for (const message of webviewMessages) assert.equal(isWebviewToHostMessage(message), false);
});

test("message guards reject non-plain record objects", () => {
  const dateMessage = Object.assign(new Date(0), {
    version: 1,
    type: "host-error",
    message: "Date object",
  });
  const mapMessage = Object.assign(new Map(), { version: 1, type: "ready" });

  assert.equal(isHostToWebviewMessage(dateMessage), false);
  assert.equal(isWebviewToHostMessage(mapMessage), false);
});
