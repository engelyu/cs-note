import artifact from "./tarjanArtifact.json" with { type: "json" };
import type { ExecutionFrame, VisualizationPackage } from "../core/types";
import type { TarjanState } from "./tarjanModel";

const frames = artifact.frames as unknown as ExecutionFrame<TarjanState>[];

export const tarjanPackage: VisualizationPackage<TarjanState> = {
  id: artifact.packageId,
  title: "Tarjan's Strongly Connected Components",
  category: "Algorithms",
  schemaVersion: 1,
  views: [
    { id: "graph", label: "Graph", kind: "canvas" },
    { id: "variables", label: "Variables", kind: "panel" },
    { id: "call-stack", label: "Call Stack", kind: "panel" },
    { id: "concepts", label: "Concepts", kind: "panel" },
    { id: "timeline", label: "Timeline", kind: "panel" },
  ],
  scenarios: [
    {
      id: artifact.scenarioId,
      title: "The simplest cycle",
      description: "A compact graph that exposes tree edges, a back edge, and three SCCs.",
      frames,
    },
  ],
  capabilities: {
    toggleView: true,
    editLayout: true,
    editInput: false,
    rerun: false,
  },
};
