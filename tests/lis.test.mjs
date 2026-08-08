import assert from "node:assert/strict";
import test from "node:test";
import { createLisFrames } from "../src/visualizations/lis.ts";
import { lisPackage, isValidLisArtifact } from "../src/visualizations/lisRuntime.ts";
import { LIS_LAYOUT } from "../src/visualizations/lisLayout.ts";
import { createLisSkeletons, captureLisLayout, isLisSceneExact, isLisSceneSafe } from "../src/visualizations/lisScene.ts";
import { projectLisConcepts, projectLisTimeline, projectLisVariables } from "../src/visualizations/lisProjections.ts";

test("LIS package exposes a replayable dynamic-programming scenario", () => {
  assert.equal(lisPackage.schemaVersion, 1);
  assert.deepEqual(lisPackage.views.map((view) => view.id), ["sequence", "variables", "concepts", "timeline"]);
  assert.equal(lisPackage.scenarios.length, 1);
  assert.equal(lisPackage.scenarios[0].capabilities.editInput, false);
  assert.equal(lisPackage.scenarios[0].frames.length, createLisFrames().length);
});

test("LIS frames expose comparisons, predecessor updates, and reconstruction", () => {
  const frames = createLisFrames();
  const finalState = frames.at(-1)?.state;

  assert.ok(finalState);
  assert.deepEqual(finalState.sequence, [0, 1, 3, 5, 7]);
  assert.deepEqual(finalState.sequence.map((index) => finalState.values[index]), [10, 22, 33, 50, 60]);
  assert.equal(finalState.sequence.length, 5);
  assert.ok(frames.some((frame) => frame.event.phase === "compare"));
  assert.ok(frames.some((frame) => frame.event.phase === "update"));
  assert.ok(frames.some((frame) => frame.event.phase === "reconstruct"));
  assert.ok(frames.some((frame) => frame.event.focus?.kind === "concept"));
});

test("LIS frames are independently snapshotted", () => {
  const frames = createLisFrames();
  const earlier = frames[1];
  const later = frames[2];

  earlier.state.values[0] = 999;
  earlier.state.dp[0] = 999;
  earlier.state.prev[1] = 7;

  assert.equal(later.state.values[0], 10);
  assert.equal(later.state.dp[0], 1);
  assert.equal(later.state.prev[1], null);
});

test("LIS Canvas layout remains separate from semantic state", () => {
  const frame = createLisFrames()[4];
  const canonical = createLisSkeletons(frame.state, LIS_LAYOUT);
  const moved = canonical.map((element) => element.id === "cell:0" ? { ...element, x: 180, y: 210, width: 120 } : element);
  const recolored = canonical.map((element) => element.id === "cell:0" ? { ...element, backgroundColor: "#ffffff" } : element);
  const nextLayout = captureLisLayout(moved, LIS_LAYOUT);

  assert.deepEqual(nextLayout["cell:0"], { x: 180, y: 210, width: 120, height: 70 });
  assert.equal(isLisSceneSafe(moved, canonical), true);
  assert.equal(isLisSceneExact(moved, canonical), false);
  assert.equal(isLisSceneSafe(recolored, canonical), false);
  assert.equal(frame.state.values[0], 10);
});

test("LIS projections derive from the current semantic frame", () => {
  const frames = createLisFrames();
  const updateFrame = frames.find((frame) => frame.event.phase === "update");
  assert.ok(updateFrame);

  const variables = projectLisVariables(updateFrame);
  const concepts = projectLisConcepts(updateFrame);
  const timeline = projectLisTimeline(frames, updateFrame.index);

  assert.equal(variables[updateFrame.state.currentIndex].focused, true);
  assert.equal(variables[updateFrame.state.currentIndex].dp, updateFrame.state.dp[updateFrame.state.currentIndex]);
  assert.equal(concepts.find((concept) => concept.id === "predecessor")?.active, true);
  assert.equal(timeline.find((entry) => entry.index === updateFrame.index)?.active, true);
});

test("LIS runtime validation rejects inconsistent arrays", () => {
  const validArtifact = {
    artifactVersion: 1,
    packageId: "lis-dp",
    scenarioId: "classic-sequence",
    frames: lisPackage.scenarios[0].frames,
  };
  assert.equal(isValidLisArtifact(validArtifact), true);

  const malformedArtifact = structuredClone(validArtifact);
  malformedArtifact.frames[1].state.dp = [1];
  assert.equal(isValidLisArtifact(malformedArtifact), false);
});
