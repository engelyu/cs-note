import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createLisFrames } from "../src/visualizations/lis.ts";

const expected = {
  artifactVersion: 1,
  packageId: "lis-dp",
  scenarioId: "classic-sequence",
  frames: createLisFrames(),
};
const artifactPath = new URL("../src/visualizations/lisArtifact.json", import.meta.url);
const actual = JSON.parse(await readFile(artifactPath, "utf8"));

assert.deepEqual(actual, expected, "LIS artifact is stale; run npm run generate:lis");
console.log(`Verified ${actual.frames.length} LIS frames against the authoring generator`);
