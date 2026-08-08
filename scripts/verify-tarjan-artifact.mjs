import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createTarjanFrames } from "../src/visualizations/tarjan.ts";

const expected = {
  artifactVersion: 1,
  packageId: "tarjan-scc",
  scenarioId: "simple-cycle",
  frames: createTarjanFrames(),
};
const artifactPath = new URL("../src/visualizations/tarjanArtifact.json", import.meta.url);
const actual = JSON.parse(await readFile(artifactPath, "utf8"));

assert.deepEqual(actual, expected, "Tarjan artifact is stale; run npm run generate:tarjan");
console.log(`Verified ${actual.frames.length} Tarjan frames against the authoring generator`);
