import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULTS,
  PARTS,
  columnOrder,
  panelColumnSpan,
  panelCovers,
  sanitizeWorkbenchState,
} from "../src/workbench/workbenchState.ts";

const withState = (over = {}) => ({
  ...structuredClone(DEFAULTS),
  ...over,
  visible: { ...DEFAULTS.visible, ...(over.visible ?? {}) },
  sizes: { ...DEFAULTS.sizes, ...(over.sizes ?? {}) },
  activeView: { ...DEFAULTS.activeView, ...(over.activeView ?? {}) },
});

test("workbench defaults are a complete valid state", () => {
  assert.equal(DEFAULTS.primaryPosition, "left");
  assert.equal(DEFAULTS.panelAlignment, "center");
  for (const part of PARTS) assert.equal(typeof DEFAULTS.visible[part], "boolean");
  assert.deepEqual(sanitizeWorkbenchState(structuredClone(DEFAULTS)), DEFAULTS);
});

test("workbench state sanitizes each persisted field independently", () => {
  const state = sanitizeWorkbenchState({
    version: 99,
    visible: { panel: false, bogusPart: true, statusBar: "yes" },
    primaryPosition: "sideways",
    panelAlignment: "justify",
    sizes: { primaryW: -50, secondaryW: 99999, panelH: 210 },
    activeView: { primary: "explorer", secondary: null, panel: 7 },
  });

  assert.equal(state.visible.panel, false);
  assert.equal(state.visible.statusBar, true);
  assert.equal("bogusPart" in state.visible, false);
  assert.equal(state.primaryPosition, "left");
  assert.equal(state.panelAlignment, "justify");
  assert.equal(state.sizes.primaryW, 170);
  assert.ok(state.sizes.secondaryW <= 800);
  assert.equal(state.sizes.panelH, 210);
  assert.equal(state.activeView.primary, "explorer");
  assert.equal(state.activeView.secondary, null);
  assert.equal(state.activeView.panel, null);
});

test("primary position mirrors the four workbench columns", () => {
  assert.deepEqual(columnOrder(withState({ primaryPosition: "left" })), ["activityBar", "primarySideBar", "editor", "secondarySideBar"]);
  assert.deepEqual(columnOrder(withState({ primaryPosition: "right" })), ["secondarySideBar", "editor", "primarySideBar", "activityBar"]);
});

test("panel alignment maps to CSS grid column spans when primary is left", () => {
  for (const [alignment, span] of Object.entries({ center: [3, 4], left: [2, 4], right: [3, 5], justify: [2, 5] })) {
    assert.deepEqual(panelColumnSpan(withState({ panelAlignment: alignment })), span);
  }
});

test("panel alignment maps to CSS grid column spans when primary is right", () => {
  for (const [alignment, span] of Object.entries({ center: [2, 3], left: [1, 3], right: [2, 4], justify: [1, 4] })) {
    assert.deepEqual(panelColumnSpan(withState({ primaryPosition: "right", panelAlignment: alignment })), span);
  }
});

test("panel coverage follows window alignment instead of primary side", () => {
  const left = (panelAlignment) => withState({ primaryPosition: "left", panelAlignment });
  assert.equal(panelCovers(left("center"), "primarySideBar"), false);
  assert.equal(panelCovers(left("left"), "primarySideBar"), true);
  assert.equal(panelCovers(left("right"), "secondarySideBar"), true);

  const right = (panelAlignment) => withState({ primaryPosition: "right", panelAlignment });
  assert.equal(panelCovers(right("left"), "secondarySideBar"), true);
  assert.equal(panelCovers(right("right"), "primarySideBar"), true);
});
