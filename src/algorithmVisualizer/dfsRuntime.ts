import artifact from "./dfsArtifact.json" with { type: "json" };
import {
  importAlgorithmVisualizerCommands,
  replayAlgorithmVisualizerCommands,
  type AlgorithmVisualizerFrame,
} from "./trace.ts";

const commands = importAlgorithmVisualizerCommands(artifact);

export const algorithmVisualizerDfsFrames: AlgorithmVisualizerFrame[] = replayAlgorithmVisualizerCommands(commands);

if (algorithmVisualizerDfsFrames.length === 0 || algorithmVisualizerDfsFrames.some((frame) => frame.graph === null)) {
  throw new Error("Algorithm Visualizer DFS artifact must contain graph replay frames");
}

export const algorithmVisualizerDfs = {
  id: "algorithm-visualizer-dfs",
  title: "Depth-First Search",
  description: "An imported Algorithm Visualizer command trace rendered by the CS Note workbench.",
  frames: algorithmVisualizerDfsFrames,
};
