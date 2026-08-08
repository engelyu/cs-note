import artifact from "./redBlackTreeArtifact.json" with { type: "json" };
import {
  importAlgorithmVisualizerCommands,
  replayAlgorithmVisualizerCommands,
  type AlgorithmVisualizerFrame,
} from "./trace.ts";

const commands = importAlgorithmVisualizerCommands(artifact);

export const algorithmVisualizerRedBlackTreeFrames: AlgorithmVisualizerFrame[] = replayAlgorithmVisualizerCommands(commands);

if (algorithmVisualizerRedBlackTreeFrames.length === 0 || algorithmVisualizerRedBlackTreeFrames.some((frame) => frame.graph === null)) {
  throw new Error("Algorithm Visualizer Red-Black Tree artifact must contain graph replay frames");
}

export const algorithmVisualizerRedBlackTree = {
  id: "algorithm-visualizer-red-black-tree",
  title: "Red-Black Tree",
  description: "An original Algor Note command trace based on the standard red-black insertion fix-up sequence.",
  frames: algorithmVisualizerRedBlackTreeFrames,
};
