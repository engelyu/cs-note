import { writeFile } from "node:fs/promises";
import { createLisFrames } from "../src/visualizations/lis.ts";

const artifact = {
  artifactVersion: 1,
  packageId: "lis-dp",
  scenarioId: "classic-sequence",
  frames: createLisFrames(),
};

const artifactPath = new URL("../src/visualizations/lisArtifact.json", import.meta.url);
await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`Generated ${artifact.frames.length} LIS frames at ${artifactPath.pathname}`);
