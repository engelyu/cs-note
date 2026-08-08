import { writeFile } from "node:fs/promises";
import { createTarjanFrames } from "../src/visualizations/tarjan.ts";

const artifact = {
  artifactVersion: 1,
  packageId: "tarjan-scc",
  scenarioId: "simple-cycle",
  frames: createTarjanFrames(),
};

const artifactPath = new URL("../src/visualizations/tarjanArtifact.json", import.meta.url);
await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`Generated ${artifact.frames.length} Tarjan frames at ${artifactPath.pathname}`);
