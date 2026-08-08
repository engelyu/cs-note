import assert from "node:assert/strict";
import test from "node:test";
import {
  importAlgorithmVisualizerCommands,
  replayAlgorithmVisualizerCommands,
  splitAlgorithmVisualizerFrames,
} from "../src/algorithmVisualizer/trace.ts";
import { algorithmVisualizerDfs } from "../src/algorithmVisualizer/dfsRuntime.ts";
import { algorithmVisualizerRedBlackTree } from "../src/algorithmVisualizer/redBlackTreeRuntime.ts";
import {
  createAlgorithmVisualizerGraphSkeletons,
  captureAlgorithmVisualizerGraphLayout,
  isAlgorithmVisualizerGraphSceneExact,
  isAlgorithmVisualizerGraphSceneSafe,
  projectAlgorithmVisualizerSelection,
} from "../src/algorithmVisualizer/graphScene.ts";

const commands = [
  { key: "graph", method: "GraphTracer", args: ["DFS graph"] },
  { key: "log", method: "LogTracer", args: ["Execution"] },
  { key: null, method: "setRoot", args: ["graph"] },
  { key: "graph", method: "directed", args: [true] },
  { key: "graph", method: "addNode", args: ["A", null, 100, 100] },
  { key: "graph", method: "addNode", args: ["B", null, 300, 100] },
  { key: "graph", method: "addEdge", args: ["A", "B"] },
  { key: "log", method: "println", args: ["Start DFS"] },
  { key: null, method: "delay", args: [10] },
  { key: "graph", method: "visit", args: ["B", "A"] },
  { key: "log", method: "println", args: ["Visit B"] },
  { key: null, method: "delay", args: [14] },
  { key: "graph", method: "select", args: ["B"] },
  { key: "log", method: "println", args: ["Focus B"] },
];

test("Algorithm Visualizer command importer validates the command shape", () => {
  assert.deepEqual(importAlgorithmVisualizerCommands(commands), commands);
  assert.throws(
    () => importAlgorithmVisualizerCommands([{ key: "graph", method: "addNode", args: "A" }]),
    /args must be an array/,
  );
  assert.throws(
    () => importAlgorithmVisualizerCommands([{ key: 1, method: "addNode", args: [] }]),
    /key must be a string or null/,
  );
  assert.throws(
    () => importAlgorithmVisualizerCommands([{ key: "graph", method: "", args: [] }]),
    /method must not be empty/,
  );
});

test("Algorithm Visualizer delay commands become ordered replay frames", () => {
  const frames = splitAlgorithmVisualizerFrames(commands);

  assert.equal(frames.length, 3);
  assert.equal(frames[0].lineNumber, 10);
  assert.equal(frames[1].lineNumber, 14);
  assert.equal(frames[2].lineNumber, null);
  assert.equal(frames[0].commands.some((command) => command.method === "delay"), false);
  assert.equal(frames[0].commands.at(-1)?.method, "println");
});

test("Algorithm Visualizer replay exposes graph and log state without the original UI", () => {
  const frames = replayAlgorithmVisualizerCommands(commands);
  const [initial, visited, focused] = frames;

  assert.equal(initial.graph.title, "DFS graph");
  assert.deepEqual(initial.graph.nodes.map((node) => node.id), ["A", "B"]);
  assert.deepEqual(initial.graph.edges, [{ source: "A", target: "B", weight: null, visitedCount: 0, selectedCount: 0 }]);
  assert.deepEqual(initial.logs, ["Start DFS"]);
  assert.equal(visited.graph.nodes.find((node) => node.id === "B")?.visitedCount, 1);
  assert.equal(visited.graph.edges[0].visitedCount, 1);
  assert.deepEqual(visited.logs, ["Start DFS", "Visit B"]);
  assert.equal(focused.graph.nodes.find((node) => node.id === "B")?.selectedCount, 1);
  assert.deepEqual(focused.logs, ["Start DFS", "Visit B", "Focus B"]);

  focused.graph.nodes[0].x = 999;
  assert.equal(initial.graph.nodes[0].x, 100);
});

test("Imported DFS artifact is replayable by the Student Runtime", () => {
  assert.equal(algorithmVisualizerDfs.frames.length, 5);
  assert.equal(algorithmVisualizerDfs.frames[0].lineNumber, 11);
  assert.equal(algorithmVisualizerDfs.frames[2].graph?.nodes.find((node) => node.id === "C")?.visitedCount, 1);
  assert.equal(algorithmVisualizerDfs.frames[3].graph?.nodes.find((node) => node.id === "A")?.selectedCount, 1);
  assert.deepEqual(algorithmVisualizerDfs.frames.at(-1)?.logs, [
    "Start DFS at A",
    "Follow A -> B",
    "Follow B -> C",
    "Back edge reaches A",
    "DFS complete",
  ]);
});

test("Imported graph scenes preserve layout edits while restoring command state", () => {
  const frame = algorithmVisualizerDfs.frames[2];
  const graph = frame.graph;
  assert.ok(graph);
  const layout = {
    "node:A": { x: 180, y: 100, width: 84, height: 84 },
    "node:B": { x: 420, y: 100, width: 84, height: 84 },
    "node:C": { x: 300, y: 300, width: 84, height: 84 },
  };
  const canonical = createAlgorithmVisualizerGraphSkeletons(graph, layout);
  const moved = canonical.map((element) => element.id === "node:A" ? { ...element, x: 240, y: 160, width: 100 } : element);
  const recolored = canonical.map((element) => element.id === "node:A" ? { ...element, backgroundColor: "#ffffff" } : element);
  const nextLayout = captureAlgorithmVisualizerGraphLayout(moved, layout);

  assert.deepEqual(nextLayout["node:A"], { x: 240, y: 160, width: 100, height: 84 });
  assert.equal(isAlgorithmVisualizerGraphSceneSafe(moved, canonical), true);
  assert.equal(isAlgorithmVisualizerGraphSceneExact(moved, canonical), false);
  assert.equal(isAlgorithmVisualizerGraphSceneSafe(recolored, canonical), false);
});

test("Excalidraw selection resolves to the current logical graph object", () => {
  const graph = algorithmVisualizerDfs.frames[3].graph;
  assert.ok(graph);

  assert.deepEqual(projectAlgorithmVisualizerSelection(graph, { "node:A": true }), {
    elementId: "node:A",
    kind: "node",
    label: "A",
    detail: "visited 0 · selected 1",
  });
  assert.deepEqual(projectAlgorithmVisualizerSelection(graph, { "edge:A-B": true }), {
    elementId: "edge:A-B",
    kind: "edge",
    label: "A → B",
    detail: "visited 1 · selected 0",
  });
  assert.equal(projectAlgorithmVisualizerSelection(graph, { "node:missing": true }), null);
  assert.equal(projectAlgorithmVisualizerSelection(graph, {}), null);
});

test("Red-Black Tree artifact replays rotations, colors, and stable tree identities", () => {
  assert.equal(algorithmVisualizerRedBlackTree.frames.length, 14);

  const frames = algorithmVisualizerRedBlackTree.frames;
  assert.equal(frames[1].graph?.nodes.find((node) => node.id === 10)?.color, "black");
  assert.equal(frames[5].graph?.edges.some((edge) => edge.source === 20 && edge.target === 10), true);
  assert.equal(frames[9].graph?.nodes.find((node) => node.id === 27)?.selectedCount, 1);

  const finalGraph = frames.at(-1)?.graph;
  assert.ok(finalGraph);
  assert.deepEqual(
    finalGraph.nodes.map((node) => [node.id, node.color]),
    [[10, "black"], [20, "black"], [30, "red"], [15, "red"], [25, "red"], [27, "black"], [5, "red"]],
  );
  assert.deepEqual(
    finalGraph.edges.map((edge) => [edge.source, edge.target]),
    [[20, 10], [10, 15], [27, 25], [20, 27], [27, 30], [10, 5]],
  );

  const selected = projectAlgorithmVisualizerSelection(frames[9].graph, { "node:27": true });
  assert.deepEqual(selected, {
    elementId: "node:27",
    kind: "node",
    label: "27",
    detail: "red · visited 0 · selected 1",
  });

  const redNode = createAlgorithmVisualizerGraphSkeletons(finalGraph, {})
    .find((element) => element.id === "node:30");
  assert.equal(redNode.backgroundColor, "#762b39");
  assert.equal(redNode.customData.color, "red");
});
