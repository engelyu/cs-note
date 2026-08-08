import assert from "node:assert/strict";
import test from "node:test";
import { createTarjanFrames } from "../src/visualizations/tarjan.ts";
import { tarjanPackage } from "../src/visualizations/tarjanRuntime.ts";
import { stabilizeExcalidrawElementIds } from "../src/excalidrawIds.ts";
import {
  captureTarjanLayout,
  createTarjanSkeletons,
  isTarjanSceneExact,
  isTarjanSceneSafe,
} from "../src/visualizations/tarjanScene.ts";
import {
  projectTarjanCallStack,
  projectTarjanConcepts,
  projectTarjanTimeline,
  projectTarjanVariables,
} from "../src/visualizations/tarjanProjections.ts";

test("Tarjan package exposes a replayable semantic scenario", () => {
  assert.equal(tarjanPackage.schemaVersion, 1);
  assert.deepEqual(tarjanPackage.views.map((view) => view.id), [
    "graph",
    "variables",
    "call-stack",
    "concepts",
    "timeline",
  ]);
  assert.equal(tarjanPackage.scenarios.length, 1);
  assert.ok(tarjanPackage.scenarios[0].frames.length > 1);
  assert.equal(tarjanPackage.scenarios[0].capabilities.toggleView, true);
  assert.equal(tarjanPackage.scenarios[0].capabilities.editLayout, true);
  assert.equal(tarjanPackage.scenarios[0].capabilities.editInput, false);
  assert.equal(tarjanPackage.scenarios[0].capabilities.rerun, false);
  assert.equal(tarjanPackage.scenarios[0].frames.length, createTarjanFrames().length);
  const artifactFinalState = tarjanPackage.scenarios[0].frames.at(-1)?.state;
  assert.deepEqual(artifactFinalState.components, [[4], [3], [0, 1, 2]]);
});

test("Tarjan frames preserve the teaching concepts behind SCC detection", () => {
  const frames = createTarjanFrames();
  const finalState = frames.at(-1)?.state;

  assert.ok(finalState);
  const memberships = finalState.components
    .map((component) => [...component].sort((a, b) => a - b))
    .sort((left, right) => left[0] - right[0]);
  assert.deepEqual(memberships, [[0, 1, 2], [3], [4]]);
  assert.equal(finalState.stack.length, 0);
  assert.equal(finalState.onStack.some(Boolean), false);
  assert.ok(frames.some((frame) => frame.event.phase === "back-edge"));
  assert.ok(frames.some((frame) => frame.event.phase === "scc"));
  assert.ok(frames.some((frame) => frame.event.focus?.kind === "concept"));
  assert.deepEqual(frames.filter((frame) => frame.event.phase === "scc").map((frame) => frame.state.components.at(-1)), [[4], [3], [0, 1, 2]]);
});

test("Tarjan frames are independently snapshotted", () => {
  const frames = createTarjanFrames();
  const earlier = frames[1];
  const later = frames[2];

  earlier.state.labels[0] = "mutated";
  earlier.state.edges[0].from = 99;
  earlier.state.stack.push(99);

  assert.equal(later.state.labels[0], "A");
  assert.equal(later.state.edges[0].from, 0);
  assert.deepEqual(later.state.stack, [0]);
});

test("Graph Canvas layout edits stay separate from semantic state", () => {
  const frame = createTarjanFrames()[1];
  const originalLayout = {
    "node:A": { x: 110, y: 90, width: 64, height: 64 },
    "node:B": { x: 290, y: 90, width: 64, height: 64 },
    "node:C": { x: 200, y: 250, width: 64, height: 64 },
    "node:D": { x: 440, y: 90, width: 64, height: 64 },
    "node:E": { x: 440, y: 250, width: 64, height: 64 },
  };
  const movedElements = [
    { id: "node:A", x: 180, y: 130, width: 96, height: 80 },
    { id: "edge:0-1", x: 999, y: 999, width: 500, height: 500 },
    { id: "unrelated-scene-edit", x: 50, y: 50, width: 12, height: 12 },
  ];

  const nextLayout = captureTarjanLayout(movedElements, originalLayout);
  const projected = createTarjanSkeletons(frame.state, nextLayout);
  const nodeA = projected.find((element) => element.id === "node:A");
  const edge = projected.find((element) => element.id === "edge:0-1");

  assert.deepEqual(nextLayout["node:A"], { x: 180, y: 130, width: 96, height: 80 });
  assert.deepEqual(nextLayout["node:B"], originalLayout["node:B"]);
  assert.equal(nodeA.x, 180);
  assert.equal(nodeA.y, 130);
  assert.notEqual(edge.x, 999);
  assert.notEqual(edge.y, 999);
  assert.equal(frame.state.labels[frame.state.current], "A");
  assert.equal(frame.state.edges.length, 5);
});

test("Graph Canvas restores semantic edits while preserving node layout edits", () => {
  const frame = createTarjanFrames()[1];
  const layout = {
    "node:A": { x: 110, y: 90, width: 64, height: 64 },
    "node:B": { x: 290, y: 90, width: 64, height: 64 },
    "node:C": { x: 200, y: 250, width: 64, height: 64 },
    "node:D": { x: 440, y: 90, width: 64, height: 64 },
    "node:E": { x: 440, y: 250, width: 64, height: 64 },
  };
  const canonical = createTarjanSkeletons(frame.state, layout);
  const movedNode = canonical.map((element) => element.id === "node:A"
    ? { ...element, x: 180, y: 130, width: 96, height: 80 }
    : element);
  const recoloredNode = canonical.map((element) => element.id === "node:A"
    ? { ...element, backgroundColor: "#ffffff" }
    : element);
  const deletedNode = canonical.map((element) => element.id === "node:A"
    ? { ...element, isDeleted: true }
    : element);
  const addedElement = [...canonical, { id: "user-drawn-line", type: "line" }];

  assert.equal(isTarjanSceneSafe(movedNode, canonical), true);
  assert.equal(isTarjanSceneExact(movedNode, canonical), false);
  assert.equal(isTarjanSceneExact(canonical, canonical), true);
  assert.equal(isTarjanSceneSafe(recoloredNode, canonical), false);
  assert.equal(isTarjanSceneSafe(deletedNode, canonical), false);
  assert.equal(isTarjanSceneSafe(addedElement, canonical), false);
  const focusedElementId = frame.event.focus?.id;
  assert.equal(canonical.some((element) => element.id === focusedElementId), true);
});

test("Canvas adapter gives generated labels stable logical IDs", () => {
  const converted = [
    { id: "node:A", boundElements: [{ type: "text", id: "generated-label" }] },
    { id: "generated-label", type: "text", containerId: "node:A" },
  ];
  const stabilized = stabilizeExcalidrawElementIds(converted, new Set(["node:A"]));

  assert.equal(stabilized[1].id, "label:node:A");
  assert.deepEqual(stabilized[0].boundElements, [{ type: "text", id: "label:node:A" }]);
});

test("Debugger projections derive from the current semantic frame", () => {
  const frames = createTarjanFrames();
  const frame = frames.find((candidate) => candidate.event.phase === "back-edge");

  assert.ok(frame);
  const variables = projectTarjanVariables(frame);
  const callStack = projectTarjanCallStack(frame);
  const concepts = projectTarjanConcepts(frame);
  const timeline = projectTarjanTimeline(frames, frame.index);

  assert.equal(variables.find((row) => row.label === "A")?.onStack, true);
  assert.equal(variables.find((row) => row.label === "C")?.focused, true);
  assert.equal(projectTarjanVariables(frames.at(-1)).find((row) => row.label === "A")?.component, "A, B, C");
  assert.equal(callStack[0]?.label, "C");
  assert.equal(callStack[0]?.active, true);
  assert.equal(concepts.find((concept) => concept.id === "low-link")?.detail, "low[C] = 0");
  assert.equal(concepts.find((concept) => concept.id === "scc")?.focus.id, "scc");
  assert.equal(timeline[frame.index]?.active, true);
  assert.equal(timeline[frame.index]?.eventId, frame.event.id);
  assert.equal(timeline[frame.index]?.focus?.kind, "entity");

  const sccFrame = frames.find((candidate) => candidate.event.phase === "scc");
  assert.ok(sccFrame);
  assert.equal(projectTarjanConcepts(sccFrame).find((concept) => concept.id === "scc")?.active, true);
});
