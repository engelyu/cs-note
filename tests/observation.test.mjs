import assert from "node:assert/strict";
import test from "node:test";
import {
  mapObservationFrames,
  validateObservationFrames,
  validateSemanticModelCompatibility,
} from "../src/core/observation.ts";

const source = "examples/recursion.cpp";

const plan = {
  id: "recursion-observation",
  inputFields: ["node", "stack"],
  recordPoints: [
    { id: "dfs-entry", anchor: { kind: "function-entry", file: source, functionName: "dfs" } },
    { id: "return-a", anchor: { kind: "function-exit", file: source, functionName: "dfs", returnId: "return-a" } },
    { id: "return-b", anchor: { kind: "function-exit", file: source, functionName: "dfs", returnId: "return-b" } },
  ],
};

const frames = [
  {
    sequence: 0,
    recordPointId: "dfs-entry",
    anchor: plan.recordPoints[0].anchor,
    values: { node: "A", stack: ["A"] },
    context: { callStackId: "dfs#0", callDepth: 1, functionName: "dfs" },
  },
  {
    sequence: 1,
    recordPointId: "return-a",
    anchor: plan.recordPoints[1].anchor,
    values: { node: "A", stack: [] },
    context: { callStackId: "dfs#0", callDepth: 1, functionName: "dfs", hidden: "not an input" },
  },
];

test("Observation Frames follow actual Record Point hits and allow unhit points", () => {
  assert.doesNotThrow(() => validateObservationFrames(plan, frames));
  assert.equal(frames.some((frame) => frame.recordPointId === "return-b"), false);
});

test("Semantic Models receive only their declared inputs and context", () => {
  const model = {
    id: "recursion-model",
    input: { fields: ["node"], contextFields: ["callStackId"] },
    mapFrame: (frame) => ({
      node: frame.values.node,
      callStackId: frame.context.callStackId,
      stackWasPassedThrough: Object.hasOwn(frame.values, "stack"),
    }),
  };

  validateSemanticModelCompatibility(plan, model);
  assert.deepEqual(mapObservationFrames(plan, model, frames), [
    { node: "A", callStackId: "dfs#0", stackWasPassedThrough: false },
    { node: "A", callStackId: "dfs#0", stackWasPassedThrough: false },
  ]);
});

test("Semantic Model compatibility rejects fields the Observation Plan does not capture", () => {
  const model = {
    id: "invalid-model",
    input: { fields: ["missing"] },
    mapFrame: (frame) => frame.values,
  };

  assert.throws(
    () => validateSemanticModelCompatibility(plan, model),
    /requires uncaptured input fields: missing/,
  );
});

test("Observation validation rejects undeclared values and mismatched source anchors", () => {
  const undeclared = [{
    ...frames[0],
    values: { ...frames[0].values, extra: true },
  }];
  assert.throws(() => validateObservationFrames(plan, undeclared), /undeclared input field: extra/);

  const mismatched = [{
    ...frames[0],
    anchor: { kind: "line", file: source, line: 10 },
  }];
  assert.throws(() => validateObservationFrames(plan, mismatched), /anchor does not match Record Point/);
});
