import assert from "node:assert/strict";
import test from "node:test";
import { createTarjanFrames, tarjanPackage } from "../src/visualizations/tarjan.ts";
import { captureTarjanLayout, createTarjanSkeletons } from "../src/visualizations/tarjanScene.ts";
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
  assert.equal(callStack[0]?.label, "C");
  assert.equal(callStack[0]?.active, true);
  assert.equal(concepts.find((concept) => concept.id === "low-link")?.detail, "low[C] = 0");
  assert.equal(timeline[frame.index]?.active, true);
  assert.equal(timeline[frame.index]?.eventId, frame.event.id);
  assert.equal(timeline[frame.index]?.focus?.kind, "entity");
});
